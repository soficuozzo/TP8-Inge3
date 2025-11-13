require('dotenv').config();             // <-- primero
const mongoose = require('mongoose');
const { app } = require('./app');
const PORT = process.env.PORT || 8080;




const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017';
const DB_NAME = process.env.DB_NAME || 'crudbasico';

mongoose.connect(MONGODB_URI, {
  // estos flags ya no son necesarios en Mongoose >=7, pero no rompen
  useNewUrlParser: true,
  useUnifiedTopology: true,
  dbName: DB_NAME,
})
.then(() => {
  console.log(`✅ Conectado a MongoDB. DB: ${DB_NAME}`);
  app.listen(PORT, () => console.log(`🚀 http://localhost:${PORT}`));
})
.catch(err => {
  console.error('❌ Error conectando a MongoDB:', err);
  process.exit(1);
});
