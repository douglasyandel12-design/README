require('dotenv').config();
const express = require('express');
const cookieSession = require('cookie-session');
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const mongoose = require('mongoose');
const crypto = require('crypto'); // Para encriptar contraseñas
const nodemailer = require('nodemailer'); // Para enviar correos

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
      serverSelectionTimeoutMS: 10000 // Aumentamos timeout para evitar falsos positivos en Vercel
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
  items: [{
    id: mongoose.Schema.Types.Mixed, // Puede ser String o Number según tu lógica actual
    name: String,
    price: Number,
    quantity: Number,
    image: String
  }],
  total: Number
}, { timestamps: true });
const Order = mongoose.models.Order || mongoose.model('Order', OrderSchema);

const UserSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  name: String,
  hash: String, // Contraseña encriptada
  salt: String, // Llave de encriptación única por usuario
  isAdmin: { type: Boolean, default: false },
  picture: String,
  isVerified: { type: Boolean, default: false },
  verificationCode: String
}, { timestamps: true });
const User = mongoose.models.User || mongoose.model('User', UserSchema);

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

// --- CONFIGURACIÓN DE CORREO (NODEMAILER) ---
// Usaremos variables de entorno para seguridad.
// Si usas Gmail, necesitas generar una "Contraseña de Aplicación" en tu cuenta de Google.
const transporter = nodemailer.createTransport({
  service: 'gmail', // Puedes cambiar esto por tu proveedor SMTP si prefieres
  auth: {
    user: process.env.EMAIL_USER, // Tu correo (ej: ventas@lvs-shop.com)
    pass: process.env.EMAIL_PASS  // Tu contraseña de aplicación
  }
});

const sendVerificationEmail = async (email, code, name) => {
  const mailOptions = {
    from: '"LVS Shop Oficial" <' + process.env.EMAIL_USER + '>',
    to: email,
    subject: '🔐 Código de Verificación - LVS Shop',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
        <h2 style="color: #000; text-align: center;">Bienvenido a LVS Shop</h2>
        <p>Hola <strong>${name}</strong>,</p>
        <p>Gracias por registrarte. Para activar tu cuenta y asegurar que este correo es tuyo, por favor ingresa el siguiente código:</p>
        <div style="background-color: #f4f4f4; padding: 15px; text-align: center; font-size: 24px; letter-spacing: 5px; font-weight: bold; border-radius: 5px; margin: 20px 0;">
          ${code}
        </div>
        <p style="color: #666; font-size: 12px; text-align: center;">Si no solicitaste este código, ignora este mensaje.</p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
        <p style="text-align: center; color: #999; font-size: 11px;">&copy; ${new Date().getFullYear()} LVS Shop Oficial. Todos los derechos reservados.</p>
      </div>
    `
  };
  await transporter.sendMail(mailOptions);
};

const router = express.Router();

// Aumentamos el límite del body-parser. Vercel tiene un límite estricto de ~4.5MB.
// Este límite se aplica en el servidor de Express, pero Vercel puede bloquear la solicitud antes si es muy grande.
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// Middleware para proteger rutas que requieren autenticación
const isAuthenticated = (req, res, next) => {
  if (req.user) {
    return next();
  }
  res.status(401).json({ error: 'No autenticado. Por favor, inicie sesión.' });
};

const isAdmin = (req, res, next) => {
  if (req.user && req.user.isAdmin) {
    return next();
  }
  res.status(403).json({ error: 'Acceso denegado. Se requieren permisos de administrador.' });
};

// --- RUTAS ---
// Ruta de prueba para verificar que la API está online
router.get('/', (req, res) => res.send('API Online y funcionando 🚀'));

router.get('/auth/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

router.get('/auth/google/callback',
  passport.authenticate('google', { failureRedirect: '/login.html' }),
  (req, res) => res.redirect('/')
);

router.post('/auth/login', async (req, res) => {
  const { email, password } = req.body;
  
  try {
    await connectToDatabase();

    // 1. Buscar en Base de Datos (Sistema Seguro)
    const dbUser = await User.findOne({ email });
    
    if (dbUser) {
      // VERIFICACIÓN: Si el usuario existe pero no está verificado, impedir login
      if (dbUser.isVerified === false) {
         return res.status(401).json({ error: 'Cuenta no verificada. Revisa tu correo o regístrate de nuevo para obtener un código nuevo.' });
      }

      // Verificar contraseña encriptada
      const hashVerify = crypto.pbkdf2Sync(password, dbUser.salt, 1000, 64, 'sha512').toString('hex');
      if (hashVerify === dbUser.hash) {
        const userPayload = { 
          id: dbUser._id, 
          name: dbUser.name, 
          email: dbUser.email, 
          isAdmin: dbUser.isAdmin, 
          picture: dbUser.picture 
        };
        return req.login(userPayload, (err) => {
          if (err) return res.status(500).json({ message: 'Error de sesión' });
          return res.json({ message: 'Bienvenido ' + dbUser.name, user: userPayload });
        });
      }
    }

    // 2. Credenciales de Administrador (Fijas o por Variables de Entorno)
    const adminEmail = process.env.ADMIN_EMAIL;
    const adminPass = process.env.ADMIN_PASSWORD;

    if (adminEmail && adminPass && email === adminEmail && password === adminPass) {
      const user = { id: 'admin', name: 'Administrador Principal', email, isAdmin: true, picture: null };
      return req.login(user, (err) => {
        if (err) return res.status(500).json({ message: 'Error de sesión' });
        return res.json({ message: 'Bienvenido Admin', user });
      });
    }

    // Si falla todo
    res.status(401).json({ message: 'Credenciales incorrectas' });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error en el servidor' });
  }
});

// RUTA PARA CREAR ADMINISTRADORES (Usar una vez y luego proteger)
router.post('/auth/create-admin', async (req, res) => {
  try {
    await connectToDatabase();
    const { email, password, name, secretKey } = req.body;

    // Protección: Requiere una clave secreta para evitar que cualquiera cree admins
    // Configura SETUP_SECRET en Vercel, o usa esta clave temporal por defecto
    const setupSecret = process.env.SETUP_SECRET || 'clave-temporal-segura';
    
    if (secretKey !== setupSecret) {
      return res.status(403).json({ error: 'Clave secreta incorrecta (secretKey).' });
    }

    // Encriptar contraseña
    const salt = crypto.randomBytes(16).toString('hex');
    const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');

    const newUser = new User({
      email,
      name: name || 'Admin',
      hash,
      salt,
      isAdmin: true,
      picture: null
    });

    await newUser.save();
    res.json({ message: 'Administrador creado con éxito en la base de datos.' });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/auth/status', (req, res) => res.json({ user: req.user || null }));

router.get('/auth/logout', (req, res) => {
  req.logout(() => res.redirect('/'));
});

router.post('/auth/register', async (req, res) => {
  try {
    await connectToDatabase();
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Por favor complete todos los campos.' });
    }

    // 1. Verificar si el usuario ya existe
    const existingUser = await User.findOne({ email });
    
    // Si existe y YA está verificado, error.
    if (existingUser && existingUser.isVerified !== false) {
      return res.status(400).json({ message: 'Este correo electrónico ya está registrado.' });
    }

    // Generar código de 6 dígitos
    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();

    // 2. Encriptar la contraseña (Igual que como lo hacemos con el admin)
    const salt = crypto.randomBytes(16).toString('hex');
    const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');

    if (existingUser && existingUser.isVerified === false) {
        // Si existe pero NO está verificado, actualizamos sus datos y reenviamos código
        existingUser.name = name;
        existingUser.hash = hash;
        existingUser.salt = salt;
        existingUser.verificationCode = verificationCode;
        await existingUser.save();
    } else {
        // 3. Crear el usuario nuevo (NO verificado)
        const newUser = new User({
          email,
          name,
          hash,
          salt,
          isAdmin: false,
          isVerified: false, // Importante: Falso al inicio
          verificationCode: verificationCode,
          picture: `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random`
        });
        await newUser.save();
    }

    // 4. Enviar correo (Intentar enviar, si falla avisar pero no romper todo el flujo si es posible)
    try {
        if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
            await sendVerificationEmail(email, verificationCode, name);
            res.status(200).json({ 
                message: 'Código enviado', 
                requiresVerification: true, 
                email: email 
            });
        } else {
            console.warn('EMAIL_USER o EMAIL_PASS no configurados. Código:', verificationCode);
            // Para desarrollo local sin email configurado, devolvemos el código en consola del server
            res.status(200).json({ 
                message: 'Sistema de correo no configurado (Check Server Logs)', 
                requiresVerification: true, 
                email: email,
                devCode: verificationCode // SOLO PARA DEBUG, QUITAR EN PRODUCCIÓN
            });
        }
    } catch (emailError) {
        console.error('Error enviando correo:', emailError);
        res.status(500).json({ message: 'Error al enviar el correo de verificación.' });
    }

  } catch (error) {
    console.error('Error registrando usuario:', error);
    res.status(500).json({ message: 'Error interno al crear la cuenta.' });
  }
});

// RUTA NUEVA: Verificar Código
router.post('/auth/verify', async (req, res) => {
    try {
        await connectToDatabase();
        const { email, code } = req.body;

        const user = await User.findOne({ email });
        
        if (!user) return res.status(400).json({ message: 'Usuario no encontrado.' });
        if (user.isVerified) return res.status(200).json({ message: 'Usuario ya verificado anteriormente.' });

        if (user.verificationCode === code) {
            user.isVerified = true;
            user.verificationCode = null; // Limpiar código
            await user.save();

            // Iniciar sesión automáticamente
            const userPayload = { id: user._id, name: user.name, email: user.email, isAdmin: user.isAdmin, picture: user.picture };
            req.login(userPayload, (err) => {
                if (err) return res.status(500).json({ message: 'Verificado, pero error al iniciar sesión.' });
                return res.json({ message: '¡Cuenta verificada con éxito!', user: userPayload });
            });
        } else {
            res.status(400).json({ message: 'Código incorrecto.' });
        }
    } catch (error) {
        res.status(500).json({ message: 'Error en verificación.' });
    }
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

// CREATE a new product
router.post('/products', isAuthenticated, isAdmin, async (req, res) => {
  try {
    await connectToDatabase();
    const newProduct = new Product(req.body);
    await newProduct.save();
    res.status(201).json(newProduct);
  } catch (error) {
    res.status(500).json({ message: 'Error al crear el producto', error });
  }
});

// UPDATE a product by ID
router.put('/products/:id', isAuthenticated, isAdmin, async (req, res) => {
  try {
    await connectToDatabase();
    const updatedProduct = await Product.findOneAndUpdate(
      { id: req.params.id },
      req.body,
      { new: true, runValidators: true }
    );
    if (!updatedProduct) {
      return res.status(404).json({ message: 'Producto no encontrado' });
    }
    res.json(updatedProduct);
  } catch (error) {
    res.status(500).json({ message: 'Error al actualizar el producto', error });
  }
});

// DELETE a product by ID
router.delete('/products/:id', isAuthenticated, isAdmin, async (req, res) => {
  try {
    await connectToDatabase();
    const deletedProduct = await Product.findOneAndDelete({ id: req.params.id });
    if (!deletedProduct) {
      return res.status(404).json({ message: 'Producto no encontrado' });
    }
    res.json({ message: 'Producto eliminado' });
  } catch (error) {
    res.status(500).json({ message: 'Error al eliminar el producto', error });
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

router.post('/settings', isAuthenticated, isAdmin, async (req, res) => {
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
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
        await connectToDatabase();
        const { customer, items } = req.body;

        // 1. Validar datos de entrada
        if (!customer || !items || !Array.isArray(items) || items.length === 0) {
            return res.status(400).json({ message: 'Faltan datos del cliente o productos en el pedido.' });
        }

        const productIds = items.map(item => item.id);
        const productsInDB = await Product.find({ 'id': { $in: productIds } }).session(session);
        
        // Obtener configuración de promociones para calcular el precio exacto
        const settingsDB = await Setting.find({}).session(session);
        const settings = {};
        settingsDB.forEach(s => settings[s.key] = s.value);
        
        const isProgressivePromoActive = settings.promo_progressive_active === true && (req.user || settings.promo_progressive_public === true);
        const isMemberPromoActive = settings.promo_login_5 === true && req.user; // req.user existe si hay sesión válida

        let serverTotal = 0;
        const stockUpdates = [];

        for (const item of items) {
            // Asegurar comparación robusta de ID (String vs Number)
            const product = productsInDB.find(p => String(p.id) === String(item.id));
            if (!product) {
                throw new Error(`El producto "${item.name}" ya no está disponible.`);
            }

            // 2. Validar stock en el servidor
            if (product.stock !== null && product.stock !== undefined && product.stock < item.quantity) {
                throw new Error(`Stock insuficiente para ${product.name}. Disponible: ${product.stock}, Pedido: ${item.quantity}.`);
            }

            // 3. Calcular el total de forma segura en el servidor
            let price = product.price;

            // Lógica de Descuento Primario (Progresivo o Porcentaje)
            if (isProgressivePromoActive) {
                let discount = 0;
                if (item.quantity >= 2) discount = Math.min(item.quantity, 5);
                price = Math.max(0, price - discount);
            } else if (product.discount && product.discount > 0) {
                price = price * (1 - product.discount / 100);
            }

            // Lógica de Descuento Socio
            if (isMemberPromoActive) price = price * 0.95;

            serverTotal += price * item.quantity;

            // 4. Preparar la actualización de stock
            if (product.stock !== null && product.stock !== undefined && product.stock !== "") {
                stockUpdates.push({
                    updateOne: {
                        filter: { id: product.id },
                        update: { $inc: { stock: -item.quantity } }
                    }
                });
            }
        }

        // 5. Crear y guardar el nuevo pedido
        const newOrder = new Order({
            id: 'ORD-' + Math.floor(100000 + Math.random() * 900000), // NOTA: Es mejor usar una librería como `nanoid` para IDs únicos.
            status: 'En progreso',
            date: new Date().toISOString(), // Usar formato estándar
            customer,
            items,
            total: serverTotal // Usar el total calculado en el servidor
        });
        await newOrder.save({ session });

        // 6. Ejecutar las actualizaciones de stock
        if (stockUpdates.length > 0) {
            await Product.bulkWrite(stockUpdates, { session });
        }

        await session.commitTransaction();
        res.status(201).json({ message: 'Pedido guardado.', order: newOrder }); // Devolver el pedido completo

    } catch (error) {
        await session.abortTransaction();
        console.error('Error procesando el pedido:', error);
        res.status(400).json({ message: error.message || 'Error al guardar el pedido.' });
    } finally {
        session.endSession();
    }
});

// GET all orders - PROTEGIDO SOLO PARA ADMIN
router.get('/orders', isAuthenticated, isAdmin, async (req, res) => {
  try {
    await connectToDatabase();
    const orders = await Order.find({}).sort({ createdAt: -1 });
    res.json(orders);
  } catch (error) {
    res.status(500).json({ error: 'Error al cargar pedidos.' });
  }
});

// GET single order by ID (Para rastreo público)
router.get('/orders/:id', async (req, res) => {
  try {
    await connectToDatabase();
    // Buscamos por el ID de string personalizado (ej: ORD-123456)
    const order = await Order.findOne({ id: req.params.id });
    if (!order) {
      return res.status(404).json({ error: 'Pedido no encontrado' });
    }
    res.json(order);
  } catch (error) {
    res.status(500).json({ error: 'Error al buscar el pedido.' });
  }
});

// GET current user's orders (Protected)
router.get('/my-orders', isAuthenticated, async (req, res) => {
  try {
    await connectToDatabase();
    const userEmail = req.user.email;
    const orders = await Order.find({ 'customer.email': userEmail }).sort({ createdAt: -1 });
    res.json(orders);
  } catch (error) {
    res.status(500).json({ error: 'Error al cargar mis pedidos.' });
  }
});

// Actualizar estado del pedido
router.patch('/orders/:id', isAuthenticated, isAdmin, async (req, res) => {
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
router.delete('/orders/:id', isAuthenticated, isAdmin, async (req, res) => {
  try {
    await connectToDatabase();
    await Order.findOneAndDelete({ id: req.params.id });
    res.json({ message: 'Pedido eliminado' });
  } catch (error) {
    res.status(500).json({ error: 'Error eliminando pedido' });
  }
});

// --- CONFIGURACIÓN DE RUTAS CRÍTICA PARA VERCEL ---
// Esto permite que la API funcione tanto si Vercel envía la ruta completa (/api/products)
// como si envía la ruta relativa (/products). Evita errores 404 en producción.
app.use('/api', router);
app.use('/', router); // Fallback de seguridad

module.exports = app;