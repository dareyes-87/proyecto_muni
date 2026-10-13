import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import path from 'path';
import { config } from './config/env';
import { errorHandler } from './middleware/errorHandler';
import { iniciarCronVencimiento } from './services/vencimiento.service';

// Routes
import authRoutes from './routes/auth.routes';
import usuariosRoutes from './routes/usuarios.routes';
import catalogosRoutes from './routes/catalogos.routes';
import inventarioRoutes from './routes/inventario.routes';
import dispensacionRoutes from './routes/dispensacion.routes';
import capturaRoutes from './routes/captura.routes';
import reportesRoutes from './routes/reportes.routes';
import auditoriaRoutes from './routes/auditoria.routes';

const app = express();

// La API solo es accesible a través del proxy (nginx/vite), así que se confía en
// el primer salto para que req.ip sea la IP real del cliente, no la del proxy (H-18).
app.set('trust proxy', 1);

// Cabeceras de seguridad y ocultar la tecnología del servidor (H-17).
app.disable('x-powered-by');
app.use(helmet());

// CORS restringido (H-17). En producción solo se permiten los orígenes de
// CORS_ORIGIN (lista separada por comas); si no se define, se desactiva el acceso
// cross-origin (la operación normal es mismo-origen a través del proxy). En
// desarrollo se refleja cualquier origen por comodidad.
const corsOrigins = (process.env.CORS_ORIGIN || '')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);
app.use(
  cors({
    origin: corsOrigins.length > 0 ? corsOrigins : config.nodeEnv === 'production' ? false : true,
  })
);

app.use(express.json());
// Solo se sirven estáticamente las imágenes de producto (medicamentos), que no
// son datos sensibles. Las fotos de dispensación (recetas/evidencia) se sirven
// exclusivamente por el endpoint autenticado /api/dispensacion/:id/foto/:tipo (H-11).
app.use('/uploads/medicamentos', express.static(path.join(__dirname, '..', 'uploads', 'medicamentos')));

// Rutas
app.use('/api/auth', authRoutes);
app.use('/api/usuarios', usuariosRoutes);
app.use('/api/catalogos', catalogosRoutes);
app.use('/api/inventario', inventarioRoutes);
app.use('/api/dispensacion', dispensacionRoutes);
// Público a propósito (captura de evidencia desde el celular vía QR) — ver captura.routes.ts
app.use('/api/captura', capturaRoutes);
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

// Ruta no encontrada: responde JSON (no el HTML por defecto de Express) (H-12).
app.use((_req, res) => {
  res.status(404).json({ error: 'Ruta no encontrada' });
});

// Error handler (debe ir después de las rutas)
app.use(errorHandler);

// Iniciar servidor
app.listen(config.port, () => {
  console.log(`\n🏥 FarmaG API corriendo en puerto ${config.port}`);
  console.log(`📍 Entorno: ${config.nodeEnv}`);
  console.log(`🔗 http://localhost:${config.port}/api/health\n`);

  // Iniciar cron jobs
  iniciarCronVencimiento();
});
