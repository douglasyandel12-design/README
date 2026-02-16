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

// --- RUTA DE PEDIDOS (CON API DE DROPI) ---
router.post('/orders', async (req, res) => {
  const orderData = req.body;
  console.log('Pedido recibido en el backend:', orderData);

  // --- LÓGICA PARA LLAMAR A LA API DE DROPI ---
  // NOTA: Se comenta la llamada real para evitar errores 500 hasta tener las credenciales correctas.
  /*
  try {
    console.log('Enviando pedido a Dropi...');
    const dropiApiUrl = 'https://api.dropi.co/v1/orders';
    const response = await axios.post(dropiApiUrl, 
      {
        customer_name: orderData.customer.name,
        customer_email: orderData.customer.email,
        items: orderData.items,
      }, 
      {
        headers: {
          'Authorization': `Bearer ${process.env.DROPI_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );
    console.log('Respuesta de Dropi:', response.data);
  } catch (error) {
    console.error('Error al contactar con la API de Dropi:', error.message);
  }
  */

  // Respuesta de éxito (Simulación)
  res.status(200).json({ message: 'Pedido procesado correctamente.' });
});

app.use('/.netlify/functions/api', router);
module.exports.handler = serverless(app);