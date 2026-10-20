-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "Rol" AS ENUM ('ADMIN', 'ENCARGADO_BENEFICENCIA');

-- CreateEnum
CREATE TYPE "EstadoLote" AS ENUM ('DISPONIBLE', 'AGOTADO', 'VENCIDO', 'DADO_DE_BAJA');

-- CreateEnum
CREATE TYPE "TipoFoto" AS ENUM ('RECETA', 'EVIDENCIA_ENTREGA');

-- CreateEnum
CREATE TYPE "AccionAuditoria" AS ENUM ('CREAR', 'EDITAR', 'ELIMINAR', 'DISPENSAR', 'BAJA', 'LOGIN', 'LOGOUT', 'ACTIVAR', 'DESACTIVAR');

-- CreateTable
CREATE TABLE "usuarios" (
    "id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "email" TEXT,
    "password_hash" TEXT NOT NULL,
    "nombre_completo" TEXT NOT NULL,
    "rol" "Rol" NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "ultimo_acceso" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "usuarios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "categorias" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "activo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "categorias_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "medicamentos" (
    "id" TEXT NOT NULL,
    "nombre_generico" TEXT NOT NULL,
    "nombre_comercial" TEXT,
    "presentacion" TEXT NOT NULL,
    "concentracion" TEXT,
    "unidad_medida" TEXT NOT NULL,
    "categoria_id" TEXT NOT NULL,
    "stock_minimo" INTEGER NOT NULL DEFAULT 10,
    "imagen_url" TEXT,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "medicamentos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "codigos_barras" (
    "id" TEXT NOT NULL,
    "medicamento_id" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "descripcion" TEXT,

    CONSTRAINT "codigos_barras_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ubicaciones" (
    "id" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "descripcion" TEXT,

    CONSTRAINT "ubicaciones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "entradas" (
    "id" TEXT NOT NULL,
    "usuario_id" TEXT NOT NULL,
    "observaciones" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "entradas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lotes" (
    "id" TEXT NOT NULL,
    "entrada_id" TEXT NOT NULL,
    "medicamento_id" TEXT NOT NULL,
    "cantidad" INTEGER NOT NULL,
    "cantidad_actual" INTEGER NOT NULL,
    "numero_lote" TEXT NOT NULL,
    "fecha_vencimiento" DATE NOT NULL,
    "costo_unitario" DECIMAL(10,2),
    "ubicacion_id" TEXT,
    "estado" "EstadoLote" NOT NULL DEFAULT 'DISPONIBLE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "lotes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "beneficiarios" (
    "id" TEXT NOT NULL,
    "nombre_completo" TEXT NOT NULL,
    "dpi" TEXT,
    "telefono" TEXT,
    "direccion" TEXT,
    "observaciones" TEXT,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "beneficiarios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dispensaciones" (
    "id" TEXT NOT NULL,
    "beneficiario_id" TEXT NOT NULL,
    "usuario_id" TEXT NOT NULL,
    "observaciones" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "dispensaciones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fotos_dispensacion" (
    "id" TEXT NOT NULL,
    "dispensacion_id" TEXT NOT NULL,
    "tipo" "TipoFoto" NOT NULL,
    "imagen_url" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "fotos_dispensacion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tokens_captura" (
    "id" TEXT NOT NULL,
    "dispensacion_id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "usado" BOOLEAN NOT NULL DEFAULT false,
    "expira_en" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tokens_captura_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "detalle_dispensaciones" (
    "id" TEXT NOT NULL,
    "dispensacion_id" TEXT NOT NULL,
    "lote_id" TEXT NOT NULL,
    "medicamento_id" TEXT NOT NULL,
    "cantidad" INTEGER NOT NULL,
    "nombre_medicamento_snapshot" TEXT NOT NULL,
    "presentacion_snapshot" TEXT NOT NULL,
    "concentracion_snapshot" TEXT,

    CONSTRAINT "detalle_dispensaciones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "log_auditoria" (
    "id" TEXT NOT NULL,
    "usuario_id" TEXT NOT NULL,
    "accion" "AccionAuditoria" NOT NULL,
    "entidad" TEXT NOT NULL,
    "entidad_id" TEXT,
    "datos_anteriores" JSONB,
    "datos_nuevos" JSONB,
    "ip_address" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "log_auditoria_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "configuracion_sistema" (
    "id" TEXT NOT NULL,
    "clave" TEXT NOT NULL,
    "valor" TEXT NOT NULL,
    "descripcion" TEXT,

    CONSTRAINT "configuracion_sistema_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "usuarios_username_key" ON "usuarios"("username");

-- CreateIndex
CREATE UNIQUE INDEX "usuarios_email_key" ON "usuarios"("email");

-- CreateIndex
CREATE UNIQUE INDEX "categorias_nombre_key" ON "categorias"("nombre");

-- CreateIndex
CREATE UNIQUE INDEX "codigos_barras_codigo_key" ON "codigos_barras"("codigo");

-- CreateIndex
CREATE UNIQUE INDEX "ubicaciones_codigo_key" ON "ubicaciones"("codigo");

-- CreateIndex
CREATE UNIQUE INDEX "beneficiarios_dpi_key" ON "beneficiarios"("dpi");

-- CreateIndex
CREATE UNIQUE INDEX "fotos_dispensacion_dispensacion_id_tipo_key" ON "fotos_dispensacion"("dispensacion_id", "tipo");

-- CreateIndex
CREATE UNIQUE INDEX "tokens_captura_dispensacion_id_key" ON "tokens_captura"("dispensacion_id");

-- CreateIndex
CREATE UNIQUE INDEX "tokens_captura_token_key" ON "tokens_captura"("token");

-- CreateIndex
CREATE UNIQUE INDEX "configuracion_sistema_clave_key" ON "configuracion_sistema"("clave");

-- AddForeignKey
ALTER TABLE "medicamentos" ADD CONSTRAINT "medicamentos_categoria_id_fkey" FOREIGN KEY ("categoria_id") REFERENCES "categorias"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "codigos_barras" ADD CONSTRAINT "codigos_barras_medicamento_id_fkey" FOREIGN KEY ("medicamento_id") REFERENCES "medicamentos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "entradas" ADD CONSTRAINT "entradas_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lotes" ADD CONSTRAINT "lotes_entrada_id_fkey" FOREIGN KEY ("entrada_id") REFERENCES "entradas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lotes" ADD CONSTRAINT "lotes_medicamento_id_fkey" FOREIGN KEY ("medicamento_id") REFERENCES "medicamentos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lotes" ADD CONSTRAINT "lotes_ubicacion_id_fkey" FOREIGN KEY ("ubicacion_id") REFERENCES "ubicaciones"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dispensaciones" ADD CONSTRAINT "dispensaciones_beneficiario_id_fkey" FOREIGN KEY ("beneficiario_id") REFERENCES "beneficiarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dispensaciones" ADD CONSTRAINT "dispensaciones_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fotos_dispensacion" ADD CONSTRAINT "fotos_dispensacion_dispensacion_id_fkey" FOREIGN KEY ("dispensacion_id") REFERENCES "dispensaciones"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tokens_captura" ADD CONSTRAINT "tokens_captura_dispensacion_id_fkey" FOREIGN KEY ("dispensacion_id") REFERENCES "dispensaciones"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "detalle_dispensaciones" ADD CONSTRAINT "detalle_dispensaciones_dispensacion_id_fkey" FOREIGN KEY ("dispensacion_id") REFERENCES "dispensaciones"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "detalle_dispensaciones" ADD CONSTRAINT "detalle_dispensaciones_lote_id_fkey" FOREIGN KEY ("lote_id") REFERENCES "lotes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "detalle_dispensaciones" ADD CONSTRAINT "detalle_dispensaciones_medicamento_id_fkey" FOREIGN KEY ("medicamento_id") REFERENCES "medicamentos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "log_auditoria" ADD CONSTRAINT "log_auditoria_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

