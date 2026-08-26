# Plan de implementación: Autenticación

**Rama**: `001-authentication` | **Fecha**: 2026-08-25 |
**Spec**: [spec.md](./spec.md)

**Entrada**: Especificación de autenticación en `specs/001-authentication/spec.md`.

## Resumen

Construir una API REST modular en NestJS 11 para registrar la cuenta propietaria y su taller, iniciar
y renovar sesiones independientes, cerrar la sesión actual y proteger recursos mediante access
tokens. PostgreSQL, gobernado por `schema.prisma` y Prisma Migrate, será la autoridad para la
unicidad y la atomicidad. Las credenciales de renovación se rotarán mediante una actualización
condicional transaccional y solo se conservarán como hashes.

El diseño mantiene una separación deliberada: invalidar una sesión impide renovarla, pero la
estrategia de access tokens no consulta ese estado, de modo que un access token ya emitido continúa
válido hasta su vencimiento conforme a RF-028.

## Contexto técnico

**Lenguaje/versión**: TypeScript estricto sobre Node.js 24 LTS. El entorno local usa Node.js
v24.17.0.

**Dependencias principales**: NestJS 11, `@nestjs/config`, `@nestjs/jwt`,
`@nestjs/passport`, `passport-jwt`, `bcrypt`, `class-validator`,
`class-transformer`, `@nestjs/throttler`, Helmet y Swagger.

Antes de fijar el lockfile se comprobarán los campos `engines` y la compatibilidad efectiva de las
versiones exactas de NestJS, Prisma, Jest y bcrypt con Node.js 24.

**Persistencia**: PostgreSQL con Prisma; `schema.prisma` es la fuente de verdad y Prisma Migrate
administra migraciones versionadas.

**Pruebas**: Jest para unitarias e integración; Supertest para pruebas end-to-end sobre la aplicación
HTTP. Las pruebas de persistencia usan PostgreSQL real aislado.

**Plataforma objetivo**: servicio HTTP desplegable en Linux, una instancia para el MVP académico.

**Tipo de proyecto**: API REST backend de un único proyecto NestJS.

**Objetivos de rendimiento**:

- Las operaciones habituales de autenticación deben responder en menos de 1 segundo en el entorno de
  evaluación, excepto cuando la protección ante intentos repetidos las bloquee.
- La verificación de contraseña con bcrypt costo 12 debe medirse en el entorno de despliegue y
  permanecer dentro de ese presupuesto.
- Cada rotación válida debe producir exactamente una credencial sucesora aun con solicitudes
  concurrentes.

**Restricciones**:

- Access token de aproximadamente 15 minutos y refresh token de aproximadamente 7 días.
- Secretos separados para access y refresh.
- Ningún secreto, contraseña, hash o refresh token persistido puede aparecer en respuestas o logs.
- `ValidationPipe` global con `whitelist`, `forbidNonWhitelisted` y `transform`.
- Arquitectura modular convencional, sin microservicios, CQRS, event sourcing ni repositorios
  genéricos.

**Escala/alcance**: cuentas, talleres y sesiones de autenticación. Quedan excluidos clientes,
dispositivos, órdenes, frontend y demás funcionalidades indicadas por la spec.

## Comprobación de la Constitution

*PUERTA: debe aprobarse antes de investigación y volver a comprobarse después del diseño.*

| Principio | Evidencia del plan | Estado |
|---|---|---|
| I. Desarrollo guiado por especificaciones | El plan deriva de RF-001 a RF-029; contratos y pruebas conservan trazabilidad. | Cumple |
| II. Seguridad y aislamiento | Passport protege `/auth/me`; secretos separados; DTOs públicos; respuestas y logs sanitizados. | Cumple |
| III. Integridad y atomicidad | Registro y rotación usan transacciones; controllers delgados; reglas concentradas en AuthService y componentes específicos. | Cumple |
| IV. Validación y errores seguros | DTOs, ValidationPipe global y filtro uniforme sin detalles internos. | Cumple |
| V. Pruebas y evidencia | Matriz unitaria, integración y E2E cubre autenticación, concurrencia, secretos y aislamiento de sesiones. | Cumple |
| VI. Simplicidad y alcance | Un monolito modular NestJS, sin patrones ni módulos fuera de autenticación. | Cumple |
| VII. Documentación, Git y entrega | Swagger, README, `.env.example`, migraciones y quickstart forman parte de la entrega. | Cumple |
| VIII. Restricciones técnicas | Usa exactamente el stack ratificado y pnpm. | Cumple |

**Resultado previo a Phase 0**: aprobado, sin excepciones.

## Decisiones de diseño

### Estructura modular mínima

- `AppModule` compone configuración, persistencia, seguridad global y módulos funcionales.
- `AuthModule` orquesta registro, login, refresh, logout, emisión/verificación de tokens y
  protección de access token.
- `AccountsModule` encapsula el acceso a la cuenta y su proyección pública; no incorpora CRUD.
- `WorkshopsModule` encapsula el taller y su proyección pública; no incorpora CRUD.
- `PrismaModule` proporciona el único cliente Prisma.
- `CommonModule` contiene exclusivamente filtro de errores, tipos de respuesta y utilidades
  transversales realmente compartidas.

Se descartan módulos por cada endpoint, repositorios genéricos y capas de casos de uso adicionales:
no resuelven una necesidad concreta del alcance.

### Registro y relación cuenta–taller

`Account` y `Workshop` mantienen una relación uno a uno mediante `Workshop.accountId @unique`.
La aplicación exige que toda cuenta tenga taller, aunque el lado inverso sea opcional en el esquema
durante el instante de creación. Una única transacción interactiva crea cuenta, taller, sesión inicial
y credencial de renovación inicial. Cualquier error revierte el conjunto.

El correo se recorta y pasa a minúsculas antes de validarlo y persistirlo. `Account.email` tiene
restricción única; esta restricción, no un pre-check, decide carreras concurrentes. Un conflicto de
unicidad se traduce en `409 EMAIL_ALREADY_REGISTERED`.

### Contraseñas

La contraseña se valida con 12–128 caracteres y no se recorta ni normaliza. Antes de bcrypt se calcula

`base64(HMAC-SHA-384(password UTF-8, PASSWORD_PEPPER))`.

HMAC-SHA-384 procesa la contraseña completa. Su digest de 48 bytes codificado en Base64 produce 64
caracteres ASCII, por debajo del límite de 72 bytes de bcrypt. Ese prehash se entrega a bcrypt costo
**12**, que continúa generando y almacenando su salt individual dentro del hash bcrypt. Se elige costo
12 por ofrecer el mayor margen permitido por la consigna para un sistema de baja escala, manteniendo
un objetivo de respuesta inferior a un segundo que se verificará en deploy. Costos 10 y 11 consumen
menos CPU, pero reducen deliberadamente el costo del ataque; se descartan mientras el benchmark
objetivo cumpla.

`PASSWORD_PEPPER` es un secreto de aplicación independiente, nunca se almacena en PostgreSQL y solo
aparece por nombre/placeholder en `.env.example`. La aplicación falla al arrancar si falta. Cambiarlo
o perderlo impide verificar contraseñas existentes y normalmente obliga a restablecerlas. Contraseña,
prehash, pepper y hash bcrypt quedan excluidos de logs y respuestas.

Las pruebas unitarias pueden aislar el costo, pero integración y E2E deben verificar al menos una vez
que el hash real no coincide con la contraseña, que bcrypt lo valida, que contraseñas UTF-8 de más de
72 bytes usan la entrada completa y que dos contraseñas iguales hasta ese límite pero distintas
después no autentican como equivalentes. También deben probar que el arranque falla sin pepper y que
pepper y prehash nunca aparecen en logs ni respuestas.

### Tokens y sesiones independientes

- Access JWT: secreto `JWT_SECRET`, vigencia `15m`, claims mínimos `sub` (cuenta), `sid`
  (sesión), `typ=access`.
- Refresh JWT: secreto `JWT_REFRESH_SECRET`, vigencia `7d`, claims `sub`, `sid`, `jti` y
  `typ=refresh`.
- Ambos verifican firma, expiración, tipo, algoritmo permitido, issuer y audience.
- `JWT_SECRET` y `JWT_REFRESH_SECRET` deben ser distintos; la validación de entorno impide iniciar
  si faltan o coinciden.
- Passport-JWT extrae únicamente access tokens Bearer. Los refresh tokens se verifican de forma
  explícita con el secreto de refresh y luego contra el estado persistido.

Cada login crea una `Session` independiente y una credencial inicial. La renovación extiende una
ventana deslizante de aproximadamente 7 días; no existe una duración absoluta adicional en el MVP.

### Persistencia segura y rotación

El refresh token bruto solo existe en memoria durante la solicitud y la respuesta. Se persiste un
hash SHA-256 del token completo, suficiente para un valor firmado de alta entropía y adecuado para
búsqueda exacta; bcrypt queda reservado para contraseñas de baja entropía. También se persiste el
`jti` y el historial de credenciales rotadas hasta su expiración para distinguir reutilización real
de una cadena inválida cualquiera.

La rotación ocurre en una transacción corta con aislamiento `Serializable` y reintentos acotados
ante conflictos Prisma `P2034`:

1. Verificar firma, tipo y expiración del refresh JWT.
2. Calcular su hash y localizar `Session` y `RefreshCredential`.
3. Rechazar de forma genérica si la sesión está revocada/vencida o la credencial no corresponde.
4. Si la credencial ya está `ROTATED`, revocar únicamente su sesión con motivo `TOKEN_REUSE`.
5. Si está `ACTIVE`, realizar una actualización condicional por identificador, estado y versión.
6. Solo si una fila fue actualizada, marcar la credencial como `ROTATED`, crear una única sucesora
   `ACTIVE`, incrementar la versión de sesión y actualizar su vencimiento.
7. Si la actualización pierde una carrera, releer: la credencial ya rotada se trata como
   reutilización y revoca únicamente esa sesión.

Dos refresh concurrentes con el mismo token producen como máximo una rotación exitosa. El perdedor
activa detección de reutilización y revoca esa sesión, incluida la credencial recién emitida por el
ganador. Se descarta una ventana de gracia o respuesta idempotente porque debilitaría la regla
aprobada de reutilización y agregaría estado especial.

### Logout y access token residual

`POST /auth/logout` requiere access token y obtiene `sid` de su identidad autenticada. Marca solo
esa sesión como revocada con motivo `LOGOUT`; es idempotente y devuelve `204`.

La estrategia de access token **no consulta el estado de Session**. Por eso, el access token usado
para logout continúa aceptándose hasta `exp`, pero cualquier refresh de esa sesión devuelve
`401`. Consultar Session en cada ruta se descarta porque violaría RF-028.

### Validación, respuestas públicas y errores

Los DTOs aplican las reglas exactas de la spec y normalizan antes de delegar. El servicio repite la
normalización del correo como defensa del invariante. Mappers explícitos producen `AccountPublicDto`,
`WorkshopPublicDto` y `AuthTokensDto`; nunca serializan modelos Prisma directamente.

El filtro global devuelve:

```text
{ statusCode, code, message, path, details? }
```

`details` se limita a errores de validación por campo. Producción no incluye stack trace, consulta,
hash, token ni causa interna.

| Caso | HTTP | Código público |
|---|---:|---|
| Registro válido | 201 | — |
| Login, refresh o `/auth/me` válidos | 200 | — |
| Logout válido o repetido | 204 | — |
| DTO inválido o propiedad extra | 400 | `VALIDATION_ERROR` |
| Correo ya registrado | 409 | `EMAIL_ALREADY_REGISTERED` |
| Login inválido | 401 | `INVALID_CREDENTIALS` |
| Refresh inválido, vencido, rotado o revocado | 401 | `INVALID_REFRESH_TOKEN` |
| Access ausente, inválido o vencido | 401 | `AUTHENTICATION_REQUIRED` |
| Límite excedido | 429 | `RATE_LIMITED` |
| Error no controlado | 500 | `INTERNAL_ERROR` |

Correo inexistente y contraseña incorrecta comparten exactamente status, código y mensaje. El
`429` es distinguible y añade `Retry-After`, sin confirmar si el correo existe.

### Rate limiting

`@nestjs/throttler` se registra como guard global. Las políticas son independientes; una clave
compuesta origen+correo no sustituye ambos límites:

| Política | Tracker | Límite |
|---|---|---:|
| Global | IP/origen | 100 solicitudes por minuto |
| Registro reforzado | IP/origen | 5 solicitudes por hora |
| Registro por identidad | HMAC del correo normalizado | 3 solicitudes por hora |
| Login reforzado | IP/origen | 20 solicitudes cada 15 minutos |
| Login por identidad | HMAC del correo normalizado | 5 solicitudes cada 15 minutos |

Los éxitos y fallos consumen cuota para evitar oráculos laterales. El HMAC usa
`RATE_LIMIT_KEY_SECRET` y evita conservar el correo como clave visible. En despliegue detrás de
proxy, `trust proxy` debe configurarse solo para proxies conocidos antes de usar la IP reenviada.

El almacenamiento en memoria es suficiente para una instancia MVP y se documenta como restricción:
reinicios reinician contadores y un despliegue multiinstancia requeriría un store compartido. Se
descarta incorporarlo ahora porque el alcance exige un deploy funcional, no escalado horizontal.

### Seguridad HTTP y configuración

Helmet se instala antes de rutas; CORS usa una allowlist explícita proveniente de
`CORS_ALLOWED_ORIGINS`. `ConfigModule` es global y valida todas las variables al iniciar.
`ValidationPipe` se registra globalmente con `whitelist: true`,
`forbidNonWhitelisted: true` y `transform: true`. Swagger documenta Bearer auth, DTOs, respuestas
y los cinco endpoints sin convertirse en una fuente alternativa al contrato.

## Contrato HTTP

El contrato detallado está en [contracts/auth-api.md](./contracts/auth-api.md):

- `POST /auth/register`
- `POST /auth/login`
- `POST /auth/refresh`
- `POST /auth/logout`
- `GET /auth/me`

## Estrategia de pruebas y trazabilidad

### Unitarias

- Normalización y límites de DTOs: RF-003, RF-021, RF-023–RF-025.
- HMAC-SHA-384 Base64 con pepper, bcrypt costo 12 y comparación sin truncamiento: RF-005, RF-023.
- Claims, secretos, tipos y expiraciones separados: RF-007, RF-010–RF-011.
- Configuración normal `15m`, diferencia `exp - iat` cercana a 900 segundos y override E2E aislado
  de `1s` para probar expiración sin esperas reales: RF-007, RF-018, RF-028.
- Mappers y filtro de errores sin secretos: RF-020, RF-027.
- Login genérico y clasificación de errores: RF-008, RF-019, RF-029.
- Decisiones de rotación, reutilización y logout: RF-012–RF-017, RF-028.
- Trackers y claves de throttling sin correo visible: RF-009, RF-029.

### Integración con PostgreSQL

- Registro completo y rollback de cuenta, taller, sesión y credencial: RF-001–RF-004, RF-022.
- Dos registros concurrentes del mismo correo normalizado crean como máximo una cuenta: CE-001–002.
- Relación uno a uno y varias sesiones por cuenta: RF-002, RF-016.
- Solo se persisten hash de contraseña y hash de refresh: RF-005, RF-020.
- Rotación produce una sola credencial `ACTIVE`; dos refresh concurrentes revocan solo su sesión:
  RF-012–RF-013, CE-006, CE-010.
- Logout y reutilización no modifican otra sesión: RF-014–RF-017.

### End-to-end con Supertest

- Registro 201, normalización, bordes y respuesta pública: historias 1, CE-001–003, CE-011.
- Login 200; correo inexistente y contraseña incorrecta producen respuesta idéntica 401: historia 2,
  CE-003–004.
- Rate limiting por origen y correo produce 429 seguro: RF-009, RF-029, CE-008, CE-013.
- `/auth/me` rechaza access ausente/inválido/vencido y acepta uno vigente: historia 3, CE-005.
- Refresh rota; token anterior, vencido o revocado devuelve 401: historia 4, CE-006.
- Dos sesiones permanecen independientes; logout devuelve 204 y corta solo refresh actual: historia
  5, CE-010.
- El access token previo al logout o reuse continúa accediendo hasta expirar: RF-028, CE-012.
- Una aplicación E2E aislada usa `JWT_ACCESS_TTL=1s` exclusivamente en la prueba de expiración; la
  configuración normal conserva `15m` y una prueba de claims verifica aproximadamente 900 segundos
  entre `iat` y `exp`.
- Inspección de respuestas y logs detecta cero secretos: CE-007.
- Smoke test compara endpoints/respuestas entregados con Swagger.

Cada prueba debe nombrar o anotar RF/CE cubiertos. La evidencia final incluye `format`, `lint`,
`test`, pruebas de integración, E2E y `build`.

## Migraciones, ejecución local y deploy

- Desarrollo crea migraciones con `prisma migrate dev`; los SQL generados se revisan y versionan.
- CI/deploy aplica únicamente `prisma migrate deploy` antes de iniciar la API.
- `prisma migrate status` verifica divergencias. `prisma db push` queda excluido fuera de
  prototipos descartables.
- PostgreSQL local se ejecuta mediante un servicio documentado; la API y pruebas reciben conexiones
  distintas.
- El deploy inicial usa una única instancia, variables inyectadas por el entorno, migración previa,
  health check de plataforma y Swagger coherente con el código versionado.
- `.env.example` incluye nombres y valores no secretos de ejemplo; el archivo `.env` real no se
  versiona.

## Variables de entorno

| Variable | Uso |
|---|---|
| `NODE_ENV` | Entorno y exposición segura de errores |
| `PORT` | Puerto HTTP |
| `DATABASE_URL` | Conexión PostgreSQL |
| `JWT_SECRET` | Firma/verificación de access tokens |
| `JWT_REFRESH_SECRET` | Firma/verificación de refresh tokens |
| `JWT_ACCESS_TTL` | Valor por defecto `15m` |
| `JWT_REFRESH_TTL` | Valor por defecto `7d` |
| `JWT_ISSUER` | Emisor esperado |
| `JWT_AUDIENCE` | Audiencia esperada |
| `BCRYPT_ROUNDS` | Valor obligatorio `12` |
| `PASSWORD_PEPPER` | Secreto independiente para HMAC-SHA-384 previo a bcrypt |
| `CORS_ALLOWED_ORIGINS` | Allowlist explícita separada por comas |
| `TRUST_PROXY` | Proxies conocidos o desactivado |
| `RATE_LIMIT_KEY_SECRET` | HMAC de trackers de identidad |

Los secretos deben ser diferentes, suficientemente largos y nunca usar los valores ilustrativos de
`.env.example`. `PASSWORD_PEPPER` solo se documenta allí mediante un placeholder sin valor real. El
TTL reducido de `1s` pertenece exclusivamente a la configuración de una aplicación E2E aislada: no
modifica los valores normales ni `.env.example`.

## Estructura del proyecto

### Documentación de esta feature

```text
specs/001-authentication/
├── spec.md
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── auth-api.md
└── checklists/
    └── requirements.md
```

`tasks.md` no se crea durante esta fase.

### Código fuente previsto

```text
prisma/
├── schema.prisma
└── migrations/

src/
├── main.ts                         # bootstrap, Helmet, CORS, ValidationPipe y Swagger
├── app.module.ts                   # composición raíz
├── config/
│   ├── configuration.ts            # valores tipados y defaults no secretos
│   └── env.validation.ts           # validación fail-fast
├── prisma/
│   ├── prisma.module.ts
│   └── prisma.service.ts
├── common/
│   ├── errors/
│   │   ├── api-error.filter.ts
│   │   └── api-error.response.ts
│   └── security/
│       └── auth-throttler.guard.ts
├── accounts/
│   ├── accounts.module.ts
│   ├── accounts.service.ts         # lectura interna y proyección de cuenta
│   └── account-public.mapper.ts
├── workshops/
│   ├── workshops.module.ts
│   ├── workshops.service.ts        # lectura interna y proyección de taller
│   └── workshop-public.mapper.ts
└── auth/
    ├── auth.module.ts
    ├── auth.controller.ts          # cinco rutas; sin reglas de negocio
    ├── auth.service.ts             # orquestación y límites transaccionales
    ├── token.service.ts            # emisión/verificación access y refresh
    ├── password.service.ts         # bcrypt costo 12
    ├── session.service.ts          # rotación, reutilización y logout
    ├── strategies/
    │   └── jwt-access.strategy.ts
    ├── guards/
    │   └── jwt-access.guard.ts
    ├── dto/
    │   ├── register.dto.ts
    │   ├── login.dto.ts
    │   ├── refresh.dto.ts
    │   └── auth-response.dto.ts
    └── mappers/
        └── auth-response.mapper.ts

test/
├── unit/
├── integration/
└── e2e/
```

**Decisión estructural**: un único servicio NestJS modular. Accounts y Workshops existen para
responsabilidades cohesivas y futuras extensiones, pero en esta feature exponen solo lo requerido por
autenticación. No se crea una capa repository genérica porque Prisma ya proporciona el acceso tipado
y no hay otra fuente de datos.

## Comprobación posterior al diseño

| Puerta | Resultado |
|---|---|
| Spec, pruebas y documentación conservan trazabilidad | Aprobada |
| Secrets, hashes y tokens quedan fuera de respuestas/logs | Aprobada |
| Registro y rotación son atómicos | Aprobada |
| Access y refresh usan verificaciones separadas | Aprobada |
| Controllers permanecen delgados | Aprobada |
| Stack coincide con Constitution y consigna | Aprobada |
| No se incorporan funcionalidades fuera de autenticación | Aprobada |

**Resultado posterior a Phase 1**: aprobado, sin violaciones que registrar.

## Seguimiento de complejidad

No existen violaciones de la Constitution. El historial de credenciales de renovación y la
actualización condicional son complejidad necesaria para demostrar detección de reutilización y
atomicidad concurrente; se descartaron alternativas más complejas como bloqueos SQL explícitos,
microservicios o stores distribuidos.
