# PRD — API para gestión de talleres de reparación de celulares

## 1. Nombre del producto

**API Taller de Celulares**

## 2. Resumen ejecutivo

API backend multiusuario para que cada persona registrada administre de forma aislada su propio taller de reparación de celulares. El MVP permitirá gestionar clientes, sus dispositivos y las órdenes de reparación asociadas, incluyendo el seguimiento de estados, importes, fechas y archivado lógico.

El producto se entregará exclusivamente como una API documentada, autenticada y desplegada. No incluye una interfaz de usuario.

## 3. Problema

Un taller de reparación necesita centralizar la información de sus clientes, los dispositivos recibidos y el avance de cada reparación. Sin un sistema específico, el seguimiento puede quedar disperso, dificultar la consulta del historial y permitir errores en los cambios de estado o en la identificación de una orden.

Además, al prestar el servicio a múltiples cuentas independientes, la API debe impedir que una cuenta consulte o modifique datos pertenecientes a otra.

## 4. Objetivos

- Permitir que una persona cree una cuenta vinculada a su taller e inicie sesión de forma segura.
- Centralizar la gestión de clientes, dispositivos y órdenes de reparación.
- Hacer visible el avance de cada reparación mediante estados y transiciones controladas.
- Mantener el historial mediante archivado lógico, sin eliminación física.
- Garantizar el aislamiento de los datos entre cuentas.
- Ofrecer consultas paginadas y filtros útiles para localizar órdenes.
- Entregar una API documentada y desplegada que cumpla las restricciones académicas.

## 5. Actores

### Propietario del taller

Único usuario de una cuenta. Registra y administra su taller, sus clientes, los dispositivos de estos y las órdenes de reparación. No comparte el taller con otros empleados ni administra roles.

### Sistema consumidor de la API

Cliente técnico que envía solicitudes autenticadas a la API y presenta o utiliza sus respuestas. El desarrollo de dicho cliente está fuera del alcance del MVP.

## 6. Alcance del MVP

- Registro de una cuenta con los datos del usuario y el nombre del taller.
- Autenticación mediante registro, login, renovación de sesión y logout.
- Gestión de clientes pertenecientes a la cuenta autenticada.
- Gestión de dispositivos vinculados con sus clientes.
- Gestión de órdenes de reparación vinculadas con dispositivos.
- Control de las transiciones permitidas entre estados de reparación.
- Asignación de un UUID interno y un número visible a cada orden.
- Registro de importes en pesos argentinos.
- Consulta paginada de recursos.
- Filtrado de órdenes por estado, cliente, dispositivo y rango de fechas.
- Archivado lógico sujeto a las reglas del negocio.
- Exclusión de registros archivados de los listados normales.
- Documentación de la API y despliegue funcional.

## 7. Fuera de alcance

- Frontend.
- Inventario de repuestos.
- Pagos y facturación.
- Notificaciones por WhatsApp o correo electrónico.
- Múltiples empleados, invitaciones y roles.
- Restauración de registros archivados.
- Almacenamiento de PIN, patrón o contraseña de dispositivos.
- Estado de espera de aprobación del cliente.

## 8. Entidades conceptuales

### Cuenta

Representa al usuario y a su taller independiente.

| Dato | Requerido | Descripción |
|---|---:|---|
| Nombre | Sí | Nombre del usuario. |
| Correo electrónico | Sí | Identificador globalmente único utilizado para autenticarse; se compara sin distinguir mayúsculas de minúsculas. |
| Contraseña | Sí | Credencial secreta del usuario. |
| Nombre del taller | Sí | Nombre comercial o identificativo del taller. |

### Cliente

Persona propietaria de uno o más dispositivos y perteneciente a una cuenta.

| Dato | Requerido |
|---|---:|
| Nombre | Sí |
| Apellido | Sí |
| Teléfono | Sí |
| Correo electrónico | No |
| Dirección | Sí |
| Observaciones | No |

### Dispositivo

Equipo perteneciente a un cliente de la misma cuenta.

| Dato | Requerido | Descripción |
|---|---:|---|
| Marca | Sí | Fabricante del dispositivo. |
| Modelo | Sí | Modelo del dispositivo. |
| IMEI o número de serie | No | Identificador técnico disponible. |
| Color | No | Color exterior. |
| Estado físico | Sí | Descripción del estado en el que fue recibido. |
| Cliente propietario | Sí | Cliente al que pertenece el dispositivo. |

La entidad no almacena PIN, patrón ni contraseña del dispositivo.

### Orden de reparación

Registro del ingreso, diagnóstico, trabajo y entrega de un dispositivo.

| Dato | Requerido | Descripción |
|---|---:|---|
| UUID interno | Sí | Identificador interno de la orden. |
| Número visible | Sí | Identificador correlativo y único dentro del taller, con prefijo `ORD-` y un mínimo de seis dígitos. |
| Dispositivo | Sí | Dispositivo al que corresponde la reparación. |
| Falla informada | Sí | Problema comunicado por el cliente. |
| Diagnóstico técnico | No | Resultado del diagnóstico; puede completarse después de crear la orden. |
| Trabajo realizado | No | Descripción del trabajo efectuado; puede completarse después de crear la orden. |
| Estado | Sí | Etapa actual de la reparación. |
| Presupuesto estimado | No | Importe mayor o igual a cero, con hasta dos decimales, expresado en pesos argentinos. |
| Precio final | No | Importe mayor o igual a cero, con hasta dos decimales, expresado en pesos argentinos. |
| Fecha de recepción | Sí | Fecha de ingreso del dispositivo. |
| Fecha estimada | No | Fecha prevista para finalizar o entregar. |
| Fecha de entrega | No | Fecha efectiva de entrega, asignada automáticamente al pasar a `DELIVERED`. |
| Observaciones | No | Información adicional. |

Estados permitidos: `RECEIVED`, `DIAGNOSING`, `WAITING_PARTS`, `REPAIRING`, `READY`, `DELIVERED` y `CANCELLED`.

## 9. Flujos principales

### 9.1 Registro y acceso

1. La persona registra su nombre, correo electrónico, contraseña y nombre del taller.
2. La API crea la cuenta si los datos son válidos.
3. La persona inicia sesión con sus credenciales.
4. La API entrega los tokens necesarios para acceder y renovar la sesión.
5. La persona puede renovar la sesión o cerrarla.

### 9.2 Registro de un ingreso al taller

1. El usuario autenticado registra o selecciona un cliente propio.
2. Registra o selecciona un dispositivo perteneciente a ese cliente.
3. Crea una orden con la falla informada y los datos disponibles al momento de la recepción.
4. La API asigna el UUID interno, el siguiente número visible correlativo del taller y el estado inicial `RECEIVED`.
5. La orden queda disponible para seguimiento dentro de la cuenta.

### 9.3 Seguimiento de una reparación

1. El usuario consulta la orden.
2. Completa o actualiza el diagnóstico, el trabajo, los importes, la fecha estimada u observaciones según corresponda.
3. Solicita un cambio de estado.
4. La API verifica la transición y los datos exigidos para realizarla.
5. Para salir de `DIAGNOSING` hacia `WAITING_PARTS` o `REPAIRING`, la orden debe tener un diagnóstico técnico no vacío.
6. Para pasar de `REPAIRING` a `READY`, la orden debe tener una descripción no vacía del trabajo realizado.
7. Al pasar a `DELIVERED`, la API asigna automáticamente la fecha de entrega y la orden queda en modo de solo lectura.
8. Si la transición o sus condiciones no son válidas, la API rechaza la solicitud y conserva la orden sin cambios.

### 9.4 Consulta de órdenes

1. El usuario solicita un listado paginado.
2. Opcionalmente filtra por estado, cliente, dispositivo o rango de fechas de recepción.
3. La API devuelve solamente órdenes no archivadas que pertenecen a su cuenta y cumplen los filtros, con 20 elementos por defecto y un máximo permitido de 100 por página.
4. El usuario puede consultar explícitamente un registro archivado de su propia cuenta, pero no modificarlo ni restaurarlo.

### 9.5 Archivado

1. El usuario solicita archivar un cliente, dispositivo u orden de su cuenta.
2. La API verifica las restricciones aplicables.
3. Si se cumplen, marca el registro como archivado sin eliminarlo físicamente; el registro queda disponible para consulta explícita y en modo de solo lectura.
4. Si no se cumplen, rechaza la operación sin modificar el registro.

## 10. Requisitos funcionales

- **RF-01. Registro:** La API debe permitir registrar una cuenta mediante nombre, correo electrónico, contraseña y nombre del taller, y debe rechazar solicitudes con datos obligatorios ausentes, inválidos o con un correo ya registrado, comparado sin distinguir mayúsculas de minúsculas.
- **RF-02. Login:** La API debe permitir iniciar sesión con correo electrónico y contraseña válidos, y debe rechazar credenciales inválidas sin conceder acceso.
- **RF-03. Renovación de sesión:** La API debe permitir obtener un nuevo access token mediante un refresh token válido.
- **RF-04. Logout:** La API debe permitir cerrar la sesión de una cuenta autenticada e impedir que el refresh token correspondiente continúe renovando esa sesión.
- **RF-05. Protección:** La API debe rechazar el acceso a rutas protegidas cuando no se presente un JWT válido.
- **RF-06. Aislamiento:** Toda consulta o modificación de clientes, dispositivos y órdenes debe limitarse a los datos de la cuenta autenticada.
- **RF-07. Gestión de clientes:** La API debe permitir crear, consultar, listar, actualizar y archivar clientes de la cuenta autenticada.
- **RF-08. Gestión de dispositivos:** La API debe permitir crear, consultar, listar, actualizar y archivar dispositivos de la cuenta autenticada.
- **RF-09. Asociación de dispositivos:** La API debe permitir asociar un dispositivo únicamente con un cliente perteneciente a la misma cuenta.
- **RF-10. Gestión de órdenes:** La API debe permitir crear, consultar, listar, actualizar y archivar órdenes de la cuenta autenticada, salvo las restricciones de solo lectura aplicables a órdenes finalizadas o archivadas.
- **RF-11. Asociación de órdenes:** La API debe permitir crear una orden únicamente para un dispositivo perteneciente a la misma cuenta.
- **RF-12. Identificación de órdenes:** Al crear una orden, la API debe asignarle un UUID interno y el siguiente número visible correlativo y único dentro del taller, con prefijo `ORD-` y un mínimo de seis dígitos rellenados con ceros.
- **RF-13. Estados:** La API debe aceptar exclusivamente los estados definidos para las órdenes de reparación.
- **RF-14. Estado inicial:** La API debe asignar automáticamente el estado `RECEIVED` a toda orden nueva.
- **RF-15. Datos técnicos iniciales:** La API debe permitir crear una orden sin diagnóstico técnico ni trabajo realizado.
- **RF-16. Cambio de estado:** La API debe permitir solamente las transiciones de estado declaradas en este documento y debe verificar las condiciones requeridas para cada transición.
- **RF-17. Condición de diagnóstico:** La API debe rechazar el cambio de `DIAGNOSING` a `WAITING_PARTS` o `REPAIRING` cuando el diagnóstico técnico esté vacío.
- **RF-18. Condición de trabajo realizado:** La API debe rechazar el cambio de `REPAIRING` a `READY` cuando la descripción del trabajo realizado esté vacía.
- **RF-19. Rechazo atómico:** Ante una transición no permitida o que no cumpla sus condiciones, la API debe rechazar la solicitud sin modificar ningún dato de la orden.
- **RF-20. Importes:** La API debe aceptar presupuesto estimado y precio final como datos opcionales en pesos argentinos, mayores o iguales a cero y con hasta dos decimales.
- **RF-21. Fechas:** La API debe registrar la fecha de recepción, permitir una fecha estimada opcional y asignar automáticamente la fecha de entrega al cambiar la orden a `DELIVERED`.
- **RF-22. Filtros de órdenes:** La API debe permitir filtrar órdenes por estado, cliente, dispositivo y rango de fechas de recepción.
- **RF-23. Paginación:** Los endpoints de listado deben devolver 20 elementos por defecto y aceptar hasta un máximo de 100 elementos por página.
- **RF-24. Exclusión de archivados:** Los listados normales no deben incluir registros archivados.
- **RF-25. Consulta de archivados:** La API debe permitir consultar explícitamente un registro archivado cuando pertenezca a la cuenta autenticada.
- **RF-26. Archivado lógico:** Al archivar un registro, la API debe conservarlo físicamente como parte del historial y dejarlo en modo de solo lectura.
- **RF-27. Restricciones de archivado:** La API debe rechazar el archivado de clientes y dispositivos con reparaciones activas, y el de órdenes cuyo estado no sea `DELIVERED` ni `CANCELLED`; las órdenes históricas no impiden archivar un cliente o dispositivo.
- **RF-28. Órdenes finalizadas:** Las órdenes en estado `DELIVERED` o `CANCELLED` deben ser de solo lectura y admitir únicamente su archivado.
- **RF-29. Sin restauración:** La API no debe ofrecer en el MVP una operación para restaurar registros archivados.
- **RF-30. Datos sensibles del dispositivo:** La API no debe aceptar ni exponer campos destinados a guardar PIN, patrón o contraseña de un dispositivo.
- **RF-31. Documentación:** La API debe exponer documentación Swagger de sus operaciones disponibles.

## 11. Reglas de negocio

- **RN-01. Propiedad de datos:** Cada cliente, dispositivo y orden debe pertenecer a una única cuenta.
- **RN-02. Aislamiento entre cuentas:** Una cuenta nunca puede consultar ni modificar recursos pertenecientes a otra cuenta.
- **RN-03. Unicidad del correo:** El correo electrónico de una cuenta es único globalmente y se compara sin distinguir mayúsculas de minúsculas.
- **RN-04. Relación cliente-dispositivo:** Un cliente puede tener varios dispositivos; cada dispositivo tiene un único cliente propietario.
- **RN-05. Relación dispositivo-orden:** Cada orden corresponde a un único dispositivo.
- **RN-06. Estado inicial:** Toda orden nueva comienza automáticamente en `RECEIVED`.
- **RN-07. Numeración visible:** El número visible de una orden es correlativo y único dentro de cada taller. Usa el prefijo `ORD-` y un mínimo de seis dígitos rellenados con ceros; después de `ORD-999999`, continúa con más dígitos.
- **RN-08. Moneda e importes:** Todos los importes se interpretan como pesos argentinos, deben ser mayores o iguales a cero y admiten hasta dos decimales.
- **RN-09. Datos técnicos iniciales:** El diagnóstico técnico y el trabajo realizado son opcionales al crear una orden.
- **RN-10. Transiciones desde `RECEIVED`:** Solo se permite cambiar a `DIAGNOSING` o `CANCELLED`.
- **RN-11. Transiciones desde `DIAGNOSING`:** Solo se permite cambiar a `WAITING_PARTS`, `REPAIRING` o `CANCELLED`. Para cambiar a `WAITING_PARTS` o `REPAIRING`, debe existir un diagnóstico técnico no vacío.
- **RN-12. Transiciones desde `WAITING_PARTS`:** Solo se permite cambiar a `REPAIRING` o `CANCELLED`.
- **RN-13. Transiciones desde `REPAIRING`:** Solo se permite cambiar a `WAITING_PARTS`, `READY` o `CANCELLED`. Para cambiar a `READY`, debe existir una descripción no vacía del trabajo realizado.
- **RN-14. Transiciones desde `READY`:** Solo se permite cambiar a `DELIVERED` o `REPAIRING`. Al cambiar a `DELIVERED`, la fecha de entrega se asigna automáticamente.
- **RN-15. Estados finales:** `DELIVERED` y `CANCELLED` no admiten transiciones posteriores; sus órdenes son de solo lectura y únicamente pueden archivarse.
- **RN-16. Transiciones no declaradas:** Toda transición no declarada o que no cumpla sus condiciones debe rechazarse sin modificar la orden.
- **RN-17. Reparación activa:** Se considera activa toda orden cuyo estado no sea `DELIVERED` ni `CANCELLED`.
- **RN-18. Archivado de clientes:** Un cliente puede archivarse si no tiene reparaciones activas, aunque tenga órdenes históricas.
- **RN-19. Archivado de dispositivos:** Un dispositivo puede archivarse si no tiene reparaciones activas, aunque tenga órdenes históricas.
- **RN-20. Archivado de órdenes:** Solo pueden archivarse órdenes en estado `DELIVERED` o `CANCELLED`.
- **RN-21. Conservación histórica:** El archivado no elimina físicamente el registro.
- **RN-22. Visibilidad y acceso a archivados:** Los registros archivados quedan excluidos de los listados normales, pero su cuenta propietaria puede consultarlos explícitamente.
- **RN-23. Inmutabilidad de archivados:** Los registros archivados son de solo lectura y no pueden restaurarse en el MVP.
- **RN-24. Filtro temporal:** El filtro por rango de fechas de las órdenes utiliza la fecha de recepción.
- **RN-25. Paginación:** Los listados devuelven 20 elementos por defecto y permiten un máximo de 100 por página.
- **RN-26. Credenciales del dispositivo:** No se almacenan PIN, patrones ni contraseñas de dispositivos.

## 12. Requisitos no funcionales

### Seguridad

- Las contraseñas deben almacenarse hasheadas con bcrypt y nunca exponerse en respuestas.
- Las rutas protegidas deben requerir autenticación mediante JWT.
- La autenticación debe utilizar un access token con una duración aproximada de 15 minutos y un refresh token con una duración aproximada de 7 días.
- El logout debe invalidar el refresh token correspondiente.
- La API debe incorporar Helmet, una política CORS y rate limiting.
- El archivo `.env.example` debe documentar las variables necesarias sin incluir secretos.
- Los errores de autorización no deben revelar datos de otras cuentas.
- La estrategia de rotación de refresh tokens, los orígenes CORS y los valores concretos de rate limiting se definirán en las especificaciones y el plan técnico.

### Tecnología obligatoria

- NestJS 11 y TypeScript.
- Prisma como herramienta de acceso a datos.
- PostgreSQL como base de datos.
- DTOs y validación global de solicitudes.
- Las validaciones exactas de longitud se definirán en las especificaciones y el plan técnico.
- Swagger para documentación de la API.

### Calidad y entrega

- La API debe contar con un despliegue funcional accesible para su evaluación.
- Las respuestas deben representar de forma consistente los éxitos, errores de validación, errores de autenticación, recursos no disponibles y conflictos con reglas de negocio.
- La paginación debe devolver 20 elementos por defecto y limitar cada página a un máximo de 100.
- El historial archivado debe conservarse aunque deje de aparecer en los listados normales.
- El desarrollo debe registrarse mediante commits progresivos con Conventional Commits.

## 13. Historias de usuario

- **HU-01:** Como propietario de un taller, quiero registrar mi cuenta y el nombre de mi taller para comenzar a administrar mis reparaciones.
- **HU-02:** Como propietario de un taller, quiero iniciar, renovar y cerrar mi sesión para acceder de forma segura a la API.
- **HU-03:** Como propietario de un taller, quiero registrar los datos de un cliente para identificar a quién pertenece cada dispositivo.
- **HU-04:** Como propietario de un taller, quiero asociar varios dispositivos con un cliente para conservar su historial de equipos.
- **HU-05:** Como propietario de un taller, quiero registrar el estado físico del dispositivo sin guardar sus credenciales de desbloqueo para documentar la recepción sin almacenar información sensible.
- **HU-06:** Como propietario de un taller, quiero crear una orden en estado `RECEIVED` y obtener un número correlativo visible dentro de mi taller para identificarla fácilmente.
- **HU-07:** Como propietario de un taller, quiero crear una orden aunque todavía no tenga diagnóstico ni trabajo realizado para registrar el ingreso de inmediato y completar la información técnica después.
- **HU-08:** Como propietario de un taller, quiero que los cambios de estado exijan la información técnica correspondiente para que el avance de la reparación sea coherente.
- **HU-09:** Como propietario de un taller, quiero registrar presupuesto, precio y fechas para consultar la información comercial y temporal de la reparación.
- **HU-10:** Como propietario de un taller, quiero filtrar las órdenes, incluido un rango de fechas de recepción, y recorrer resultados paginados para encontrar reparaciones concretas.
- **HU-11:** Como propietario de un taller, quiero archivar registros que ya no están activos y consultarlos explícitamente sin poder modificarlos ni restaurarlos para conservar su historial.
- **HU-12:** Como propietario de un taller, quiero que nadie pueda acceder a la información de mi cuenta para proteger los datos de mi negocio y mis clientes.

## 14. Criterios generales de aceptación

- Una cuenta puede completar registro, login, renovación y logout mediante la API.
- Una solicitud sin autenticación válida no puede acceder a rutas protegidas.
- Dos cuentas con información propia no pueden consultar ni modificar los recursos de la otra.
- Una cuenta puede gestionar clientes, dispositivos y órdenes respetando las relaciones de propiedad.
- El registro rechaza un correo ya utilizado aunque cambie su combinación de mayúsculas y minúsculas.
- Cada orden creada comienza en `RECEIVED` y recibe un UUID interno y el siguiente número visible correlativo del taller, con un mínimo de seis dígitos y capacidad para superar `999999`.
- Una orden puede crearse sin diagnóstico técnico ni trabajo realizado.
- El paso de `DIAGNOSING` a `WAITING_PARTS` o `REPAIRING` se rechaza sin cambios si falta un diagnóstico técnico no vacío.
- El paso de `REPAIRING` a `READY` se rechaza sin cambios si falta una descripción no vacía del trabajo realizado.
- Al pasar a `DELIVERED`, la API asigna automáticamente la fecha de entrega; desde entonces, la orden solo puede consultarse o archivarse.
- Una transición no declarada devuelve un rechazo y deja la orden sin modificaciones.
- Las órdenes pueden filtrarse por cada criterio solicitado; el rango utiliza la fecha de recepción.
- Los listados devuelven 20 elementos por defecto, no permiten más de 100 por página y excluyen registros archivados.
- Los registros archivados permanecen almacenados, pueden ser consultados explícitamente por su cuenta propietaria y no pueden modificarse ni restaurarse.
- El archivado se rechaza cuando incumple alguna restricción del negocio; las órdenes históricas no impiden archivar un cliente o dispositivo si no existen reparaciones activas.
- La API no almacena ni expone PIN, patrón o contraseña de dispositivos.
- Los importes de las órdenes se interpretan como pesos argentinos, aceptan hasta dos decimales y rechazan valores negativos.
- El access token dura aproximadamente 15 minutos y el refresh token aproximadamente 7 días; después del logout, ese refresh token no permite renovar la sesión.
- Swagger describe las operaciones entregadas.
- El despliegue permite ejercer los flujos del MVP.
- El repositorio incluye `.env.example` sin secretos y un historial progresivo de Conventional Commits.

## 15. Riesgos

- **Aislamiento insuficiente de datos:** un error de autorización podría exponer información entre cuentas. Debe verificarse el aislamiento en todas las operaciones, no solo en los listados.
- **Numeración concurrente de órdenes:** la generación de números visibles puede producir duplicados si no se controla cuando se crean órdenes simultáneamente.
- **Manejo monetario:** una representación inadecuada puede introducir errores de precisión o incumplir el límite de dos decimales.
- **Sesiones persistentes:** un logout incompleto podría permitir que un refresh token continúe renovando accesos.
- **Dependencias históricas:** distinguir incorrectamente entre reparaciones activas e históricas puede bloquear archivados válidos o permitir archivados prohibidos.
- **Inmutabilidad incompleta:** permitir actualizaciones en órdenes finalizadas o registros archivados comprometería la integridad del historial.
- **Alcance académico:** omitir documentación, seguridad, validación o despliegue puede impedir la aceptación aunque los flujos del negocio funcionen.

## 16. Preguntas abiertas

1. ¿Qué estrategia de rotación de refresh tokens se utilizará?
2. ¿Qué formatos y límites exactos de longitud se aplicarán a los campos de entrada?
3. ¿Qué orígenes permitirá CORS en cada entorno?
4. ¿Qué valores concretos de rate limiting se aplicarán por entorno y operación?

Estas decisiones se definirán en las especificaciones y el plan técnico.
