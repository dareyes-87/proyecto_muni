-- CreateIndex
CREATE INDEX "dispensaciones_created_at_idx" ON "dispensaciones"("created_at");

-- CreateIndex
CREATE INDEX "entradas_created_at_idx" ON "entradas"("created_at");

-- CreateIndex
CREATE INDEX "log_auditoria_created_at_idx" ON "log_auditoria"("created_at");

-- CreateIndex
CREATE INDEX "lotes_medicamento_id_estado_fecha_vencimiento_idx" ON "lotes"("medicamento_id", "estado", "fecha_vencimiento");
