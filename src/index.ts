import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import mongoose from 'mongoose';

// Importar rutas
import clientesRoutes from './routes/clientes-simple';
import cobrosRoutes from './routes/cobros';

// Configurar variables de entorno
dotenv.config();

console.log('Iniciando VBOX Sistema de Cobros Cloud...');

// Crear aplicación Express
const app = express();

// Conectar a MongoDB
const connectDB = async () => {
  try {
    console.log('Conectando a MongoDB Atlas...');
    await mongoose.connect(process.env.MONGODB_URI as string);
    console.log('✅ MongoDB Atlas conectado exitosamente');
  } catch (error) {
    console.error('❌ Error conectando a MongoDB:', error);
    process.exit(1);
  }
};

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Ruta principal
app.get('/', (req, res) => {
  res.json({
    message: 'VBOX Sistema de Cobros Cloud',
    version: '2.0.0',
    status: 'online',
    endpoints: {
      clientes: '/api/clientes',
      cobros: '/api/cobros',
      health: '/api/health'
    }
  });
});

// Endpoint de salud
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    uptime: process.uptime()
  });
});

// Rutas de la API
app.use('/api/clientes', clientesRoutes);
app.use('/api/cobros', cobrosRoutes);

// Puerto
const PORT = process.env.PORT || 5000;

// Iniciar servidor
const startServer = async () => {
  try {
    await connectDB();
    
    app.listen(PORT, () => {
      console.log('=======================================');
      console.log('    VBOX SISTEMA DE COBROS CLOUD');
      console.log('=======================================');
      console.log(`✅ Servidor corriendo en puerto ${PORT}`);
      console.log(`🌐 URL: http://localhost:${PORT}`);
      console.log('📋 Endpoints:');
      console.log('  • GET  /api/clientes');
      console.log('  • POST /api/clientes');
      console.log('  • GET  /api/cobros');
      console.log('  • POST /api/cobros');
      console.log('  • GET  /api/cobros/:id/pdf');
      console.log('=======================================');
    });
  } catch (error) {
    console.error('Error iniciando servidor:', error);
  }
};

startServer();