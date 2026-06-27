import { PrismaClient, Rol, TipoProveedor } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Iniciando seed de la base de datos...');

  // ============================================
  // Usuario Administrador
  // ============================================
  const adminExists = await prisma.usuario.findUnique({
    where: { username: 'admin' },
  });

  if (!adminExists) {
    const hashedPassword = await bcrypt.hash('admin2026', 12);
    await prisma.usuario.create({
      data: {
        username: 'admin',
        email: 'admin@farmarh.local',
        passwordHash: hashedPassword,
        nombreCompleto: 'Administrador del Sistema',
        rol: Rol.ADMIN,
      },
    });
    console.log('✅ Usuario admin creado (usuario: admin, contraseña: admin2026)');
  } else {
    console.log('ℹ️  Usuario admin ya existe, omitiendo...');
  }

  // ============================================
  // Categorías terapéuticas
  // ============================================
  const categorias = [
    { nombre: 'Analgésico', descripcion: 'Medicamentos para el dolor' },
    { nombre: 'Antibiótico', descripcion: 'Medicamentos contra infecciones bacterianas' },
    { nombre: 'Antihipertensivo', descripcion: 'Medicamentos para la presión arterial' },
    { nombre: 'Antidiabético', descripcion: 'Medicamentos para el control de la diabetes' },
    { nombre: 'Antiinflamatorio', descripcion: 'Medicamentos para la inflamación' },
    { nombre: 'Antihistamínico', descripcion: 'Medicamentos para alergias' },
    { nombre: 'Antipirético', descripcion: 'Medicamentos para la fiebre' },
    { nombre: 'Vitamina/Suplemento', descripcion: 'Vitaminas y suplementos alimenticios' },
    { nombre: 'Gastrointestinal', descripcion: 'Medicamentos para el sistema digestivo' },
    { nombre: 'Dermatológico', descripcion: 'Medicamentos para la piel' },
    { nombre: 'Respiratorio', descripcion: 'Medicamentos para el sistema respiratorio' },
    { nombre: 'Oftálmico', descripcion: 'Medicamentos para los ojos' },
    { nombre: 'Otro', descripcion: 'Otros medicamentos no clasificados' },
  ];

  for (const cat of categorias) {
    await prisma.categoria.upsert({
      where: { nombre: cat.nombre },
      update: {},
      create: cat,
    });
  }
  console.log(`✅ ${categorias.length} categorías creadas/verificadas`);

  // ============================================
  // Ubicaciones (estantes)
  // ============================================
  const ubicaciones = [
    { codigo: 'A', descripcion: 'Estante A' },
    { codigo: 'B', descripcion: 'Estante B' },
    { codigo: 'C', descripcion: 'Estante C' },
    { codigo: 'D', descripcion: 'Estante D' },
    { codigo: 'E', descripcion: 'Estante E' },
    { codigo: 'F', descripcion: 'Estante F' },
    { codigo: 'BOD', descripcion: 'Bodega' },
  ];

  for (const ub of ubicaciones) {
    await prisma.ubicacion.upsert({
      where: { codigo: ub.codigo },
      update: {},
      create: ub,
    });
  }
  console.log(`✅ ${ubicaciones.length} ubicaciones creadas/verificadas`);

  // ============================================
  // Configuración del sistema
  // ============================================
  const configs = [
    {
      clave: 'ALERTA_VENCIMIENTO_ROJO',
      valor: '30',
      descripcion: 'Días para alerta roja de vencimiento',
    },
    {
      clave: 'ALERTA_VENCIMIENTO_AMARILLO',
      valor: '90',
      descripcion: 'Días para alerta amarilla de vencimiento',
    },
    {
      clave: 'NOMBRE_FARMACIA',
      valor: 'Farmacia Municipal de Gualán',
      descripcion: 'Nombre de la farmacia para reportes',
    },
  ];

  for (const config of configs) {
    await prisma.configuracionSistema.upsert({
      where: { clave: config.clave },
      update: {},
      create: config,
    });
  }
  console.log(`✅ ${configs.length} configuraciones creadas/verificadas`);

  // ============================================
  // Proveedor de ejemplo
  // ============================================
  const proveedorExists = await prisma.proveedor.findFirst({
    where: { nombre: 'Donaciones Generales' },
  });

  if (!proveedorExists) {
    await prisma.proveedor.create({
      data: {
        nombre: 'Donaciones Generales',
        tipo: TipoProveedor.INSTITUCION,
        contacto: 'N/A',
        notas: 'Proveedor genérico para donaciones sin origen específico',
      },
    });
    console.log('✅ Proveedor de ejemplo creado');
  }

  console.log('\n🎉 Seed completado exitosamente');
}

main()
  .catch((e) => {
    console.error('❌ Error en seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
