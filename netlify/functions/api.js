require('dotenv').config();
const express = require('express');
const serverless = require('serverless-http');
const cookieSession = require('cookie-session');
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const axios = require('axios');

const app = express();

// Necesario para que Express confíe en el proxy de Netlify (HTTPS)
app.set('trust proxy', 1);

// --- CONFIGURACIÓN JSONBIN (Base de datos simple) ---
const JSONBIN_URL = `https://api.jsonbin.io/v3/b/${process.env.JSONBIN_ID}`;
const JSONBIN_HEADERS = {
  'X-Master-Key': process.env.JSONBIN_SECRET,
  'Content-Type': 'application/json'
};

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
app.use(express.json());

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
    // Leemos el archivo desde la nube
    const response = await axios.get(JSONBIN_URL + '/latest', { headers: JSONBIN_HEADERS });
    res.json(response.data.record);
  } catch (error) {
    res.status(500).json({ error: 'Error al cargar productos' });
  }
});

// Guardar TODOS los productos (Sobrescribir la lista)
router.post('/products', async (req, res) => {
  try {
    // Recibimos la lista completa de productos desde el admin y la guardamos en la nube
    const allProducts = req.body;
    await axios.put(JSONBIN_URL, allProducts, { headers: JSONBIN_HEADERS });
    res.status(200).json({ message: 'Lista actualizada' });
  } catch (error) {
    res.status(500).json({ error: 'Error al guardar el producto' });
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