import { PrismaClient, Rol } from '@prisma/client';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

const prisma = new PrismaClient();

/** Valores de contraseña conocidos/inseguros que NO se permiten como bootstrap (H-002). */
const PASSWORDS_INSEGUROS = ['admin2026', 'admin', 'password', 'changeme', 'cambiar', '123456'];

async function main() {
  console.log('🌱 Iniciando seed de la base de datos...');

  // ============================================
  // Usuario Administrador inicial (bootstrap seguro, H-002)
  // ============================================
  // Ya NO existe una contraseña por defecto hardcodeada. El primer administrador
  // se crea con la contraseña de ADMIN_INITIAL_PASSWORD; si no se define, se
  // genera una aleatoria que se muestra UNA sola vez en consola. En ambos casos
  // debe cambiarse tras el primer inicio de sesión. Si el admin ya existe, no se
  // toca (no se restablece su contraseña).
  const adminUsername = (process.env.ADMIN_USERNAME || 'admin').trim();
  const adminExists = await prisma.usuario.findUnique({
    where: { username: adminUsername },
  });

  if (!adminExists) {
    const envPass = process.env.ADMIN_INITIAL_PASSWORD?.trim();
    let password: string;
    let generada = false;

    if (envPass) {
      if (envPass.length < 8) {
        throw new Error('ADMIN_INITIAL_PASSWORD debe tener al menos 8 caracteres.');
      }
      if (PASSWORDS_INSEGUROS.includes(envPass.toLowerCase())) {
        throw new Error('ADMIN_INITIAL_PASSWORD usa un valor inseguro/conocido. Elija otra contraseña.');
      }
      password = envPass;
    } else {
      // Aleatoria (~22 chars base64url). Nunca se guarda en claro; solo se imprime una vez.
      password = crypto.randomBytes(16).toString('base64url');
      generada = true;
    }

    // email es opcional y único: solo se asigna si se define ADMIN_EMAIL, para no
    // forzar un valor por defecto que colisione con otro admin ya existente.
    const adminEmail = process.env.ADMIN_EMAIL?.trim() || null;
    const hashedPassword = await bcrypt.hash(password, 12);
    await prisma.usuario.create({
      data: {
        username: adminUsername,
        email: adminEmail,
        passwordHash: hashedPassword,
        nombreCompleto: 'Administrador del Sistema',
        rol: Rol.ADMIN,
      },
    });

    if (generada) {
      console.log('\n==================== CREDENCIAL INICIAL DEL ADMINISTRADOR ====================');
      console.log('  (se muestra UNA sola vez — guárdela y cámbiela tras iniciar sesión)');
      console.log(`  Usuario:    ${adminUsername}`);
      console.log(`  Contraseña: ${password}`);
      console.log('  Para fijar una contraseña propia, defina ADMIN_INITIAL_PASSWORD en .env.');
      console.log('==============================================================================\n');
    } else {
      console.log(`✅ Usuario ${adminUsername} creado con la contraseña de ADMIN_INITIAL_PASSWORD. Cámbiela tras el primer inicio.`);
    }
  } else {
    console.log(`ℹ️  Usuario ${adminUsername} ya existe, omitiendo (no se restablece su contraseña).`);
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
  // Medicamentos de ejemplo (solo si no existe ninguno)
  // Datos de prueba para el módulo de Inventario. El CRUD real es de Catálogos.
  // ============================================
  const totalMedicamentos = await prisma.medicamento.count();
  if (totalMedicamentos === 0) {
    const categoriasMap = new Map(
      (await prisma.categoria.findMany()).map((c) => [c.nombre, c.id])
    );

    const medicamentosEjemplo = [
      { nombreGenerico: 'Acetaminofén', nombreComercial: 'Tylenol', presentacion: 'Tableta', concentracion: '500mg', unidadMedida: 'Tableta', categoria: 'Analgésico', stockMinimo: 50 },
      { nombreGenerico: 'Amoxicilina', nombreComercial: null, presentacion: 'Cápsula', concentracion: '500mg', unidadMedida: 'Cápsula', categoria: 'Antibiótico', stockMinimo: 30 },
      { nombreGenerico: 'Ibuprofeno', nombreComercial: 'Advil', presentacion: 'Tableta', concentracion: '400mg', unidadMedida: 'Tableta', categoria: 'Antiinflamatorio', stockMinimo: 40 },
      { nombreGenerico: 'Losartán', nombreComercial: null, presentacion: 'Tableta', concentracion: '50mg', unidadMedida: 'Tableta', categoria: 'Antihipertensivo', stockMinimo: 20 },
      { nombreGenerico: 'Metformina', nombreComercial: null, presentacion: 'Tableta', concentracion: '850mg', unidadMedida: 'Tableta', categoria: 'Antidiabético', stockMinimo: 20 },
    ];

    for (const m of medicamentosEjemplo) {
      await prisma.medicamento.create({
        data: {
          nombreGenerico: m.nombreGenerico,
          nombreComercial: m.nombreComercial,
          presentacion: m.presentacion,
          concentracion: m.concentracion,
          unidadMedida: m.unidadMedida,
          categoriaId: categoriasMap.get(m.categoria) ?? categoriasMap.get('Otro')!,
          stockMinimo: m.stockMinimo,
        },
      });
    }
    console.log(`✅ ${medicamentosEjemplo.length} medicamentos de ejemplo creados`);
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
