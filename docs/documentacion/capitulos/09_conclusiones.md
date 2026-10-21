# CONCLUSIONES

1. Se cumplió el objetivo general: FarmaG se desarrolló con los módulos de Inventario, Dispensación,
   Catálogos, Administración y Reportes, que responden a 58 requerimientos funcionales y 19 casos de
   uso, y está instalado en la red local de la Farmacia Municipal de Gualán desde, a más tardar, el
   25 de septiembre de 2026. En el ciclo de pruebas funcionales se aprobaron 74 de los 92 casos y se
   cumplieron los criterios de salida del plan. La configuración con que se ejecuta el servidor de
   la farmacia no se ha comprobado, por lo que los secretos y el modo de ejecución siguen como riesgo
   abierto.

2. Se cumplió el primer objetivo específico. El inventario se registra por lote, con cantidad
   recibida, cantidad actual, fecha de vencimiento y estado, tanto en el registro manual de entradas
   como en la importación desde Excel. El defecto que permitía despachar lotes que vencían el mismo
   día se corrigió y tiene pruebas automatizadas aprobadas.

3. El segundo objetivo se cumplió de forma parcial. Cada lote se clasifica en el semáforo de
   vencimiento y el tablero muestra las alertas de existencias bajas, de lotes por vencer y de lotes
   vencidos. Los umbrales del semáforo son configurables solo desde el servidor: la interfaz no tiene
   la pantalla para modificarlos, que quedó programada para después de la entrega.

4. Se cumplió el tercer objetivo. Cada dispensación queda asociada a un beneficiario y al usuario que
   la registró, descuenta las existencias en orden de fecha de vencimiento y guarda los datos del
   medicamento tal como estaban al momento de la entrega. Los casos de prueba del orden FIFO y de la
   verificación del stock se aprobaron. Quedan dos defectos de trazabilidad de severidad media: los
   filtros de fecha del historial de dispensaciones no usan la hora local y la subida de
   fotografías se registra sin dirección IP ni constancia del reemplazo. La captura de
   evidencia no se ha probado con un teléfono real.

5. Se cumplió el cuarto objetivo. El despacho bloquea los lotes dentro de una transacción, y en las
   dos pruebas de dispensaciones simultáneas, la del 19 de julio de 2026 y la del ciclo de pruebas
   de octubre, una se registró y la otra se rechazó, sin doble descuento.

6. Se cumplió el quinto objetivo. Los catálogos de medicamentos, categorías, ubicaciones y códigos de
   barras permiten registrar y editar sus datos, con detección de medicamentos duplicados y
   un solo medicamento por código de barras. Sus defectos pendientes son de severidad baja.

7. El sexto objetivo se cumplió de forma parcial. Las contraseñas se guardan cifradas, toda petición
   sin sesión se rechaza, los permisos por rol se aplican en la interfaz y en peticiones directas, y
   el límite de intentos de inicio de sesión tiene pruebas aprobadas. La bitácora registra las
   operaciones sobre los datos, pero no el cierre de sesión. El rol de Encargado de
   Beneficencia no se usa en la operación diaria, que se hace con una cuenta de Administrador. El
   hallazgo crítico H-52, la contraseña fija del administrador en la instalación, se resolvió el 21
   de octubre de 2026 al cambiarla el personal de la farmacia.

8. El séptimo objetivo se cumplió de forma parcial. Los seis reportes de la operación se consultan
   con filtros y se exportan a PDF y Excel con el encabezado institucional, y cada exportación queda
   en la bitácora. El filtro de fecha inicial de los reportes incluye registros del día anterior
  , defecto de prioridad alta con corrección planificada, y los reportes solo están
   disponibles para el Administrador.
