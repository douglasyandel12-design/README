require('dotenv').config();
const express = require('express');
const serverless = require('serverless-http');
const cookieSession = require('cookie-session');
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const mongoose = require('mongoose');

const app = express();

// Necesario para que Express confíe en el proxy de Netlify (HTTPS)
app.set('trust proxy', 1);

// --- CONFIGURACIÓN MONGODB ---
let isConnected = false;

const connectToDatabase = async () => {
  if (isConnected) {
    return;
  }

  if (!process.env.MONGODB_URI) {
    throw new Error('Falta la variable de entorno MONGODB_URI en el archivo .env o en Netlify');
  }

  try {
    // Añadimos timeout para que no se quede colgado si la IP no está autorizada
    await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 5000
    });
    isConnected = true;
    console.log('=> MongoDB conectado');
  } catch (error) {
    console.error('=> Error conectando a MongoDB:', error);
    // Pista para errores comunes de contraseña
    if (error.message.includes('bad auth') || error.code === 8000) {
      console.error('=> PISTA: Verifica que la contraseña en el .env sea correcta y no tenga los símbolos < >.');
    }
    throw new Error('Fallo de conexión a base de datos: ' + error.message);
  }
};

// Definimos el esquema del Producto
const ProductSchema = new mongoose.Schema({
  id: { type: Number, required: true }, // Mantenemos tu ID numérico
  name: String,
  price: Number,
  image: String, // Base64
  discount: Number
}, { strict: false }); // strict: false permite guardar campos nuevos sin cambiar el backend

// Evitamos re-compilar el modelo si la función se mantiene caliente
const Product = mongoose.models.Product || mongoose.model('Product', ProductSchema);

// Definimos el esquema del Pedido (Order)
const OrderSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true }, // El ID 'ORD-...' que ya generas
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
}, { timestamps: true }); // timestamps añade createdAt y updatedAt automáticamente
const Order = mongoose.models.Order || mongoose.model('Order', OrderSchema);

// Definimos esquema para Configuraciones Globales (ej. Promociones)
const SettingSchema = new mongoose.Schema({
  key: { type: String, required: true, unique: true },
  value: mongoose.Schema.Types.Mixed
}, { strict: false });
const Setting = mongoose.models.Setting || mongoose.model('Setting', SettingSchema);

// --- CONFIGURACIÓN DE SESIÓN ---
// Usamos cookie-session para persistencia en Serverless (Lambda)
app.use(cookieSession({
  name: 'session',
  keys: [process.env.SESSION_SECRET || 'un_secreto_por_defecto'],
  maxAge: 24 * 60 * 60 * 1000 // 24 horas
}));

// --- PARCHE PARA PASSPORT 0.6+ CON COOKIE-SESSION ---
// Passport ahora requiere estas funciones que cookie-session no trae.
app.use((req, res, next) => {
  if (req.session && !req.session.regenerate) {
    req.session.regenerate = (cb) => cb();
  }
  if (req.session && !req.session.save) {
    req.session.save = (cb) => cb();
  }
  next();
});

// --- CONFIGURACIÓN DE PASSPORT (AUTENTICACIÓN) ---
app.use(passport.initialize());
app.use(passport.session());

passport.serializeUser((user, done) => {
  done(null, user);
});

passport.deserializeUser((user, done) => {
  done(null, user);
});

passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: '/.netlify/functions/api/auth/google/callback' // URL de retorno
  },
  (accessToken, refreshToken, profile, done) => {
    // Aquí buscarías o crearías un usuario en tu base de datos real.
    // Por ahora, solo pasamos el perfil de Google.
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
// Aumentamos el límite a 10MB para permitir imágenes en Base64 más grandes
app.use(express.json({ limit: '10mb' }));

// Middleware de manejo de errores para payload demasiado grande
app.use((err, req, res, next) => {
  if (err.type === 'entity.too.large') {
    return res.status(413).json({ error: 'La imagen es demasiado pesada. Intenta reducir su tamaño (Máx 10MB).' });
  }
  next(err);
});

// --- RUTAS DE AUTENTICACIÓN ---
router.get('/auth/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

router.get('/auth/google/callback',
  passport.authenticate('google', { failureRedirect: '/login.html' }),
  (req, res) => {
    // Redirige al inicio después de un login exitoso
    res.redirect('/');
  }
);

// --- RUTA DE LOGIN (EMAIL/PASSWORD) ---
router.post('/auth/login', (req, res) => {
  const { email, password } = req.body;

  // Verificación del Administrador (Hardcoded por seguridad simple)
  if (email === 'admin@lvs-shop.com' && password === '0991412359') {
    const user = {
      id: 'admin',
      name: 'Administrador',
      email: email,
      isAdmin: true, // Marca especial para identificar al admin
      picture: null
    };

    // Guardamos la sesión usando Passport
    req.login(user, (err) => {
      if (err) return res.status(500).json({ message: 'Error de sesión' });
      return res.json({ message: 'Bienvenido Admin', user });
    });
  } else {
    res.status(401).json({ message: 'Credenciales incorrectas' });
  }
});

router.get('/auth/status', (req, res) => {
  // Devuelve el usuario si está logueado, o un objeto vacío si no.
  res.json({ user: req.user || null });
});

router.get('/auth/logout', (req, res) => {
  req.logout(() => {
    res.redirect('/');
  });
});

// --- RUTA DE REGISTRO LOCAL ---
router.post('/auth/register', (req, res) => {
  const { name, email, password } = req.body;

  // Validación básica en el servidor
  if (!name || !email || !password) {
    return res.status(400).json({ message: 'Todos los campos son requeridos.' });
  }

  // En una aplicación real, aquí harías lo siguiente:
  // 1. Validar que el email no exista ya en tu base de datos.
  // 2. Hashear (encriptar) la contraseña usando una librería como bcrypt.
  // 3. Guardar el nuevo usuario en la base de datos.
  console.log('Nuevo usuario para registrar (simulado):', { name, email });

  // Por ahora, como no tenemos base de datos, solo simulamos el éxito.
  res.status(201).json({ message: 'Usuario registrado con éxito.' });
});

// --- RUTAS DE PRODUCTOS (PARA QUE TODOS LOS VEAN) ---

// Obtener todos los productos
router.get('/products', async (req, res) => {
  try {
    await connectToDatabase();
    // Obtenemos todos los productos, excluyendo el _id interno de mongo si quieres limpiar la salida,
    // pero dejarlo no afecta a tu frontend.
    const products = await Product.find({});
    res.json(products);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al cargar productos', details: error.message });
  }
});

// Guardar TODOS los productos (Sobrescribir la lista)
router.post('/products', async (req, res) => {
  try {
    await connectToDatabase();
    const allProducts = req.body;

    // Estrategia: Borrar todo y volver a insertar (para mantener sincronía total con el frontend actual)
    // En una app más grande haríamos actualizaciones individuales, pero esto funciona perfecto para tu caso.
    await Product.deleteMany({});
    if (allProducts.length > 0) {
      await Product.insertMany(allProducts);
    }

    res.status(200).json({ message: 'Lista actualizada' });
  } catch (error) {
    console.error('Error guardando en MongoDB:', error);
    res.status(500).json({ error: 'Error al guardar', details: error.message });
  }
});

// --- RUTAS DE CONFIGURACIÓN (SETTINGS) ---
router.get('/settings', async (req, res) => {
  try {
    await connectToDatabase();
    const settings = await Setting.find({});
    // Convertimos array a objeto para fácil acceso { promo_login: true, ... }
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
    // Actualiza o crea la configuración (upsert)
    await Setting.findOneAndUpdate({ key }, { value }, { upsert: true, new: true });
    res.json({ message: 'Configuración guardada' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error guardando configuración' });
  }
});

// --- RUTA DE PEDIDOS ---
router.post('/orders', async (req, res) => {
  const orderData = req.body;
  console.log('Pedido recibido en el backend:', orderData);

  try {
    await connectToDatabase();
    
    // Guardar el pedido en la base de datos
    const newOrder = new Order(orderData);
    await newOrder.save();

    console.log(`=> Pedido ${orderData.id} guardado en la base de datos.`);

    // La lógica de Dropi (si se activa) iría aquí.

    // Respuesta de éxito
    res.status(200).json({ message: 'Pedido procesado y guardado correctamente.', orderId: orderData.id });

  } catch (error) {
    console.error('Error al guardar el pedido en la base de datos:', error);
    // Si el ID ya existe, podría dar un error de duplicado.
    if (error.code === 11000) {
      return res.status(409).json({ error: 'Conflicto: El ID del pedido ya existe.' });
    }
    res.status(500).json({ error: 'No se pudo guardar el pedido en el servidor.' });
  }
});

// Ruta para que el admin obtenga todos los pedidos
router.get('/orders', async (req, res) => {
  // TODO: Añadir autenticación para asegurar que solo un admin pueda acceder.
  try {
    await connectToDatabase();
    // Buscamos y ordenamos por fecha de creación descendente (los más nuevos primero)
    const orders = await Order.find({}).sort({ createdAt: -1 });
    res.json(orders);
  } catch (error) {
    console.error('Error al obtener los pedidos:', error);
    res.status(500).json({ error: 'Error al cargar los pedidos del servidor.' });
  }
});

app.use('/.netlify/functions/api', router);
module.exports.handler = serverless(app);