# Investigación técnica: Autenticación

**Fecha**: 2026-08-25

## Fuentes consultadas mediante Context7

| Tema | Biblioteca Context7 | Fuente principal |
|---|---|---|
| Runtime Node.js | Verificación local y fuente oficial | [Node.js 24 LTS](https://nodejs.org/en/blog/migrations/v22-to-v24) |
| NestJS 11 y validación | `/nestjs/nest/v11.1.16`, `/nestjs/docs.nestjs.com` | [NestJS](https://github.com/nestjs/nest), [documentación NestJS](https://docs.nestjs.com/) |
| JWT para NestJS | `/nestjs/jwt` | [nestjs/jwt](https://github.com/nestjs/jwt) |
| Passport JWT | `/mikenicholson/passport-jwt` | [passport-jwt](https://github.com/mikenicholson/passport-jwt) |
| Prisma ORM y PostgreSQL | `/prisma/web` | [documentación Prisma](https://www.prisma.io/docs/orm) |
| Rate limiting | `/nestjs/throttler` | [nestjs/throttler](https://github.com/nestjs/throttler) |
| Bcrypt para Node.js | `/kelektiv/node.bcrypt.js` | [node.bcrypt.js](https://github.com/kelektiv/node.bcrypt.js) |

Context7 confirmó las APIs actuales usadas en estas decisiones. En las consultas acotadas no devolvió
un ejemplo completo y versionado de bootstrap de Swagger ni de CORS para NestJS 11; el plan conserva
solo las capacidades estables documentadas (`SwaggerModule` y `enableCors`) y evita inventar firmas
concretas. La forma final deberá verificarse nuevamente contra las versiones fijadas en el lockfile
durante la implementación.

## Decisiones

### 0. Runtime Node.js 24 LTS

**Decisión**: usar Node.js 24 LTS con TypeScript estricto. El entorno local verificado ejecuta
Node.js v24.17.0.

**Justificación**: Node.js 24 pertenece a la línea LTS y coincide con el entorno real del proyecto.
Antes de fijar el lockfile se comprobarán los campos `engines` y la compatibilidad de las versiones
exactas de NestJS, Prisma, Jest y bcrypt.

**Alternativas descartadas**:

- Una versión Node sin soporte LTS: reduce estabilidad para deploy.
- Adoptar una versión más nueva sin comprobar Jest, Prisma y el proveedor de deploy: riesgo
  innecesario para el MVP.

### 1. Arquitectura modular convencional

**Decisión**: usar un único servicio NestJS con `AuthModule`, `AccountsModule`,
`WorkshopsModule`, `PrismaModule` y componentes comunes mínimos.

**Justificación**: coincide con la organización modular de NestJS y mantiene controllers delgados sin
agregar capas que no aportan al alcance.

**Alternativas descartadas**:

- Microservicios: no existe un límite operativo ni de despliegue que los justifique.
- CQRS/event sourcing: aumentan la cantidad de componentes sin mejorar este flujo transaccional.
- Repositorio genérico: duplica la abstracción tipada de Prisma.

### 2. Configuración validada al iniciar

**Decisión**: `ConfigModule.forRoot({ isGlobal: true, validate })`, registros asíncronos que inyectan
`ConfigService` y fallo inmediato ante variables ausentes, inválidas o secretos coincidentes.

**Justificación**: evita que una instancia arranque parcialmente configurada y permite separar
secretos y vencimientos.

**Alternativas descartadas**:

- Leer `process.env` directamente en cada componente: dispersa validación y defaults.
- Usar un único secreto JWT: viola la consigna y permitiría confundir clases de token.

### 3. Validación global

**Decisión**: un único `ValidationPipe` global con `whitelist: true`,
`forbidNonWhitelisted: true` y `transform: true`.

**Justificación**: las opciones están presentes en la interfaz vigente de NestJS y materializan
RF-021 y la Constitution.

**Alternativas descartadas**:

- Pipes repetidos por controller: facilitan omisiones.
- Eliminar silenciosamente propiedades extra: contradice el rechazo exigido.

### 4. Bcrypt costo 12

**Decisión**: hashear contraseñas con bcrypt y costo 12.

**Justificación**: es el extremo más resistente dentro del rango académico 10–12 y el volumen del MVP
es bajo. Se impone un benchmark en el entorno objetivo para verificar una respuesta inferior a un
segundo.

**Alternativas descartadas**:

- Costos 10 u 11: más rápidos, pero reducen el costo del ataque sin una necesidad demostrada.
- Otro algoritmo: la Constitution y la consigna obligan bcrypt.

### 4.1. Prehash para evitar truncamiento de bcrypt

**Decisión**: calcular
`base64(HMAC-SHA-384(password UTF-8, PASSWORD_PEPPER))` y entregar los 64 caracteres ASCII resultantes
a bcrypt costo 12. La comparación repite exactamente el mismo proceso; la contraseña no se recorta
ni normaliza. Bcrypt continúa generando un salt individual para cada hash.

**Justificación**: la documentación oficial de node.bcrypt.js consultada mediante Context7 advierte
que bcrypt solo utiliza los primeros 72 bytes, no caracteres. La spec permite hasta 128 caracteres y
admite UTF-8 multibyte. HMAC-SHA-384 procesa la contraseña completa; su digest de 48 bytes se codifica
en Base64 como 64 caracteres ASCII, por debajo del límite de bcrypt. El pepper añade un secreto de
aplicación independiente del salt individual de bcrypt.

`PASSWORD_PEPPER` nunca se almacena en PostgreSQL, se documenta en `.env.example` solo mediante un
nombre/placeholder sin valor real y es obligatorio al arrancar. Cambiarlo o perderlo impide verificar
contraseñas existentes y normalmente requiere restablecerlas. Contraseña, prehash, pepper y hash
bcrypt nunca se registran ni se incluyen en respuestas.

**Alternativas descartadas**:

- Limitar la contraseña a 72 bytes: contradice el máximo de 128 caracteres aprobado.
- Aplicar bcrypt directamente: truncamiento silencioso y pruebas incorrectas para contraseñas largas.
- SHA-256 simple sin clave: evita truncamiento, pero no aporta el secreto de aplicación requerido por
  la estrategia corregida.
- Sustituir bcrypt: viola las restricciones académicas.

### 5. Relación uno a uno con clave foránea única

**Decisión**: `Workshop.accountId` es requerido y único; el registro crea cuenta y taller en una
transacción.

**Justificación**: Prisma documenta que una relación uno a uno requiere unicidad en la clave foránea.
La transacción mantiene el invariante de negocio de que toda cuenta registrada tiene taller.

**Alternativas descartadas**:

- Guardar `workshopId` en Account: también es válido, pero hace menos natural crear el agregado desde
  su propietario.
- Confiar solo en validación de servicio: no protege concurrencia.

### 6. Correo canónico y unicidad en PostgreSQL

**Decisión**: persistir el correo ya recortado y en minúsculas con `@unique`; tratar `P2002` como
`409 EMAIL_ALREADY_REGISTERED`.

**Justificación**: la restricción de base de datos es la única autoridad segura frente a dos
registros concurrentes. Un pre-check puede mejorar el flujo, pero no garantiza unicidad.

**Alternativas descartadas**:

- Comparaciones case-insensitive sin índice único: permiten carreras.
- Conservar dos campos de correo: la spec no necesita preservar otra representación.

### 7. Registro atómico

**Decisión**: crear Account, Workshop, Session y primera RefreshCredential dentro de una transacción
interactiva.

**Justificación**: cualquier error debe revertir la operación completa conforme a RF-022.

**Alternativas descartadas**:

- Cuatro escrituras independientes: pueden dejar cuenta sin taller o sin sesión.
- Compensaciones posteriores: más complejas que una transacción local.

### 8. Tokens separados

**Decisión**: emitir y verificar mediante `JwtService.signAsync`/`verifyAsync`, pasando opciones
explícitas para access y refresh; Passport-JWT valida solo access Bearer con expiración activa,
algoritmo permitido, issuer y audience.

**Justificación**: Context7 confirma las APIs asíncronas de `@nestjs/jwt` y que
`ExtractJwt.fromAuthHeaderAsBearerToken()` es el extractor actual compatible con Bearer. Separar
tipo, secreto y verificación evita aceptar un refresh como access.

**Alternativas descartadas**:

- Un `JwtModule` con un secreto por defecto para ambos tokens: facilita verificaciones cruzadas.
- Passport para refresh: oculta el estado persistente y la rotación que el dominio debe validar.

### 9. Hash de refresh tokens

**Decisión**: persistir SHA-256 del refresh token completo y nunca el token bruto.

**Justificación**: un JWT firmado tiene alta entropía; un hash determinista permite búsqueda y
comparación exacta sin el costo de bcrypt. El token bruto permanece solo en memoria.

**Alternativas descartadas**:

- Texto plano: viola spec y Constitution.
- Bcrypt: es adecuado para contraseñas de baja entropía, pero impide búsqueda directa y agrega costo
  innecesario para tokens aleatorios.
- Guardar solo el `jti`: no demuestra posesión del token exacto.

### 10. Historial de rotación

**Decisión**: conservar RefreshCredential con estados `ACTIVE` y `ROTATED`, hash,
`jti`, vencimiento y vínculo a sucesora.

**Justificación**: guardar únicamente el hash vigente no distingue un token realmente reutilizado de
un token arbitrario inválido. El historial permite detectar reutilización y revocar solo su sesión.

**Alternativas descartadas**:

- Hash actual únicamente: detección incompleta.
- Hash actual y anterior: no detecta reutilización de generaciones más antiguas.

### 11. Rotación concurrente con actualización condicional

**Decisión**: usar transacción `Serializable`, actualización condicional por estado/versión y
reintentos acotados para `P2034`.

**Justificación**: Prisma documenta transacciones interactivas, aislamiento `Serializable` y retry
de conflictos `P2034`. La comparación y actualización condicional garantizan un solo sucesor.

Esta es una decisión **estricta**: ante dos refresh concurrentes con la misma credencial, como máximo
uno devuelve `200`; el segundo uso se considera reutilización, revoca esa sesión y deja activas las
demás sesiones de la cuenta. Se prioriza detectar reutilización sobre tolerar dobles envíos del
cliente o reintentos de red.

**Alternativas descartadas**:

- Lectura seguida de update sin condición: dos solicitudes pueden ganar.
- Bloqueos SQL explícitos: acoplan el servicio a SQL crudo sin necesidad.
- Ventana de gracia: contradice la decisión de tratar reutilización como compromiso.

### 12. Reutilización revoca una sola sesión

**Decisión**: encontrar la sesión por la credencial rotada, marcarla revocada y dejar intactas todas
las demás sesiones de la cuenta.

**Justificación**: es el comportamiento explícito de RF-013 y CE-010.

**Alternativas descartadas**:

- Revocar toda la cuenta: contradice sesiones independientes.
- Rechazar sin revocar: no responde al indicio de compromiso.

### 13. Logout mediante access token

**Decisión**: `POST /auth/logout` usa el access token para obtener `sid`, revoca esa Session y es
idempotente.

**Justificación**: identifica inequívocamente la sesión actual y no exige devolver el refresh token al
servidor.

**Alternativas descartadas**:

- Logout con refresh token: aumenta la exposición del secreto y falla si el cliente ya lo perdió.
- Logout global: contradice RF-014 y RF-017.

### 14. Access token válido hasta expirar

**Decisión**: JwtAccessStrategy no consulta Session; solo verifica el access JWT y su cuenta.

**Justificación**: consultar revocación invalidaría inmediatamente el token y violaría RF-028.

**Alternativas descartadas**:

- Denylist de access tokens: agrega estado y contradice la vigencia residual aprobada.
- Consultar sesión en cada solicitud: cambia el comportamiento observable.

### 15. Rate limiting por políticas independientes

**Decisión**: guard global por IP y políticas nombradas reforzadas por IP y HMAC del correo
normalizado para registro/login.

**Justificación**: Context7 confirma `APP_GUARD`, throttlers nombrados y overrides por objeto con
`getTracker`/`generateKey`. Dos políticas separadas son necesarias: una clave IP+correo permitiría
eludir el límite alternando cualquiera de los dos valores.

**Alternativas descartadas**:

- Solo IP: distribuido contra una misma cuenta lo evade.
- Solo correo: permite atacar muchas cuentas desde un origen.
- Confiar ciegamente en `X-Forwarded-For`: permite spoofing; `trust proxy` debe ser explícito.

### 16. Límites elegidos

**Decisión**:

- Global: 100/minuto por origen.
- Registro: 5/hora por origen y 3/hora por correo normalizado.
- Login: 20/15 minutos por origen y 5/15 minutos por correo normalizado.

**Justificación**: son límites simples, verificables y reforzados para endpoints que realizan bcrypt
o crean estado. El `429` incluye `Retry-After` y no confirma existencia de cuenta.

**Alternativas descartadas**:

- Un único límite global: no protege adecuadamente login/registro.
- Bloqueo permanente: perjudica recuperación y habilita denegación de servicio.

### 17. Store de throttling

**Decisión**: almacenamiento en memoria para una instancia MVP, documentando que reinicios reinician
cuotas y que múltiples réplicas requieren store compartido.

**Justificación**: es la opción más simple que satisface el deploy académico de una instancia.

**Alternativas descartadas**:

- Redis desde el MVP: dependencia operativa no requerida.
- Persistir cada intento en PostgreSQL: carga y complejidad innecesarias para rate limiting.

### 18. Contrato y respuestas públicas

**Decisión**: cinco endpoints REST y mappers explícitos que producen DTOs públicos. Error uniforme
`{ statusCode, code, message, path, details? }`.

**Justificación**: evita serializar modelos persistentes y hace comprobables los errores seguros.

**Alternativas descartadas**:

- Retornar modelos Prisma: puede filtrar campos nuevos accidentalmente.
- Mensajes internos sin código estable: dificultan clientes y pruebas.

### 19. Seguridad del bootstrap

**Decisión**: Helmet antes de rutas, CORS con allowlist validada, Swagger con Bearer auth y
ValidationPipe global.

**Justificación**: sigue la guía actual de NestJS y las restricciones académicas.

**Alternativas descartadas**:

- CORS permisivo: contradice configuración explícita.
- Swagger manual separado del código: puede divergir del API entregado.

### 20. Prisma Migrate

**Decisión**: `prisma migrate dev` en desarrollo, `prisma migrate deploy` en CI/deploy y
`prisma migrate status` como verificación. No usar `db push` para entornos persistentes.

**Justificación**: coincide con la documentación actual de Prisma. En PostgreSQL, Prisma Migrate no
envuelve automáticamente cada migración completa en una transacción; las migraciones generadas deben
revisarse y pueden incorporar `BEGIN/COMMIT` cuando la operación lo requiera.

**Alternativas descartadas**:

- `db push`: no genera historial de migración revisable.
- Crear tablas manualmente: rompe a `schema.prisma` como fuente de verdad.

### 21. Estrategia de pruebas

**Decisión**: Jest unitario, Jest+PostgreSQL real para integración y Supertest para E2E; cada prueba
referencia RF/CE.

**Justificación**: separa reglas rápidas, garantías persistentes y contrato observable. La
concurrencia y unicidad no pueden probarse con mocks.

**Alternativas descartadas**:

- Solo E2E: diagnóstico lento y cobertura de ramas pobre.
- Solo mocks de Prisma: no demuestra transacciones, índices ni carreras.
