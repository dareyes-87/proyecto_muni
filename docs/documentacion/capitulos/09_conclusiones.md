# CONCLUSIONES

1. Se cumplió el objetivo general. FarmaG se desarrolló con los módulos de Inventario, Dispensación,
   Catálogos, Administración y Reportes y está instalado y en uso en la red local de la Farmacia
   Municipal de Gualán. En las pruebas funcionales se aprobaron 74 de los 92 casos de prueba, y los
   fallos corresponden a defectos registrados con su plan de corrección.

2. El inventario se registra por lote, con su cantidad, fecha de vencimiento y estado, tanto al
   registrar entradas como al cargarlas desde Excel. Con esto la farmacia conoce en todo momento sus
   existencias reales.

3. El sistema clasifica cada lote según su cercanía al vencimiento y muestra en el panel las alertas
   de existencias bajas, de lotes por vencer y de lotes vencidos. Los plazos de esta clasificación
   se pueden ajustar desde la configuración; la pantalla para modificarlos queda como mejora
   posterior.

4. Cada entrega queda asociada a un beneficiario y a la persona que la realizó, y descuenta primero
   las unidades del lote que vence antes. Así la municipalidad sabe a quién se entregó cada
   medicamento y se reducen las pérdidas por vencimiento.

5. Dos entregas realizadas al mismo tiempo no descuentan las mismas unidades: en las pruebas de
   entregas simultáneas, una se registró y la otra se rechazó sin afectar las existencias.

6. Los catálogos de medicamentos, categorías, ubicaciones y códigos de barras permiten mantener
   ordenada la información, avisan cuando un medicamento podría estar duplicado y no permiten que un
   mismo código de barras pertenezca a dos medicamentos.

7. El acceso está protegido con usuarios, contraseñas cifradas y permisos por rol, y la bitácora
   registra quién hizo cada operación. El riesgo más serio encontrado, la contraseña inicial del
   administrador conocida públicamente, ya fue resuelto por el personal de la farmacia. Queda
   pendiente que la operación diaria se haga con una cuenta de Encargado en lugar de la de
   Administrador.

8. Los seis reportes de la farmacia se consultan con filtros y se exportan a PDF y Excel con el
   encabezado institucional. Su filtro de fecha inicial incluye registros del día anterior, un
   defecto que ya tiene su corrección planificada.
