# 1. Análisis de Requerimientos

## 1.1 Descripción General del Sistema

El presente proyecto consiste en el desarrollo de un sistema web denominado FarmaRH, destinado a digitalizar y optimizar la gestión de la Farmacia Municipal de Gualán, Zacapa. La farmacia opera actualmente de forma manual, sin herramientas digitales para el control de inventario, lo que genera pérdidas de información, dificultad para auditar existencias y falta de trazabilidad en las dispensaciones.

El sistema cubrirá dos modalidades de operación claramente diferenciadas que coexisten dentro de la misma farmacia:

- Dispensación gratuita (beneficencia): medicamentos entregados sin costo como beneficio social a la población, con registro obligatorio del beneficiario.
- Venta directa: medicamentos vendidos al público con precio establecido por la municipalidad. La farmacia genera un ticket de venta; el cobro efectivo se realiza en la ventanilla de la municipalidad, fuera del ámbito del sistema.

**El sistema NO manejará dinero en efectivo ni transacciones financieras directas. Su función en el módulo de ventas es registrar precios, generar tickets y controlar el flujo de medicamentos.**

## 1.2 Planteamiento del Problema

La Farmacia Municipal de Gualán carece de un sistema digital que permita llevar un registro preciso del inventario de medicamentos. Los problemas identificados son:

- Imposibilidad de conocer existencias en tiempo real.
- Sin trazabilidad sobre a quién se entregaron medicamentos gratuitos.
- Sin registros auditables de ventas y cobros.
- Dificultad para generar reportes para las autoridades municipales.
- Riesgo de pérdidas por vencimiento de medicamentos no monitoreados.
- Ausencia de un flujo controlado para el proceso de ticket-pago-entrega en ventas.
- No existe log de auditoría que permita rastrear acciones de los operadores del sistema.

## 1.3 Objetivos

### Objetivo General

Desarrollar un sistema web para la gestión integral del inventario y dispensación de medicamentos de la Farmacia Municipal de Gualán, que permita controlar entradas, salidas, ventas mediante tickets, dispensaciones gratuitas y generar reportes gerenciales diferenciados por rol y área.

## Objetivos Específicos

1. Registrar y controlar el inventario de medicamentos con sus entradas y salidas, incluyendo alertas de stock mínimo y vencimiento.

2. Implementar un flujo de ventas basado en tickets con estados (Pendiente, Completado, Anulado) que se integre con el proceso de pago externo en ventanilla municipal.

3. Gestionar la dispensación gratuita con registro obligatorio de beneficiarios.

4. Gestionar usuarios con roles diferenciados (Administrador, Farmacéutico/Cajero, Encargado de Beneficencia).

5. Generar reportes diferenciados por rol, con dashboards separados por área (ventas y beneficencia).

6. Implementar un log de auditoría completo para trazabilidad de todas las acciones del sistema.

7. Permitir anulaciones manuales y automáticas de tickets con motivo obligatorio y reintegro de stock.

8. Soportar devoluciones con plazo máximo de 1 semana en ambas modalidades.

## 1.4 Alcance del Sistema

<table>
  <thead>
    <tr>
        <th>DENTRO DEL ALCANCE</th>
        <th>FUERA DEL ALCANCE</th>
    </tr>
  </thead>
  <tbody>
    <tr>
        <td>Control de inventario de medicamentos</td>
        <td>Integración con sistemas del MSPAS</td>
    </tr>
    <tr>
        <td>Registro de entradas (compras/donaciones)</td>
        <td>Expediente clínico del paciente</td>
    </tr>
    <tr>
        <td>Registro de salidas (ventas y dispensación gratuita)</td>
        <td>Facturación electrónica certificada</td>
    </tr>
    <tr>
        <td>Flujo de tickets con estados para ventas</td>
        <td>App móvil nativa</td>
    </tr>
    <tr>
        <td>Gestión de usuarios y roles</td>
        <td>Control de otros recursos municipales</td>
    </tr>
    <tr>
        <td>Reportes diferenciados por rol y área</td>
        <td>Gestión de recursos humanos</td>
    </tr>
    <tr>
        <td>Dashboards por área (ventas y beneficencia)</td>
        <td>Cobro de dinero (se realiza en ventanilla)</td>
    </tr>
    <tr>
        <td>Log de auditoría completo</td>
        <td>Integración con sistema de ventanilla</td>
    </tr>
    <tr>
        <td colspan="2">Anulaciones manuales y automáticas</td>
    </tr>
    <tr>
        <td colspan="2">Devoluciones con plazo de 1 semana</td>
    </tr>
    <tr>
        <td colspan="2">Registro básico de beneficiarios</td>
    </tr>
    <tr>
        <td colspan="2">Alertas configurables de vencimiento</td>
    </tr>
  </tbody>
</table>

## 1.5 Stakeholders Identificados

<table>
  <thead>
    <tr>
        <th>ROL</th>
        <th>STAKEHOLDER</th>
        <th>INTERÉS EN EL SISTEMA</th>
    </tr>
  </thead>
  <tbody>
    <tr>
        <td>Patrocinador / Cliente</td>
        <td>Alcalde Municipal de Gualán</td>
        <td>Visibilidad y control del servicio farmacéutico</td>
    </tr>
    <tr>
        <td>Usuario Primario (Ventas)</td>
        <td>Farmacéutico / Cajero</td>
        <td>Registro diario de ventas, generación de tickets</td>
    </tr>
    <tr>
        <td>Usuario Primario (Beneficencia)</td>
        <td>Encargado de Beneficencia</td>
        <td>Registro de dispensaciones gratuitas</td>
    </tr>
  </tbody>
</table>

<table>
  <thead>
    <tr>
      <th>Usuario 
Administrativo</th>
      <th>Personal Administrativo</th>
      <th>Supervisión, reportes y gestión de inventario</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>Beneficiario</td>
      <td>Paciente / Ciudadano</td>
      <td>Recibir medicamento oportuno y con registro</td>
    </tr>
    <tr>
      <td>Operador Externo</td>
      <td>Ventanilla Municipal</td>
      <td>Recibir tickets válidos para cobro</td>
    </tr>
  </tbody>
</table>

## 2. Identificación de Entidades Principales

### 2.1 Entidades del Sistema y su Descripción

A partir del análisis de requerimientos y las definiciones acordadas con el equipo, se identificaron las siguientes entidades principales que formarán parte del modelo de datos del sistema FarmaRH. El modelo ha sido diseñado siguiendo las tres formas normales (3FN) para garantizar integridad y evitar redundancia.

<table>
  <thead>
    <tr>
        <th>ENTIDAD</th>
        <th>TABLA</th>
        <th>DESCRIPCIÓN Y FUNCIÓN</th>
    </tr>
  </thead>
  <tbody>
    <tr>
        <td>Usuario</td>
        <td>usuarios</td>
        <td>Personas con acceso al sistema. Almacena credenciales (hash de contraseña), nombre, email, rol, estado activo/inactivo y fecha de creación.</td>
    </tr>
    <tr>
        <td>Medicamento</td>
        <td>medicamentos</td>
        <td>Catálogo maestro de medicamentos. Nombre genérico, nombre comercial, presentación, unidad de medida, precio de venta y stock mínimo de alerta.</td>
    </tr>
    <tr>
        <td>Inventario</td>
        <td>inventario</td>
        <td>Registro del stock actual por medicamento. Control de existencias, lote y fecha de vencimiento.</td>
    </tr>
    <tr>
        <td>Entrada</td>
        <td>entradas</td>
        <td>Registra cada ingreso de medicamentos al inventario, vinculado a proveedor y usuario que registra.</td>
    </tr>
    <tr>
        <td>Detalle de Entrada</td>
        <td>detalle_entradas</td>
        <td>Líneas de detalle de cada entrada: medicamento, cantidad, precio unitario de costo y lote.</td>
    </tr>
    <tr>
        <td>Ticket / Transacción</td>
        <td>tickets</td>
        <td>Registra cada venta o dispensación. Incluye tipo (venta/donación), estado (pendiente/completado/anulado), referencia al usuario, número de ticket, fecha/hora, total calculado.</td>
    </tr>
    <tr>
        <td>Detalle de Ticket</td>
        <td>detalle_tickets</td>
        <td>Líneas de detalle: medicamento, cantidad, precio unitario aplicado y subtotal.</td>
    </tr>
    <tr>
        <td>Historial de Modificaciones</td>
        <td>historial_tickets</td>
        <td>Registra cada modificación a un ticket: qué producto se removió, cantidad reintegrada, motivo, usuario y fecha/hora.</td>
    </tr>
    <tr>
        <td>Anulación</td>
        <td>anulaciones</td>
        <td>Registro de tickets anulados (manual o automático). Almacena ticket original, motivo, tipo de anulación, usuario que anuló y fecha/hora.</td>
    </tr>
    <tr>
        <td>Devolución</td>
        <td>devoluciones</td>
        <td>Registro de devoluciones dentro del plazo de 1 semana. Referencia al ticket original, productos devueltos, motivo y usuario.</td>
    </tr>
    <tr>
        <td>Beneficiario</td>
        <td>beneficiarios</td>
        <td>Persona que recibe medicamento gratuito. Nombre</td>
    </tr>
  </tbody>
</table>

<table>
  <tbody>
    <tr>
        <td> </td>
        <td> </td>
        <td>completo, DPI (opcional), dirección y teléfono.</td>
    </tr>
    <tr>
        <td>Proveedor / Donante</td>
        <td>proveedores</td>
        <td>Entidad que suministra medicamentos (proveedor comercial o donante/ONG).</td>
    </tr>
    <tr>
        <td>Rol</td>
        <td>roles</td>
        <td>Catálogo de roles del sistema (Administrador, Farmacéutico/Cajero, Encargado de Beneficencia).</td>
    </tr>
    <tr>
        <td>Categoría</td>
        <td>categorias</td>
        <td>Clasificación terapéutica de medicamentos (analgésico, antibiótico, etc.).</td>
    </tr>
    <tr>
        <td>Motivo de Anulación</td>
        <td>motivos_anulacion</td>
        <td>Catálogo de motivos predefinidos para anulaciones manuales, con opción de texto libre adicional.</td>
    </tr>
    <tr>
        <td>Log de Auditoría</td>
        <td>log_auditoria</td>
        <td>Registro de todas las acciones realizadas en el sistema: usuario, acción, entidad afectada, valores anteriores/nuevos, fecha y hora.</td>
    </tr>
  </tbody>
</table>

# 3. Flujos de Operación del Sistema

## 3.1 Flujo de Venta con Tickets

El proceso de venta de medicamentos en la Farmacia Municipal de Gualán involucra una interacción entre la farmacia y la ventanilla de cobro de la municipalidad. El sistema FarmaRH gestiona únicamente el lado de la farmacia. A continuación se describe el flujo completo:

**Paso 1: Registro del pedido**

El cliente llega a la farmacia y solicita los medicamentos que necesita. El farmacéutico busca los medicamentos en el sistema, verifica disponibilidad de stock y los agrega al ticket. Al confirmar, el sistema genera un número de ticket único, descuenta el stock del inventario inmediatamente y el ticket queda en estado PENDIENTE.

**Paso 2: Pago en ventanilla**

El cliente recibe el ticket impreso con el detalle y monto total, y se dirige a la ventanilla de la municipalidad (externa al sistema) para realizar el pago. Durante este tiempo, el farmacéutico puede atender a otros clientes.

**Paso 3: Entrega de medicamentos**

El cliente regresa a la farmacia con el ticket marcado como “cancelado” por ventanilla. El farmacéutico busca el ticket por su código en la lista de pedidos pendientes, confirma la entrega y el ticket cambia a estado COMPLETADO.

## 3.2 Estados del Ticket

<table>
  <thead>
    <tr>
        <th>ESTADO</th>
        <th>DESCRIPCIÓN</th>
        <th>EFECTO EN INVENTARIO</th>
    </tr>
  </thead>
  <tbody>
    <tr>
        <td>PENDIENTE</td>
        <td>Ticket generado, cliente se fue a pagar. El farmacéutico puede ver este ticket en la lista de</td>
        <td>Stock YA descontado (reservado)</td>
    </tr>
  </tbody>
</table>

<table>
  <thead>
    <tr>
        <th> </th>
        <th>pedidos pendientes.</th>
        <th> </th>
    </tr>
  </thead>
  <tbody>
    <tr>
        <td>COMPLETADO</td>
        <td>Cliente regresó con ticket pagado,<br/>medicamentos entregados.</td>
        <td>Sin cambio (stock ya fue<br/>descontado)</td>
    </tr>
    <tr>
        <td>ANULADO</td>
        <td>Ticket cancelado por anulación manual o<br/>automática (12 horas).</td>
        <td>Stock REINTEGRADO al<br/>inventario</td>
    </tr>
  </tbody>
</table>

## 3.3 Anulación de Tickets

### Anulación Automática

Si un ticket permanece en estado PENDIENTE por más de 12 horas, el sistema lo anula automáticamente. El stock de todos los productos del ticket se reintegra al inventario y el registro se mueve a la tabla de anulaciones con el motivo “Anulación automática por tiempo límite (12h)”.

### Anulación Manual

El farmacéutico puede anular un ticket PENDIENTE en cualquier momento. El sistema requiere obligatoriamente seleccionar un motivo del catálogo predefinido, con opción de agregar un comentario de texto libre. Los motivos predefinidos incluyen:

* Cliente no tiene suficiente dinero

* Error del farmacéutico al registrar

* Cliente cambió de opinión

* Medicamento en mal estado al momento de preparar

* Cliente no regresará (confirmado)

* Ticket duplicado por error

* Otro (requiere texto libre obligatorio)

## 3.4 Modificación de Tickets (Anulación Parcial)

Cuando un cliente solicita remover uno o más productos del ticket (por ejemplo, no le alcanza para todo), el farmacéutico puede modificar el ticket sin necesidad de anularlo y recrearlo. El flujo es el siguiente:

1. El farmacéutico abre el ticket por su código (debe estar en estado PENDIENTE).

2. Selecciona el o los productos que desea remover.

3. El sistema solicita un motivo de anulación (del catálogo predefinido).

4. Al confirmar: el stock de los productos removidos se reintegra al inventario, el total del ticket se recalcula automáticamente, los productos removidos se registran en el historial de modificaciones del ticket.

5. El ticket mantiene su mismo número y puede reimprimirse con el detalle actualizado.

6. Si se remueven TODOS los productos, el ticket se anula automáticamente.

Cada modificación queda registrada con: producto removido, cantidad reintegrada, motivo, usuario que realizó la modificación y fecha/hora exacta. Esta información alimenta el log de auditoría.

## 3.5 Flujo de Dispensación Gratuita (Beneficencia)

La dispensación gratuita no involucra pago ni tickets con estados intermedios. El flujo básico es:

1. El beneficiario llega a la farmacia y solicita medicamento.

2. El encargado busca o registra al beneficiario en el sistema (nombre, DPI opcional, teléfono).

3. Agrega los medicamentos a dispensar y confirma la entrega.

4. El stock se descuenta inmediatamente y queda registrado con trazabilidad completa.

**NOTA:** El flujo detallado de beneficencia está pendiente de confirmación con la administración municipal. Quedan por definir: criterios de elegibilidad del beneficiario, límites de medicamentos por persona/periodo, autorizaciones necesarias y si existe presupuesto mensual asignado.

## 3.6 Devoluciones

Ambas modalidades (venta y beneficencia) aceptan devoluciones dentro de un plazo máximo de 1 semana desde la fecha de la transacción original. Pasado ese plazo, el sistema no permite realizar la devolución.

**NOTA:** El proceso de anulación del ticket en ventanilla (cuando un cliente ya pagó y se necesita devolución de dinero) está pendiente de definir con las personas encargadas de la municipalidad.

# 4. Casos de Uso

## 4.1 Actores del Sistema

<table>
  <thead>
    <tr>
        <th>ACTOR</th>
        <th>DESCRIPCIÓN</th>
    </tr>
  </thead>
  <tbody>
    <tr>
        <td>Administrador</td>
        <td>Personal administrativo municipal con acceso total al sistema. Gestiona catálogos, usuarios, entradas de inventario y puede ver todos los reportes y dashboards de ambas áreas.</td>
    </tr>
    <tr>
        <td>Farmacéutico / Cajero</td>
        <td>Encargado del mostrador de ventas. Registra ventas, genera tickets, confirma entregas, realiza anulaciones y consulta sus propios reportes diarios.</td>
    </tr>
    <tr>
        <td>Encargado de Beneficencia</td>
        <td>Responsable de la dispensación gratuita. Registra beneficiarios, realiza entregas gratuitas y consulta sus propios reportes diarios.</td>
    </tr>
    <tr>
        <td>Sistema (automático)</td>
        <td>Ejecuta anulación automática de tickets tras 12 horas, alertas de stock mínimo y alertas de vencimiento de medicamentos.</td>
    </tr>
  </tbody>
</table>

## 4.2 Casos de Uso por Módulo

### Módulo: Gestión de Inventario

<table>
  <thead>
    <tr>
        <th>ID</th>
        <th>CASO DE USO</th>
        <th>ACTORES</th>
    </tr>
  </thead>
  <tbody>
    <tr>
        <td>CU-01</td>
        <td>Registrar entrada de medicamentos</td>
        <td>Administrador</td>
    </tr>
    <tr>
        <td>CU-02</td>
        <td>Consultar inventario</td>
        <td>Administrador, Farmacéutico, Enc. Beneficencia</td>
    </tr>
    <tr>
        <td>CU-03</td>
        <td>Actualizar stock manualmente</td>
        <td>Administrador</td>
    </tr>
  </tbody>
</table>

<table>
  <tbody>
    <tr>
        <td>CU-04</td>
        <td>Visualizar alertas de stock mínimo</td>
        <td>Administrador, Farmacéutico,<br/>Enc. Beneficencia</td>
    </tr>
    <tr>
        <td>CU-05</td>
        <td>Visualizar alertas de vencimiento</td>
        <td>Administrador, Farmacéutico,<br/>Enc. Beneficencia</td>
    </tr>
  </tbody>
</table>

## Módulo: Ventas (Tickets)

<table>
  <thead>
    <tr>
        <th>ID</th>
        <th>CASO DE USO</th>
        <th>ACTORES</th>
    </tr>
  </thead>
  <tbody>
    <tr>
        <td>CU-06</td>
        <td>Registrar venta y generar ticket</td>
        <td>Farmacéutico / Cajero</td>
    </tr>
    <tr>
        <td>CU-07</td>
        <td>Consultar pedidos pendientes</td>
        <td>Farmacéutico / Cajero</td>
    </tr>
    <tr>
        <td>CU-08</td>
        <td>Confirmar entrega (completar ticket)</td>
        <td>Farmacéutico / Cajero</td>
    </tr>
    <tr>
        <td>CU-09</td>
        <td>Modificar ticket (anulación parcial)</td>
        <td>Farmacéutico / Cajero</td>
    </tr>
    <tr>
        <td>CU-10</td>
        <td>Anular ticket manualmente</td>
        <td>Farmacéutico / Cajero</td>
    </tr>
    <tr>
        <td>CU-11</td>
        <td>Reimprimir ticket</td>
        <td>Farmacéutico / Cajero</td>
    </tr>
    <tr>
        <td>CU-12</td>
        <td>Registrar devolución de venta</td>
        <td>Farmacéutico / Cajero,<br/>Administrador</td>
    </tr>
    <tr>
        <td>CU-13</td>
        <td>Consultar ventas del día (propias)</td>
        <td>Farmacéutico / Cajero</td>
    </tr>
  </tbody>
</table>

## Módulo: Dispensación Gratuita

<table>
  <thead>
    <tr>
        <th>ID</th>
        <th>CASO DE USO</th>
        <th>ACTORES</th>
    </tr>
  </thead>
  <tbody>
    <tr>
        <td>CU-14</td>
        <td>Registrar dispensación gratuita</td>
        <td>Enc. Beneficencia</td>
    </tr>
    <tr>
        <td>CU-15</td>
        <td>Registrar / buscar beneficiario</td>
        <td>Enc. Beneficencia,<br/>Administrador</td>
    </tr>
    <tr>
        <td>CU-16</td>
        <td>Ver historial de beneficiario</td>
        <td>Enc. Beneficencia,<br/>Administrador</td>
    </tr>
    <tr>
        <td>CU-17</td>
        <td>Registrar devolución de beneficencia</td>
        <td>Enc. Beneficencia,<br/>Administrador</td>
    </tr>
    <tr>
        <td>CU-18</td>
        <td>Consultar dispensaciones del día (propias)</td>
        <td>Enc. Beneficencia</td>
    </tr>
  </tbody>
</table>

## Módulo: Reportes y Dashboards

<table>
  <thead>
    <tr>
        <th>ID</th>
        <th>CASO DE USO</th>
        <th>ACTORES</th>
    </tr>
  </thead>
  <tbody>
    <tr>
        <td>CU-19</td>
        <td>Generar reporte de movimientos de inventario</td>
        <td>Administrador</td>
    </tr>
    <tr>
        <td>CU-20</td>
        <td>Generar reporte de ventas (filtro: día, mes, año)</td>
        <td>Administrador</td>
    </tr>
    <tr>
        <td>CU-21</td>
        <td>Generar reporte de beneficencia (filtro: día, mes, año)</td>
        <td>Administrador</td>
    </tr>
    <tr>
        <td>CU-22</td>
        <td>Ver dashboard de ventas</td>
        <td>Administrador</td>
    </tr>
    <tr>
        <td>CU-23</td>
        <td>Ver dashboard de beneficencia</td>
        <td>Administrador</td>
    </tr>
    <tr>
        <td>CU-24</td>
        <td>Ver dashboard diario propio (ventas)</td>
        <td>Farmacéutico / Cajero</td>
    </tr>
    <tr>
        <td>CU-25</td>
        <td>Ver dashboard diario propio (beneficencia)</td>
        <td>Enc. Beneficencia</td>
    </tr>
    <tr>
        <td>CU-26</td>
        <td>Consultar historial con filtros (días anteriores, mes, año)</td>
        <td>Farmacéutico, Enc.<br/>Beneficencia</td>
    </tr>
  </tbody>
</table>

<table>
  <tbody>
    <tr>
        <td>CU-27</td>
        <td>Exportar reportes a PDF</td>
        <td>Administrador</td>
    </tr>
  </tbody>
</table>

## Módulo: Administración y Seguridad

<table>
  <thead>
    <tr>
        <th>ID</th>
        <th>CASO DE USO</th>
        <th>ACTORES</th>
    </tr>
  </thead>
  <tbody>
    <tr>
        <td>CU-28</td>
        <td>Gestionar usuarios del sistema</td>
        <td>Administrador</td>
    </tr>
    <tr>
        <td>CU-29</td>
        <td>Gestionar catálogo de medicamentos</td>
        <td>Administrador</td>
    </tr>
    <tr>
        <td>CU-30</td>
        <td>Gestionar catálogo de proveedores</td>
        <td>Administrador</td>
    </tr>
    <tr>
        <td>CU-31</td>
        <td>Gestionar catálogo de categorías</td>
        <td>Administrador</td>
    </tr>
    <tr>
        <td>CU-32</td>
        <td>Configurar umbrales de alertas de vencimiento</td>
        <td>Administrador</td>
    </tr>
    <tr>
        <td>CU-33</td>
        <td>Consultar log de auditoría</td>
        <td>Administrador</td>
    </tr>
    <tr>
        <td>CU-34</td>
        <td>Iniciar / Cerrar sesión</td>
        <td>Todos los usuarios</td>
    </tr>
  </tbody>
</table>

## Módulo: Procesos Automáticos

<table>
  <thead>
    <tr>
        <th>ID</th>
        <th>CASO DE USO</th>
        <th>ACTOR</th>
    </tr>
  </thead>
  <tbody>
    <tr>
        <td>CU-35</td>
        <td>Anular tickets pendientes tras 12 horas</td>
        <td>Sistema (automático)</td>
    </tr>
    <tr>
        <td>CU-36</td>
        <td>Generar alertas de stock mínimo</td>
        <td>Sistema (automático)</td>
    </tr>
    <tr>
        <td>CU-37</td>
        <td>Generar alertas de vencimiento (30 y 15 días)</td>
        <td>Sistema (automático)</td>
    </tr>
  </tbody>
</table>

# 5. Transcripción de Entrevista con el Cliente

## 5.1 Datos de la Sesión

<table>
  <thead>
    <tr>
        <th>DATO</th>
        <th>DETALLE</th>
    </tr>
  </thead>
  <tbody>
    <tr>
        <td>Tipo de sesión</td>
        <td>Reunión inicial de levantamiento de requerimientos</td>
    </tr>
    <tr>
        <td>Participantes</td>
        <td>Alcalde Municipal de Gualán, Zacapa / Equipo de desarrollo</td>
    </tr>
    <tr>
        <td>Modalidad</td>
        <td>Reunión presencial</td>
    </tr>
    <tr>
        <td>Periodo estimado</td>
        <td>Primer trimestre 2026</td>
    </tr>
  </tbody>
</table>

## 5.2 Transcripción de Requerimientos Expresados

A continuación se transcribe textualmente la solicitud expresada por el señor Alcalde Municipal, la cual constituye el punto de partida para el levantamiento de requerimientos:

**“TENER UN CONTROL DE INVENTARIO DE MEDICINA. PARTE QUE SE REGALA Y PARTE DE LA FARMACIA DE LA QUE SE VENDE. CONTROL DE LO QUE SALE Y ENTRA DE LA FARMACIA. TANTO PAGADO COMO NO PAGADO.”**

— Alcalde Municipal de Gualán, Zacapa

## 5.3 Análisis de la Solicitud

<table>
  <thead>
    <tr>
        <th>FRASE DEL ALCALDE</th>
        <th>REQUERIMIENTO DERIVADO</th>
    </tr>
  </thead>
  <tbody>
    <tr>
        <td>“Control de inventario de medicina”</td>
        <td>El sistema debe mantener un catálogo de medicamentos con stock actualizado en tiempo real.</td>
    </tr>
    <tr>
        <td>“Parte que se regala”</td>
        <td>Módulo de dispensación gratuita con registro del beneficiario que recibe el medicamento.</td>
    </tr>
    <tr>
        <td>“Parte de la farmacia de la que se vende”</td>
        <td>Módulo de ventas con generación de ticket, registro de precios y control de entrega.</td>
    </tr>
    <tr>
        <td>“Control de lo que sale y entra”</td>
        <td>Registro de entradas y salidas con historial completo y log de auditoría.</td>
    </tr>
    <tr>
        <td>“Tanto pagado como no pagado”</td>
        <td>Diferenciación clara entre movimientos de venta (con ticket) y dispensación gratuita, con reportes separados por tipo.</td>
    </tr>
  </tbody>
</table>

## 5.4 Requerimientos Complementarios Identificados

Durante el proceso de análisis, el equipo de desarrollo identificó requerimientos adicionales implícitos necesarios para un sistema funcional:

* Control de acceso con roles diferenciados: Administrador, Farmacéutico/Cajero y Encargado de Beneficencia.

* Registro básico del beneficiario en dispensaciones gratuitas (nombre, identificación).

* Flujo de ventas basado en tickets con estados (Pendiente, Completado, Anulado) para integrarse con el proceso de pago en ventanilla municipal.

* Descuento de stock al momento de generar el ticket, con reintegro automático en caso de anulación.

* Anulación automática de tickets pendientes tras 12 horas.

* Anulación manual y modificación parcial de tickets con motivo obligatorio.

* Devoluciones con plazo máximo de 1 semana en ambas modalidades.

* Alertas configurables de stock mínimo para evitar desabastecimiento.

* Alertas de medicamentos próximos a vencer con umbrales de 30 y 15 días (configurables por el administrador).

* Generación de reportes exportables diferenciados por rol y área.

* Dashboards separados por área (ventas y beneficencia) con filtros de día, mes y año.

* Log de auditoría completo para trazabilidad de todas las acciones.

* Interfaz web accesible desde cualquier dispositivo con navegador.