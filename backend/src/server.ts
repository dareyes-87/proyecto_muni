import express from 'express';
import cors from 'cors';
import { config } from './config/env';
import { errorHandler } from './middleware/errorHandler';
import { iniciarCronVencimiento } from './services/vencimiento.service';

// Routes
import authRoutes from './routes/auth.routes';
import usuariosRoutes from './routes/usuarios.routes';
import catalogosRoutes from './routes/catalogos.routes';
import inventarioRoutes from './routes/inventario.routes';
import dispensacionRoutes from './routes/dispensacion.routes';
import reportesRoutes from './routes/reportes.routes';
import auditoriaRoutes from './routes/auditoria.routes';

const app = express();

// Middleware global
app.use(cors());
app.use(express.json());

// Rutas
app.use('/api/auth', authRoutes);
app.use('/api/usuarios', usuariosRoutes);
app.use('/api/catalogos', catalogosRoutes);
app.use('/api/inventario', inventarioRoutes);
app.use('/api/dispensacion', dispensacionRoutes);
app.use('/api/reportes', reportesRoutes);
app.use('/api/auditoria', auditoriaRoutes);

// Health check
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: config.nodeEnv,
  });
});

// Error handler (debe ir después de las rutas)
app.use(errorHandler);

// Iniciar servidor
app.listen(config.port, () => {
  console.log(`\n🏥 FarmaRH API corriendo en puerto ${config.port}`);
  console.log(`📍 Entorno: ${config.nodeEnv}`);
  console.log(`🔗 http://localhost:${config.port}/api/health\n`);

  // Iniciar cron jobs
  iniciarCronVencimiento();
});
