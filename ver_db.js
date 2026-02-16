require('dotenv').config();
const mongoose = require('mongoose');

const run = async () => {
  console.log('⏳ Intentando conectar a MongoDB...');

  if (!process.env.MONGODB_URI) {
    console.error('❌ ERROR: No encontré la variable MONGODB_URI en el archivo .env');
    return;
  }

  try {
    // Añadimos un timeout para que no se quede "colgado" si la IP no está autorizada.
    await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 5000 // 5 segundos de espera
    });
    console.log('✅ ¡Conexión Exitosa!');

    // Definimos un modelo temporal para leer los productos
    const Product = mongoose.model('Product', new mongoose.Schema({}, { strict: false }));
    
    const products = await Product.find({});
    
    console.log(`\n📦 Tienes ${products.length} productos en la nube:`);
    products.forEach(p => {
      console.log(` - ID: ${p.id} | ${p.name} | $${p.price}`);
    });

  } catch (error) {
    console.error('❌ Error de conexión:', error.message);

    // Damos pistas según el tipo de error
    if (error.message.includes('bad auth')) {
        console.error('\n💡 PISTA: El error "bad auth" casi siempre significa que la contraseña en tu archivo .env es incorrecta. Revísala.');
    } else if (error.name === 'MongoServerSelectionError') {
        console.error('\n💡 PISTA: Este error suele ocurrir porque tu IP actual no tiene permiso para conectar. Ve a MongoDB Atlas -> Network Access y agrega tu IP actual.');
    }
  } finally {
    await mongoose.disconnect();
    console.log('\n👋 Sesión cerrada.');
  }
};

run();