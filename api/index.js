require('dotenv').config();
const express = require('express');
const cookieSession = require('cookie-session');
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const mongoose = require('mongoose');

const app = express();

// Necesario para que Express confíe en el proxy de Vercel
app.set('trust proxy', 1);

// --- CONFIGURACIÓN MONGODB ---
let isConnected = false;

const connectToDatabase = async () => {
  if (isConnected) return;

  if (!process.env.MONGODB_URI) {
    throw new Error('Falta la variable de entorno MONGODB_URI');
  }

  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 5000
    });
    isConnected = true;
    console.log('=> MongoDB conectado');
  } catch (error) {
    console.error('=> Error conectando a MongoDB:', error);
    throw new Error('Fallo de conexión a base de datos');
  }
};

// --- MODELOS ---
const ProductSchema = new mongoose.Schema({
  id: { type: Number, required: true },
  name: String,
  price: Number,
  image: String,
  discount: Number
}, { strict: false });
const Product = mongoose.models.Product || mongoose.model('Product', ProductSchema);

const OrderSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  status: String,
  date: String,
  customer: {
    name: String,
    email: String,
    phone: String,
    address: String,
    payment: String
  },
  items: Array,
  total: Number
}, { timestamps: true });
const Order = mongoose.models.Order || mongoose.model('Order', OrderSchema);

const SettingSchema = new mongoose.Schema({
  key: { type: String, required: true, unique: true },
  value: mongoose.Schema.Types.Mixed
}, { strict: false });
const Setting = mongoose.models.Setting || mongoose.model('Setting', SettingSchema);

// --- MIDDLEWARES ---
app.use(cookieSession({
  name: 'session',
  keys: [process.env.SESSION_SECRET || 'un_secreto_por_defecto'],
  maxAge: 24 * 60 * 60 * 1000
}));

app.use((req, res, next) => {
  if (req.session && !req.session.regenerate) req.session.regenerate = (cb) => cb();
  if (req.session && !req.session.save) req.session.save = (cb) => cb();
  next();
});

app.use(passport.initialize());
app.use(passport.session());

passport.serializeUser((user, done) => done(null, user));
passport.deserializeUser((user, done) => done(null, user));

passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: '/api/auth/google/callback'
  },
  (accessToken, refreshToken, profile, done) => {
    const user = {
      id: profile.id,
      name: profile.displayName,
      email: profile.emails[0].value,
      picture: profile.photos[0].value
    };
    return done(null, user);
  }
));

const router = express.Router();
app.use(express.json({ limit: '10mb' }));

// --- RUTAS ---
// Ruta de prueba para verificar que la API está online
router.get('/', (req, res) => res.send('API Online y funcionando 🚀'));

router.get('/auth/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

router.get('/auth/google/callback',
  passport.authenticate('google', { failureRedirect: '/login.html' }),
  (req, res) => res.redirect('/')
);

router.post('/auth/login', (req, res) => {
  const { email, password } = req.body;
  if (email === 'admin@lvs-shop.com' && password === '0991412359') {
    const user = { id: 'admin', name: 'Administrador', email, isAdmin: true, picture: null };
    req.login(user, (err) => {
      if (err) return res.status(500).json({ message: 'Error de sesión' });
      return res.json({ message: 'Bienvenido Admin', user });
    });
  } else {
    res.status(401).json({ message: 'Credenciales incorrectas' });
  }
});

router.get('/auth/status', (req, res) => res.json({ user: req.user || null }));

router.get('/auth/logout', (req, res) => {
  req.logout(() => res.redirect('/'));
});

router.post('/auth/register', (req, res) => {
  res.status(201).json({ message: 'Usuario registrado con éxito (Simulado).' });
});

router.get('/products', async (req, res) => {
  try {
    await connectToDatabase();
    const products = await Product.find({});
    res.json(products);
  } catch (error) {
    res.status(500).json({ error: 'Error al cargar productos' });
  }
});

router.post('/products', async (req, res) => {
  try {
    await connectToDatabase();
    await Product.deleteMany({});
    if (req.body.length > 0) await Product.insertMany(req.body);
    res.status(200).json({ message: 'Lista actualizada' });
  } catch (error) {
    res.status(500).json({ error: 'Error al guardar' });
  }
});

router.get('/settings', async (req, res) => {
  try {
    await connectToDatabase();
    const settings = await Setting.find({});
    const settingsObj = {};
    settings.forEach(s => settingsObj[s.key] = s.value);
    res.json(settingsObj);
  } catch (error) {
    res.status(500).json({ error: 'Error cargando configuraciones' });
  }
});

router.post('/settings', async (req, res) => {
  try {
    await connectToDatabase();
    const { key, value } = req.body;
    await Setting.findOneAndUpdate({ key }, { value }, { upsert: true, new: true });
    res.json({ message: 'Configuración guardada' });
  } catch (error) {
    res.status(500).json({ error: 'Error guardando configuración' });
  }
});

router.post('/orders', async (req, res) => {
  try {
    await connectToDatabase();
    const newOrder = new Order(req.body);
    await newOrder.save();
    res.status(200).json({ message: 'Pedido guardado.', orderId: req.body.id });
  } catch (error) {
    if (error.code === 11000) return res.status(409).json({ error: 'ID duplicado.' });
    res.status(500).json({ error: 'Error al guardar pedido.' });
  }
});

router.get('/orders', async (req, res) => {
  try {
    await connectToDatabase();
    const orders = await Order.find({}).sort({ createdAt: -1 });
    res.json(orders);
  } catch (error) {
    res.status(500).json({ error: 'Error al cargar pedidos.' });
  }
});

// Actualizar estado del pedido
router.patch('/orders/:id', async (req, res) => {
  try {
    await connectToDatabase();
    const { status } = req.body;
    await Order.findOneAndUpdate({ id: req.params.id }, { status });
    res.json({ message: 'Estado actualizado' });
  } catch (error) {
    res.status(500).json({ error: 'Error actualizando pedido' });
  }
});

// Eliminar pedido
router.delete('/orders/:id', async (req, res) => {
  try {
    await connectToDatabase();
    await Order.findOneAndDelete({ id: req.params.id });
    res.json({ message: 'Pedido eliminado' });
  } catch (error) {
    res.status(500).json({ error: 'Error eliminando pedido' });
  }
});

app.use('/api', router);
module.exports = app;