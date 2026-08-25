# Especificación de feature: Autenticación

**Feature Branch**: N/A

**Creada**: 2026-08-25

**Estado**: Lista para planificación

**Entrada**: Autenticación de la cuenta propietaria de un taller independiente mediante registro,
inicio de sesión, renovación, cierre de sesión y protección de recursos.

## Clarifications

### Session 2026-08-25

- Q: ¿Qué reglas debe cumplir una contraseña para ser aceptada? → A: Debe tener entre 12 y 128
  caracteres; admite cualquier carácter y no exige combinaciones específicas.
- Q: ¿Qué validaciones exactas deben aplicarse al correo, los nombres y la dirección del taller? →
  A: El correo debe tener formato válido y hasta 254 caracteres, se recorta y normaliza a minúsculas;
  el nombre del propietario admite entre 2 y 100 caracteres, el nombre del taller entre 2 y 120, y
  la dirección entre 5 y 200; estos textos se recortan y no pueden quedar vacíos.
- Q: ¿Qué debe devolver un registro exitoso? → A: Los datos públicos de la cuenta y el taller, junto
  con una credencial de acceso y una credencial de renovación.
- Q: ¿Qué ocurre con la credencial de acceso vigente cuando una sesión se invalida por logout o por
  reutilización de una credencial de renovación? → A: Continúa siendo válida hasta su vencimiento
  aproximado de 15 minutos, pero la sesión ya no puede renovarse.
- Q: ¿Cómo debe aplicarse y comunicarse la protección ante intentos repetidos de login? → A: Debe
  considerar tanto el origen de la solicitud como el correo normalizado y, al activarse, devolver un
  rechazo temporal distinguible de credenciales inválidas sin confirmar si la cuenta existe; los
  umbrales y ventanas quedan para el plan técnico.

## Actores

- **Propietario del taller**: persona que registra una cuenta para administrar un único taller y
  utiliza sus credenciales para acceder a recursos protegidos.
- **Consumidor de la API**: sistema que presenta credenciales o tokens en nombre del propietario y
  recibe las respuestas de autenticación.

## Alcance

- Registrar una cuenta y su único taller asociado.
- Iniciar sesión con correo electrónico y contraseña.
- Entregar credenciales temporales cuando la autenticación sea válida.
- Renovar una sesión mediante una credencial de renovación válida.
- Mantener sesiones independientes en varios dispositivos y cerrar únicamente la sesión actual.
- Rotar la credencial de renovación y proteger cada sesión frente a la reutilización de credenciales
  anteriores.
- Rechazar el acceso a recursos protegidos sin una credencial de acceso válida.
- Limitar intentos repetidos de autenticación.
- Evitar la exposición de contraseñas, hashes, credenciales de renovación almacenadas y secretos.

## Fuera de alcance

- Recuperación de contraseña.
- Verificación de correo electrónico.
- OAuth o inicio de sesión social.
- Roles y permisos.
- Múltiples empleados por taller.
- Frontend.
- Eliminación de cuentas.

## User Scenarios & Testing *(mandatory)*

### Historia de usuario 1 - Registrar la cuenta del taller (Prioridad: P1)

Como propietario, quiero registrar mis datos y los de mi taller para obtener una cuenta independiente
desde la cual administrar el negocio.

**Por qué tiene esta prioridad**: sin una cuenta válida no existe una identidad propietaria ni un
taller sobre el cual autenticar el resto de las operaciones.

**Prueba independiente**: puede verificarse registrando una cuenta con todos los datos obligatorios,
comprobando que queda asociada con un único taller y que ningún secreto aparece en la respuesta ni en
los registros observables.

**Escenarios de aceptación**:

1. **Dado** que el correo no pertenece a otra cuenta, **cuando** el propietario presenta nombre,
   correo, contraseña, nombre del taller y dirección del taller válidos, **entonces** se crea una
   cuenta asociada con un único taller independiente.
2. **Dado** que ya existe una cuenta con un correo, **cuando** se intenta registrar otra usando una
   variante del mismo correo con diferentes mayúsculas o minúsculas, **entonces** el registro se
   rechaza sin crear una segunda cuenta.
3. **Dado** un intento de registro, **cuando** falta un dato obligatorio o un dato no es válido,
   **entonces** se rechaza la solicitud con una respuesta de validación consistente.
4. **Dado** un intento de registro, **cuando** la contraseña tiene menos de 12 o más de 128
   caracteres, **entonces** se rechaza la solicitud; cualquier carácter es admisible dentro de esos
   límites y no se exige una combinación específica.
5. **Dado** un registro cuyos textos contienen espacios exteriores, **cuando** los valores restantes
   cumplen los límites definidos, **entonces** se recortan los espacios, el correo se normaliza a
   minúsculas y se evalúa la solicitud con los valores normalizados.
6. **Dado** un registro cuyo nombre, nombre del taller o dirección queda vacío después del recorte o
   queda fuera de su límite, **cuando** se procesa, **entonces** la solicitud se rechaza sin crear la
   cuenta ni el taller.
7. **Dado** un registro exitoso o fallido, **cuando** se inspeccionan la respuesta y los registros
   generados, **entonces** no aparece la contraseña, su representación protegida ni otro secreto
   interno.
8. **Dado** un registro exitoso, **cuando** se completa la creación, **entonces** se devuelven los
   datos públicos de la cuenta y del taller, una credencial de acceso con duración aproximada de 15
   minutos y una credencial de renovación con duración aproximada de 7 días.

---

### Historia de usuario 2 - Iniciar sesión de forma segura (Prioridad: P1)

Como propietario registrado, quiero iniciar sesión con mi correo y contraseña para acceder de forma
segura a la administración de mi taller.

**Por qué tiene esta prioridad**: es el punto de entrada necesario para utilizar cualquier recurso
protegido del taller.

**Prueba independiente**: puede verificarse autenticando credenciales válidas e inválidas, observando
la entrega de credenciales temporales solo en el primer caso y comparando que los rechazos no revelen
si la cuenta existe.

**Escenarios de aceptación**:

1. **Dado** un propietario registrado, **cuando** presenta un correo y una contraseña válidos,
   **entonces** recibe una credencial de acceso con duración aproximada de 15 minutos y una credencial
   de renovación con duración aproximada de 7 días.
2. **Dado** un correo inexistente, **cuando** se intenta iniciar sesión, **entonces** se devuelve el
   mismo mensaje genérico y la misma categoría de error que ante una contraseña incorrecta.
3. **Dado** un correo existente, **cuando** se presenta una contraseña incorrecta, **entonces** no se
   entregan credenciales ni se revela que la cuenta existe.
4. **Dado** intentos repetidos de autenticación, **cuando** se supera el límite configurado,
   **entonces** se rechazan temporalmente nuevos intentos conforme a una política cuyo valor se
   definirá en el plan técnico.
5. **Dado** que se activó la protección por origen o por correo normalizado, **cuando** se intenta
   iniciar sesión, **entonces** se devuelve un rechazo temporal distinguible de las credenciales
   inválidas y que no confirma si el correo corresponde a una cuenta.

---

### Historia de usuario 3 - Acceder a recursos protegidos (Prioridad: P1)

Como propietario autenticado, quiero usar mi credencial de acceso para que solamente solicitudes con
una credencial de acceso válida y vigente puedan alcanzar los recursos protegidos de mi taller.

**Por qué tiene esta prioridad**: protege los datos de cada taller y establece el límite de acceso
requerido por el producto.

**Prueba independiente**: puede verificarse realizando la misma solicitud protegida sin credencial,
con una credencial inválida o vencida y con una válida; únicamente la última debe superar la
autenticación.

**Escenarios de aceptación**:

1. **Dado** un recurso protegido, **cuando** la solicitud no incluye una credencial de acceso,
   **entonces** el acceso se rechaza sin exponer información del recurso.
2. **Dado** un recurso protegido, **cuando** la solicitud incluye una credencial inválida o vencida,
   **entonces** el acceso se rechaza con una respuesta genérica y segura.
3. **Dado** un recurso protegido, **cuando** la solicitud incluye una credencial de acceso válida,
   **entonces** la identidad de la cuenta queda autenticada para que el recurso aplique su
   autorización.

---

### Historia de usuario 4 - Renovar la sesión (Prioridad: P2)

Como propietario con una sesión renovable, quiero obtener una nueva credencial de acceso sin volver a
ingresar mi contraseña para continuar trabajando dentro del período permitido.

**Por qué tiene esta prioridad**: mantiene la continuidad de una sesión válida una vez resuelto el
acceso inicial.

**Prueba independiente**: puede verificarse presentando credenciales de renovación válidas,
inválidas, vencidas e invalidadas y comprobando que solo una válida permite continuar la sesión.

**Escenarios de aceptación**:

1. **Dado** una credencial de renovación válida, **cuando** se solicita renovar la sesión,
   **entonces** se entrega una nueva credencial de acceso con duración aproximada de 15 minutos.
2. **Dado** una credencial de renovación inválida, vencida o invalidada, **cuando** se solicita
   renovar la sesión, **entonces** la solicitud se rechaza sin entregar credenciales utilizables.
3. **Dado** una renovación válida, **cuando** se procesa la credencial presentada, **entonces** se
   entrega una nueva credencial de renovación y la anterior queda invalidada.
4. **Dado** una credencial de renovación anterior que ya fue reemplazada, **cuando** se intenta
   reutilizar, **entonces** se invalida únicamente la sesión asociada y las demás sesiones activas de
   la cuenta no resultan afectadas.
5. **Dado** una sesión invalidada por reutilización de una credencial anterior, **cuando** se utiliza
   una credencial de acceso de esa sesión que todavía no venció, **entonces** conserva el acceso hasta
   su vencimiento, pero no puede renovarse la sesión.

---

### Historia de usuario 5 - Cerrar sesión (Prioridad: P2)

Como propietario autenticado, quiero cerrar sesión para impedir que una credencial de renovación
invalidada continúe extendiendo el acceso.

**Por qué tiene esta prioridad**: permite terminar voluntariamente la continuidad de acceso después
de haber iniciado una sesión.

**Prueba independiente**: puede verificarse manteniendo dos sesiones independientes, cerrando una de
ellas y comprobando que su credencial ya no renueva el acceso mientras la otra continúa activa.

**Escenarios de aceptación**:

1. **Dado** un propietario con varias sesiones activas, **cuando** solicita cerrar una de ellas,
   **entonces** se invalida únicamente la sesión desde la cual se solicita el logout.
2. **Dado** una credencial de renovación invalidada por logout, **cuando** se intenta renovar la
   sesión con ella, **entonces** la solicitud se rechaza sin entregar nuevas credenciales.
3. **Dado** un logout exitoso o fallido, **cuando** se inspeccionan la respuesta y los registros,
   **entonces** no se expone la credencial de renovación ni otro secreto.
4. **Dado** un propietario con otra sesión activa, **cuando** cierra la sesión actual, **entonces** la
   otra sesión conserva su capacidad de acceso y renovación.
5. **Dado** una sesión cerrada, **cuando** se utiliza una credencial de acceso de esa sesión que
   todavía no venció, **entonces** conserva el acceso hasta su vencimiento aproximado de 15 minutos,
   pero la sesión no puede renovarse.

### Casos límite

- Dos solicitudes intentan registrar simultáneamente variantes en mayúsculas y minúsculas del mismo
  correo; como máximo una cuenta puede crearse.
- El correo de registro o login contiene diferencias de mayúsculas y minúsculas respecto del valor
  original; la comparación de identidad no distingue entre ellas.
- El correo contiene espacios exteriores o mayúsculas; se recorta y normaliza a minúsculas antes de
  validarlo, compararlo o utilizarlo para iniciar sesión.
- El nombre del propietario, nombre del taller o dirección contiene solamente espacios; después del
  recorte debe rechazarse como vacío.
- Cada campo textual está exactamente en sus límites mínimo o máximo; debe aceptarse si los demás
  datos son válidos, y rechazarse cuando quede fuera del límite.
- Una credencial de acceso vence durante el uso; las solicitudes posteriores deben rechazarse hasta
  obtener una credencial válida.
- Una credencial de renovación vence o ya fue invalidada; no puede extender la sesión.
- Una solicitud de autenticación incluye propiedades no declaradas; debe rechazarse mediante la
  validación de entrada.
- Una contraseña tiene exactamente 12 o 128 caracteres; debe aceptarse si los demás datos son
  válidos. Con 11 o 129 caracteres, debe rechazarse.
- Se realizan intentos repetidos desde un mismo origen o contra una misma identidad; debe activarse la
  protección definida sin revelar si el correo corresponde a una cuenta.
- Una cuenta inicia sesión desde varios dispositivos; cada sesión se mantiene de forma independiente.
- Se reutiliza una credencial de renovación ya rotada; solamente se invalida la sesión a la que
  pertenecía y las demás sesiones de la cuenta continúan activas.
- Una sesión se invalida mientras su credencial de acceso sigue vigente; dicha credencial continúa
  autenticando hasta vencer, pero ninguna credencial de renovación de esa sesión permite extenderla.

### Comportamientos de error

- Los datos de registro inválidos producen una respuesta de validación consistente que identifica los
  datos corregibles sin incluir secretos.
- Un correo duplicado rechaza el registro sin crear parcialmente la cuenta o el taller.
- Un login con correo inexistente o contraseña incorrecta produce una respuesta genérica
  indistinguible respecto de la existencia de la cuenta.
- Una credencial ausente, inválida, vencida o invalidada produce un rechazo con el código HTTP
  apropiado y sin detalles internos.
- La superación del límite de intentos produce un rechazo temporal consistente sin confirmar la
  existencia de una cuenta. Este rechazo debe poder distinguirse del rechazo por credenciales
  inválidas para indicar que el intento puede repetirse más adelante.
- Ningún error expone contraseñas, hashes, credenciales de renovación almacenadas, stack traces,
  consultas de datos ni secretos internos.

## Requirements *(mandatory)*

### Requisitos funcionales

- **RF-001**: El sistema DEBE permitir registrar una cuenta mediante nombre del propietario, correo
  electrónico, contraseña, nombre del taller y dirección del taller.
- **RF-002**: Cada cuenta registrada DEBE representar y quedar asociada con un único taller
  independiente.
- **RF-003**: El sistema DEBE tratar el correo electrónico como identificador globalmente único sin
  distinguir mayúsculas de minúsculas.
- **RF-004**: El sistema DEBE rechazar el registro si falta un dato obligatorio, algún dato no es
  válido o el correo ya pertenece a una cuenta.
- **RF-005**: La contraseña NO DEBE devolverse, registrarse ni conservarse en texto plano.
- **RF-006**: El sistema DEBE permitir iniciar sesión mediante correo electrónico y contraseña.
- **RF-007**: Las credenciales válidas DEBEN entregar una credencial de acceso con duración aproximada
  de 15 minutos y una credencial de renovación con duración aproximada de 7 días.
- **RF-008**: Las credenciales inválidas DEBEN producir una respuesta genérica que no permita
  determinar si una cuenta existe.
- **RF-009**: El sistema DEBE limitar los intentos repetidos de autenticación; el valor concreto del
  límite y su ventana se definirán en el plan técnico. La protección DEBE considerar tanto el origen
  de la solicitud como el correo normalizado.
- **RF-010**: El sistema DEBE permitir renovar una sesión mediante una credencial de renovación
  válida.
- **RF-011**: Una credencial de renovación inválida, vencida o invalidada NO DEBE permitir obtener
  nuevas credenciales utilizables.
- **RF-012**: Cada renovación válida DEBE entregar una nueva credencial de renovación e invalidar la
  credencial presentada.
- **RF-013**: Si se intenta reutilizar una credencial de renovación anterior ya rotada, el sistema
  DEBE invalidar únicamente la sesión asociada; las demás sesiones activas de la cuenta NO DEBEN
  resultar afectadas.
- **RF-014**: El sistema DEBE permitir el cierre de sesión e invalidar únicamente la sesión desde la
  cual se solicita.
- **RF-015**: Una credencial de renovación invalidada mediante logout NO DEBE permitir renovar la
  sesión.
- **RF-016**: Una cuenta DEBE poder mantener varias sesiones simultáneas e independientes.
- **RF-017**: Las acciones de renovación, reutilización y logout sobre una sesión NO DEBEN invalidar
  otras sesiones de la misma cuenta.
- **RF-018**: Todo recurso protegido DEBE rechazar solicitudes que no presenten una credencial de
  acceso válida y vigente.
- **RF-019**: Un rechazo de autenticación NO DEBE revelar información del recurso protegido ni datos
  que permitan inferir la existencia de recursos o cuentas.
- **RF-020**: Ninguna respuesta ni registro de la aplicación DEBE exponer contraseñas, hashes,
  credenciales de renovación almacenadas u otros secretos internos.
- **RF-021**: Toda entrada de autenticación DEBE validarse y las propiedades no declaradas DEBEN
  rechazarse.
- **RF-022**: Las operaciones de registro, renovación y logout DEBEN rechazarse sin producir cambios
  parciales cuando no puedan completarse válidamente.
- **RF-023**: La contraseña de registro DEBE contener entre 12 y 128 caracteres inclusive, puede
  contener cualquier carácter y NO DEBE exigir una combinación específica de tipos de caracteres.
- **RF-024**: El correo electrónico DEBE tener un formato válido y un máximo de 254 caracteres; el
  sistema DEBE recortar sus espacios exteriores y normalizarlo a minúsculas antes de validarlo,
  compararlo o utilizarlo para autenticación.
- **RF-025**: El nombre del propietario DEBE contener entre 2 y 100 caracteres, el nombre del taller
  entre 2 y 120, y la dirección del taller entre 5 y 200, después de recortar espacios exteriores.
  Ninguno de estos valores DEBE quedar vacío.
- **RF-026**: Un registro exitoso DEBE devolver los datos públicos de la cuenta y del taller, una
  credencial de acceso con duración aproximada de 15 minutos y una credencial de renovación con
  duración aproximada de 7 días.
- **RF-027**: La respuesta de registro NO DEBE incluir la contraseña, su representación protegida ni
  secretos internos.
- **RF-028**: Cuando una sesión se invalida por logout o por reutilización de una credencial de
  renovación, su credencial de acceso vigente DEBE conservar validez hasta su vencimiento, pero la
  sesión NO DEBE poder renovarse.
- **RF-029**: La activación de la protección ante intentos repetidos de login DEBE producir un rechazo
  temporal distinguible del rechazo por credenciales inválidas y NO DEBE confirmar si el correo
  corresponde a una cuenta.

### Entidades clave

- **Cuenta**: representa al propietario autenticable y su vínculo exclusivo con un taller. Incluye el
  nombre del propietario de 2 a 100 caracteres y un correo normalizado de identidad globalmente
  único, con formato válido y hasta 254 caracteres.
- **Taller**: representa el negocio independiente administrado por una única cuenta. Para esta
  feature se consideran su nombre de 2 a 120 caracteres y su dirección de 5 a 200 caracteres.
- **Sesión**: representa la continuidad de acceso independiente concedida después de autenticar
  credenciales. Una cuenta puede mantener varias sesiones, cada una con capacidad propia de
  renovación e invalidación.
- **Credencial de acceso**: prueba temporal utilizada para autenticar solicitudes a recursos
  protegidos, con una duración aproximada de 15 minutos.
- **Credencial de renovación**: prueba temporal que permite extender una sesión durante
  aproximadamente 7 días mientras sea válida y no haya sido invalidada.

## Criterios de éxito *(mandatory)*

### Resultados medibles

- **CE-001**: El 100 % de los registros válidos crea exactamente una cuenta asociada con exactamente
  un taller, y ningún registro rechazado deja una creación parcial.
- **CE-002**: El 100 % de los intentos de registrar correos equivalentes con distintas mayúsculas o
  minúsculas evita la creación de cuentas duplicadas, incluso ante intentos simultáneos.
- **CE-003**: El 100 % de los logins válidos entrega ambas credenciales con las duraciones
  aproximadas definidas; el 100 % de los logins inválidos no entrega ninguna.
- **CE-004**: Las respuestas ante correo inexistente y contraseña incorrecta son indistinguibles en
  mensaje y categoría de error en todos los escenarios de aceptación.
- **CE-005**: El 100 % de las solicitudes protegidas sin una credencial de acceso válida se rechaza
  sin revelar información del recurso solicitado.
- **CE-006**: El 100 % de las credenciales de renovación vencidas o invalidadas se rechaza y no
  produce credenciales utilizables.
- **CE-007**: En una revisión automatizada de respuestas y registros de todos los escenarios de
  autenticación, se detectan cero contraseñas, hashes, credenciales de renovación almacenadas o
  secretos internos.
- **CE-008**: El 100 % de los intentos que superen el umbral de autenticación configurado recibe la
  protección esperada, sin revelar si la cuenta existe.
- **CE-009**: Todas las historias prioritarias cuentan con al menos un escenario automatizado que
  demuestre su resultado observable antes de considerar la feature completada.
- **CE-010**: En el 100 % de las pruebas con dos o más sesiones, renovar, cerrar o detectar la
  reutilización de una credencial en una sesión no invalida las demás sesiones de la cuenta.
- **CE-011**: El 100 % de los registros exitosos devuelve los datos públicos creados y ambas
  credenciales temporales sin exponer contraseñas, representaciones protegidas ni secretos internos.
- **CE-012**: El 100 % de las credenciales de acceso aún vigentes conserva acceso después de
  invalidarse su sesión y deja de hacerlo al vencer; ninguna de esas sesiones puede renovarse.
- **CE-013**: El 100 % de los rechazos por protección ante intentos repetidos es distinguible de las
  credenciales inválidas y no permite inferir si el correo corresponde a una cuenta.

## Supuestos

- El propietario utiliza una dirección de correo electrónico a la que tiene acceso, aunque su
  verificación está fuera de alcance.
- Nombre y dirección del taller son datos descriptivos obligatorios para esta feature.
- Las duraciones de aproximadamente 15 minutos y 7 días admiten la tolerancia necesaria para medir
  tiempos de emisión y vencimiento.
- El valor y la ventana exactos de protección ante intentos repetidos se decidirán en el plan técnico
  sin alterar el requisito de protección.
- La protección del recurso autentica la identidad de la cuenta; la autorización y el aislamiento
  específicos de cada recurso se especifican en sus respectivas features y deben cumplir la
  Constitution.

## Dependencias conceptuales

- Definición de una cuenta propietaria y su relación uno a uno con un taller independiente.
- Disponibilidad de un mecanismo para representar credenciales de acceso y renovación con vigencia
  e invalidación observables.
- Capacidad transversal para validar entradas, producir errores consistentes y aplicar protección
  frente a intentos repetidos.
- Capacidad para distinguir sesiones independientes de una misma cuenta y aplicar renovación,
  invalidación y detección de reutilización a la sesión correspondiente.
