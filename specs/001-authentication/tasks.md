---
description: "Tareas ordenadas por dependencias para la feature de autenticación"
---

# Tareas: Autenticación

**Entrada**: `docs/PRD.md`, `.specify/memory/constitution.md` y los documentos de `specs/001-authentication/`.

**Alcance**: autenticación y las responsabilidades mínimas de Account, Workshop, Session y RefreshCredential. Quedan fuera clientes, dispositivos y órdenes.

**Trazabilidad**: las tareas indican las historias, RF y CE aplicables. Cada fase declara sus dependencias y termina con una verificación concreta.

## Definición transversal de terminado y evidencia

- Una tarea solo puede marcarse `[x]` después de ejecutar las verificaciones aplicables al cambio.
- Según el alcance, las verificaciones pueden incluir `format`, `lint`, tests específicos,
  `build` o estado de migraciones; una modificación documental o aislada no exige toda la suite.
- Debajo de cada tarea completada se registra una evidencia breve con los comandos ejecutados y su
  resultado.
- Ninguna tarea puede romper verificaciones existentes.

## Formato: `[ID] [P?] [Historia?] Descripción`

- **[P]**: puede realizarse en paralelo porque afecta archivos distintos y no depende de otra tarea incompleta.
- **[US1]**: registrar la cuenta y el taller.
- **[US2]**: iniciar sesión de forma segura.
- **[US3]**: acceder a recursos protegidos.
- **[US4]**: renovar la sesión.
- **[US5]**: cerrar la sesión actual.

## Fase 1: Inicialización y herramientas

**Propósito**: preparar un proyecto NestJS reproducible sin implementar comportamiento de autenticación.

**Dependencia**: ninguna.

- [x] T001 Inicializar NestJS 11 con pnpm para Node.js 24 en `package.json`, `pnpm-lock.yaml`, `nest-cli.json`, `src/main.ts`, `src/app.module.ts` y `tsconfig.json`; verificar que la aplicación mínima compile sin módulos fuera del alcance
  - **Evidencia**: `pnpm install` resolvió el lockfile; `pnpm build` compiló correctamente la aplicación mínima con Nest CLI `11.0.24`, sin controller, service ni test demostrativos.
- [x] T002 Declarar Node.js 24 y la versión de pnpm en `package.json` y `.nvmrc`; verificar que el runtime requerido quede explícito para desarrollo y CI
  - **Evidencia**: `node --version` → `v24.17.0`; `pnpm --version` → `11.22.0`; `package.json` declara `engines.node >=24.0.0`, `engines.pnpm 11.22.0` y `packageManager pnpm@11.22.0`.
- [x] T003 Activar TypeScript estricto en `tsconfig.json` y `tsconfig.build.json`, incluidos `strict`, `noImplicitAny`, `strictNullChecks` y `noUncheckedIndexedAccess`; verificar que una infracción de tipado impida compilar
  - **Evidencia**: `tsc --showConfig` confirmó las cuatro opciones; una comprobación temporal con acceso inseguro a un índice falló como se esperaba con `TS2532`, se eliminó y `pnpm build` volvió a finalizar correctamente.
- [x] T004 [P] Configurar exclusiones de dependencias, compilación, cobertura y secretos locales en `.gitignore`; verificar que `.env`, `node_modules/`, `dist/` y `coverage/` estén ignorados
  - **Evidencia**: `git check-ignore -v .env node_modules/example dist/example coverage/example` confirmó las cuatro exclusiones y se conservó `.atl/`.
- [x] T005 Configurar ESLint y Prettier en `eslint.config.mjs`, `.prettierrc` y `.prettierignore`; verificar reglas estrictas de TypeScript y formato uniforme
  - **Evidencia**: `pnpm format`, `pnpm format:check` y `pnpm lint` finalizaron con código `0`; ESLint usa flat config con reglas TypeScript type-aware.
- [x] T006 Instalar y fijar dependencias de NestJS, Config, JWT, Passport, validación, Prisma, PostgreSQL, bcrypt, throttling, Helmet, Swagger, Jest y Supertest en `package.json` y `pnpm-lock.yaml`; verificar compatibilidad de las versiones exactas con Node.js 24
  - **Evidencia**: `pnpm install` instaló versiones exactas y ejecutó los builds aprobados; `pnpm peers check` no encontró conflictos; Nest CLI `11.0.24`, Prisma `7.10.0`, TypeScript `5.9.3` y Jest CLI `30.1.3` se ejecutaron sobre Node.js `v24.17.0`.
- [x] T007 Crear configuraciones separadas para pruebas unitarias, de integración y E2E en `test/jest-unit.json`, `test/jest-integration.json` y `test/jest-e2e.json`; verificar que sus patrones no se superpongan
  - **Evidencia**: se inspeccionaron patrones exclusivos `test/unit/**/*.spec.ts`, `test/integration/**/*.integration.spec.ts` y `test/e2e/**/*.e2e-spec.ts`; `pnpm test:unit`, `pnpm test:integration` y `pnpm test:e2e` finalizaron con código `0` informando de forma explícita que aún no existen tests.
- [x] T008 Definir scripts `format`, `format:check`, `lint`, `test`, `test:unit`, `test:integration`, `test:e2e`, `test:bench:auth`, `build`, `prisma:generate`, `prisma:migrate:dev`, `prisma:migrate:deploy` y `prisma:migrate:status` en `package.json`; punto de control: verificar una única entrada reproducible por comando
  - **Evidencia**: se verificaron las entradas en `package.json`; `pnpm format:check`, `pnpm lint`, `pnpm build`, `pnpm test`, `pnpm test:integration`, `pnpm test:e2e` y `pnpm test:bench:auth` finalizaron con código `0`.

## Fase 2: Configuración, seguridad global y errores base

**Propósito**: impedir el arranque inseguro y establecer los límites HTTP comunes.

**Dependencia**: Fase 1 completa.

- [x] T009 Definir configuración tipada y valores públicos por defecto en `src/config/configuration.ts`, incluidos `JWT_ACCESS_TTL=15m`, `JWT_REFRESH_TTL=7d`, `BCRYPT_ROUNDS=12`, CORS y proxy explícito; verificar que ningún secreto tenga valor por defecto
  - Evidencia: configuración tipada compilada; unitarias confirman defaults públicos y ausencia de defaults secretos.
- [x] T010 Implementar validación fail-fast en `src/config/env.validation.ts` para runtime, base, issuer, audience, TTL, CORS, proxy y secretos; comparar por pares `JWT_SECRET`, `JWT_REFRESH_SECRET`, `PASSWORD_PEPPER` y `RATE_LIMIT_KEY_SECRET`, exigir que los cuatro sean distintos entre sí y hacer fallar el arranque ante cualquier coincidencia
  - Evidencia: 16 unitarias pasan; arranques aislados terminan con código 1 ante variable ausente y secretos repetidos.
- [x] T011 [P] Documentar todas las variables con placeholders no secretos en `.env.example`; verificar que no contenga pepper, secretos JWT, clave de rate limiting ni credenciales utilizables
  - Evidencia: `.env.example` contiene todas las variables y placeholders deliberadamente inválidos para credenciales y secretos.
- [x] T012 Registrar `ConfigModule` global y la configuración validada en `src/app.module.ts`; verificar que los providers usen `ConfigService` y no lecturas dispersas de `process.env`
  - Evidencia: `ConfigModule` es global; bootstrap consume configuración mediante `ConfigService` y `process.env` queda confinado a `src/config/`.
- [x] T013 Configurar Helmet antes de las rutas, CORS con allowlist, `trust proxy` explícito y `ValidationPipe` con `whitelist`, `forbidNonWhitelisted` y `transform` en `src/main.ts` (RF-021); verificar rechazo de propiedades y orígenes no permitidos
  - Evidencia: bootstrap compilado configura Helmet, allowlist CORS, proxy explícito y las tres opciones estrictas de `ValidationPipe`; validación rechaza CORS permisivo.
- [x] T014 [P] Definir el contrato `{ statusCode, code, message, path, details? }` en `src/common/errors/api-error.response.ts` (RF-004, RF-008, RF-011, RF-019–RF-021, RF-029; CE-004, CE-007, CE-013); verificar que `details` solo represente validación corregible
  - Evidencia: tipos públicos compilados y prueba unitaria confirma `details` únicamente para mensajes corregibles de validación.
- [x] T015 Implementar y registrar el filtro global en `src/common/errors/api-error.filter.ts` y `src/main.ts`; verificar errores uniformes sin stack, consultas, causas ni secretos
  - Evidencia: filtro global registrado; pruebas confirman respuesta 500 genérica sin secreto, stack, consulta ni causa interna.
- [x] T016 Crear pruebas unitarias de configuración y errores en `test/unit/common/config-errors.spec.ts` (RF-019–RF-021, RF-029; CE-007, CE-013); punto de control: verificar fail-fast, formato y sanitización sin PostgreSQL
  - Evidencia: `pnpm format`, `format:check`, `lint`, `test:unit` (16/16) y `build` pasan sin PostgreSQL.

## Fase 3: Prisma, modelos y migración inicial única

**Propósito**: definir el modelo completo antes de producir una única migración de autenticación.

**Dependencia**: Fase 2 completa.

- [x] T017 Inicializar Prisma para PostgreSQL en `prisma/schema.prisma` y `prisma.config.ts`; verificar que `DATABASE_URL` sea la única conexión y que todavía no se genere ninguna migración
  - Evidencia: Prisma 7 valida el schema PostgreSQL y obtiene su única conexión desde `DATABASE_URL` en `prisma.config.ts`.
- [x] T018 Implementar `PrismaService` y exportarlo desde `PrismaModule` en `src/prisma/prisma.service.ts` y `src/prisma/prisma.module.ts`; verificar un único Prisma Client inyectable
  - Evidencia: `PrismaService` extiende el único `PrismaClient`, usa el adaptador PostgreSQL y se exporta globalmente.
- [x] T019 Importar `PrismaModule` en `src/app.module.ts`; verificar que la composición raíz resuelva persistencia sin clientes adicionales
  - Evidencia: `AppModule` importa `PrismaModule`; build y resolución de dependencias completados.
- [x] T020 Definir Account y Workshop con UUID, timestamps, email único normalizado, `passwordHash`, relación uno a uno mediante `Workshop.accountId @unique` y borrado restrictivo en `prisma/schema.prisma` (RF-001–RF-005; US1; CE-001, CE-002)
  - Evidencia: migración inspeccionada contiene UUID, timestamps, email único, relación uno a uno y FK `RESTRICT`.
- [x] T021 Definir Session y RefreshCredential con versión, expiración, revocación, estados `ACTIVE`/`ROTATED`, hash único, sucesora única e índices en `prisma/schema.prisma` (RF-010–RF-017, RF-028; US4, US5; CE-006, CE-010, CE-012); verificar que no exista un campo para el refresh token bruto
  - Evidencia: prueba de integración confirma enums, hash y sucesora únicos, índices y ausencia de columnas para JWT bruto.
- [x] T022 Generar la única migración inicial mediante Prisma Migrate con el nombre `authentication` y revisar el archivo resultante en `prisma/migrations/<timestamp>_authentication/migration.sql`, cuyo timestamp genera Prisma; verificar UUID, claves foráneas, restricciones, índices, enums y borrados sin tablas fuera del alcance
  - Evidencia: `20260827201404_authentication/migration.sql` fue generado por `prisma migrate dev` y crea solo las cuatro tablas aprobadas.
- [x] T023 Crear el entorno PostgreSQL aislado y la prueba de migraciones en `test/integration/setup/postgres.setup.ts` y `test/integration/prisma/migration.integration.spec.ts`; verificar migración desde una base vacía, una segunda ejecución de `prisma migrate deploy` sobre una base actualizada sin cambios ni errores, `migrate status` y ausencia de `prisma db push`
  - Evidencia: prueba contra `taller_auth_test` recrea el schema, aplica deploy dos veces y valida status sin usar `db push`.
- [x] T024 Ejecutar la verificación de `test/integration/prisma/migration.integration.spec.ts` contra `prisma/migrations/<timestamp>_authentication/migration.sql`, donde Prisma Migrate genera el timestamp al crear la migración llamada `authentication`; punto de control: demostrar desde cero y sobre una base actualizada que la única migración crea exactamente Account, Workshop, Session y RefreshCredential y genera Prisma Client desde el mismo schema
  - Evidencia: `test:integration` pasa 2/2; `prisma:generate`, `migrate:status` y deploy idempotente pasan.

## Fase 4: PasswordService y TokenService

**Propósito**: centralizar contraseñas y emisión/verificación separada de tokens.

**Dependencia**: Fase 3 completa.

- [x] T025 Implementar `PasswordService` en `src/auth/password.service.ts` con Base64 de HMAC-SHA-384 sobre la contraseña UTF-8 completa usando `PASSWORD_PEPPER`, seguido de bcrypt costo 12 (RF-005, RF-020, RF-023; US1, US2; CE-007); verificar contraseña sin recorte y entrada bcrypt de 64 caracteres ASCII
  - Evidencia: pruebas confirman prehash Base64 de 64 caracteres, costo 12, espacios intactos y contraseña UTF-8 completa.
- [x] T026 Implementar `TokenService` en `src/auth/token.service.ts` con secretos separados, algoritmo, issuer, audience, `typ`, `sub`, `sid`, refresh `jti`, TTL de 15 minutos y 7 días, y SHA-256 del refresh JWT completo (RF-007, RF-010–RF-011, RF-018, RF-020; US2–US4; CE-003, CE-005–CE-007)
  - Evidencia: pruebas confirman HS384, claims, TTL 900/604800, verificación separada y SHA-256 completo.
- [x] T027 Definir respuestas públicas en `src/auth/dto/auth-response.dto.ts`; verificar que solo incluyan tokens recién emitidos, duraciones y proyecciones públicas
  - Evidencia: DTOs compilados exponen solo Account/Workshop públicos y tokens con duraciones.
- [x] T028 Registrar `PasswordService` y `TokenService` en `src/auth/auth.module.ts`; verificar que reciban solo configuración validada mediante inyección
  - Evidencia: `AuthModule` registra y exporta ambos servicios; reciben `ConfigService` tipado.
- [x] T029 [P] Crear pruebas unitarias de `PasswordService` en `test/unit/auth/password.service.spec.ts` (RF-005, RF-020, RF-023; CE-007); verificar costo 12, HMAC-SHA-384 Base64, UTF-8 mayor a 72 bytes y diferencias posteriores al byte 72
  - Evidencia: pruebas unitarias distinguen contraseñas multibyte mayores a 72 bytes con diferencias posteriores al límite de bcrypt.
- [x] T030 [P] Crear pruebas unitarias de `TokenService` en `test/unit/auth/token.service.spec.ts` (RF-007, RF-010–RF-011, RF-018, RF-020; CE-003, CE-005–CE-007); punto de control: verificar claims, TTL, tipo y rechazo del uso cruzado de secretos
  - Evidencia: pruebas unitarias rechazan cruce de secretos y tipos y validan issuer, audience, claims y expiraciones.

## Fase 5: US1 — Registro con pruebas

**Objetivo**: registrar Account, Workshop, Session y RefreshCredential inicial de forma atómica y devolver solo datos públicos.

**Dependencia**: Fase 4 completa.

**Prueba independiente**: `POST /auth/register` crea exactamente un agregado; variantes concurrentes del mismo email producen como máximo un registro y ninguna respuesta filtra secretos.

- [ ] T031 [P] [US1] Implementar validación en `src/auth/dto/register.dto.ts` (RF-001, RF-004, RF-021, RF-023–RF-025; CE-001, CE-002, CE-011); verificar límites, recortes, email en minúsculas, contraseña intacta y rechazo de extras
- [ ] T032 [P] [US1] Crear `src/accounts/accounts.module.ts` y `src/workshops/workshops.module.ts`, implementar los mappers públicos en `src/accounts/account-public.mapper.ts`, `src/workshops/workshop-public.mapper.ts` y `src/auth/mappers/auth-response.mapper.ts`, exportar los providers necesarios e importar ambos módulos desde `src/auth/auth.module.ts` (RF-020, RF-026–RF-027; CE-007, CE-011); verificar que AuthService pueda usar los mappers sin serializar modelos Prisma
- [ ] T033 [US1] Implementar registro transaccional en `src/auth/auth.service.ts`, creando Account, Workshop, Session y RefreshCredential y traduciendo `P2002` a `EMAIL_ALREADY_REGISTERED` (RF-001–RF-005, RF-022, RF-026–RF-027; CE-001, CE-002, CE-011; depende de T031–T032)
- [ ] T034 [US1] Exponer `POST /auth/register` con status `201` en `src/auth/auth.controller.ts` y registrarlo en `src/auth/auth.module.ts` (RF-001, RF-004, RF-026–RF-027; CE-001, CE-011; depende de T033)
- [ ] T035 [P] [US1] Crear pruebas unitarias de DTOs y mappers en `test/unit/auth/register.spec.ts` (RF-003–RF-005, RF-020–RF-025, RF-027; CE-002, CE-007, CE-011); verificar reglas aisladas y ausencia de campos sensibles
- [ ] T036 [US1] Crear pruebas de integración PostgreSQL con bcrypt real en `test/integration/auth/register.integration.spec.ts` (RF-001–RF-005, RF-022–RF-023; CE-001, CE-002); verificar transacción, rollback, unicidad concurrente, relación Account–Workshop, hash persistido distinto de la contraseña, verificación correcta, UTF-8 mayor a 72 bytes y no equivalencia de contraseñas que difieren después del byte 72
- [ ] T037 [US1] Crear pruebas E2E en `test/e2e/auth/register.e2e-spec.ts` (RF-001–RF-005, RF-020–RF-027; CE-001, CE-002, CE-009, CE-011); punto de control: verificar contrato, validación y que la respuesta pública no incluya campos sensibles, dejando la búsqueda exhaustiva de secretos a la auditoría transversal

## Fase 6: US2 — Login con pruebas

**Objetivo**: autenticar sin revelar si una cuenta existe y crear una Session independiente por login válido.

**Dependencia**: Fase 5 completa.

**Prueba independiente**: credenciales válidas entregan un par nuevo; email inexistente y contraseña incorrecta producen exactamente el mismo error.

- [ ] T038 [US2] Implementar validación en `src/auth/dto/login.dto.ts` (RF-006, RF-008, RF-021, RF-024; CE-003, CE-004); verificar email normalizado, contraseña intacta y rechazo de extras
- [ ] T039 [US2] Implementar login en `src/auth/auth.service.ts` con comparación segura, error genérico y creación atómica de Session y RefreshCredential independientes (RF-006–RF-008, RF-016, RF-020, RF-022; CE-003, CE-004, CE-007)
- [ ] T040 [US2] Exponer `POST /auth/login` con status `200` en `src/auth/auth.controller.ts` (RF-006–RF-008; CE-003, CE-004; depende de T039)
- [ ] T041 [US2] Crear pruebas unitarias de validación y errores en `test/unit/auth/login.spec.ts` (RF-006, RF-008, RF-019, RF-021, RF-024; CE-004); verificar igualdad exacta entre email inexistente y contraseña incorrecta
- [ ] T042 [US2] Crear pruebas de integración PostgreSQL en `test/integration/auth/login.integration.spec.ts` (RF-005–RF-008, RF-016, RF-020, RF-022; CE-003, CE-004, CE-007); verificar persistencia de Session y RefreshCredential independientes y únicamente hashes, sin tokens ni contraseñas brutas
- [ ] T043 [US2] Crear pruebas E2E en `test/e2e/auth/login.e2e-spec.ts` (RF-006–RF-008, RF-016, RF-020, RF-022; CE-003, CE-004, CE-009); punto de control: verificar tokens, sesiones independientes, error genérico y que la respuesta pública no incluya campos sensibles

## Fase 7: US3 — Guard JWT y `/auth/me` con pruebas

**Objetivo**: proteger recursos mediante access JWT sin consultar Session.

**Dependencia**: Fase 6 completa.

**Prueba independiente**: `/auth/me` rechaza tokens ausentes, inválidos o vencidos y devuelve datos públicos con uno vigente.

- [ ] T044 [US3] Implementar `JwtAccessStrategy` en `src/auth/strategies/jwt-access.strategy.ts` con Bearer access token, algoritmo, issuer, audience y `typ=access`, sin consultar Session (RF-018–RF-020, RF-028; CE-005, CE-007, CE-012)
- [ ] T045 [US3] Implementar `JwtAccessGuard` en `src/auth/guards/jwt-access.guard.ts` y registrarlo en `src/auth/auth.module.ts` con `AUTHENTICATION_REQUIRED` genérico (RF-018–RF-019; CE-005; depende de T044)
- [ ] T046 [US3] Agregar `AccountsService` y `WorkshopsService` en `src/accounts/accounts.service.ts` y `src/workshops/workshops.service.ts`, registrarlos y exportarlos desde los módulos ya existentes `src/accounts/accounts.module.ts` y `src/workshops/workshops.module.ts`, y verificar su disponibilidad en `src/auth/auth.module.ts` para `GET /auth/me` (RF-019–RF-020; CE-005, CE-007)
- [ ] T047 [US3] Exponer `GET /auth/me` protegido por `JwtAccessGuard` en `src/auth/auth.controller.ts` (RF-018–RF-020; CE-005, CE-007; depende de T045–T046)
- [ ] T048 [US3] Crear pruebas unitarias de estrategia y guard en `test/unit/auth/jwt-access.spec.ts` (RF-018–RF-020, RF-028; CE-005, CE-012); verificar claims, rechazo genérico y ausencia de consulta a Session
- [ ] T049 [US3] Crear pruebas E2E de `GET /auth/me` en `test/e2e/auth/me.e2e-spec.ts` (RF-018–RF-020, RF-028; CE-005, CE-007, CE-009, CE-012); punto de control: verificar rechazo, acceso válido, expiración aislada y que la respuesta pública no incluya campos sensibles

## Fase 8: US4 — Refresh, rotación, concurrencia y reutilización con pruebas

**Objetivo**: rotar estrictamente cada refresh token y revocar solo su Session ante reutilización.

**Dependencia**: Fase 7 completa.

**Prueba independiente**: un refresh crea una única sucesora; dos solicitudes concurrentes producen como máximo un `200` y solo la Session afectada pierde renovación.

- [ ] T050 [US4] Implementar validación en `src/auth/dto/refresh.dto.ts` (RF-010–RF-011, RF-021; CE-006); verificar body requerido, extras rechazados y token no expuesto
- [ ] T051 [US4] Implementar transacciones Serializable y reintentos acotados de `P2034` en `src/auth/session.service.ts` (RF-012, RF-022; CE-006); verificar ausencia de cambios parciales
- [ ] T052 [US4] Implementar rotación condicional, historial `ROTATED`, sucesora única y expiración en `src/auth/session.service.ts` (RF-010–RF-012, RF-022; CE-006; depende de T051)
- [ ] T053 [US4] Implementar reutilización y resolución del perdedor concurrente en `src/auth/session.service.ts`, revocando solo la Session con `TOKEN_REUSE` (RF-013, RF-017, RF-028; CE-006, CE-010, CE-012; depende de T052)
- [ ] T054 [US4] Orquestar refresh en `src/auth/auth.service.ts` y exponer `POST /auth/refresh` en `src/auth/auth.controller.ts` solo tras el commit (RF-010–RF-013, RF-020, RF-022; CE-006, CE-007; depende de T050 y T053)
- [ ] T055 [US4] Crear pruebas unitarias de decisiones en `test/unit/auth/refresh.spec.ts` (RF-010–RF-013, RF-017, RF-028; CE-006, CE-010, CE-012); verificar reglas aisladas sin atribuir concurrencia a mocks
- [ ] T056 [US4] Crear pruebas PostgreSQL en `test/integration/auth/refresh.integration.spec.ts` (RF-010–RF-013, RF-017, RF-020, RF-022, RF-028; CE-006, CE-010, CE-012); verificar atomicidad Serializable, una sucesora, máximo un ganador y revocación local
- [ ] T057 [US4] Crear pruebas E2E en `test/e2e/auth/refresh.e2e-spec.ts` (RF-010–RF-013, RF-017, RF-020, RF-022, RF-028; CE-006, CE-007, CE-009, CE-010, CE-012); punto de control: verificar contrato, concurrencia observable y que la respuesta pública no incluya campos sensibles

## Fase 9: US5 — Logout con pruebas

**Objetivo**: revocar idempotentemente solo la Session identificada por el access token.

**Dependencia**: Fase 8 completa; `JwtAccessStrategy` y `JwtAccessGuard` existen desde la Fase 7.

**Prueba independiente**: logout repetido devuelve `204`, impide renovar esa Session, conserva sesiones hermanas y mantiene el access token hasta `exp`.

- [ ] T058 [US5] Implementar logout idempotente con `LOGOUT` en `src/auth/session.service.ts` y `src/auth/auth.service.ts` (RF-014–RF-017, RF-022, RF-028; CE-010, CE-012); verificar modificación exclusiva del `sid` autenticado
- [ ] T059 [US5] Exponer `POST /auth/logout` protegido por `JwtAccessGuard` y con status `204` en `src/auth/auth.controller.ts` (RF-014, RF-018–RF-020; CE-005, CE-007; depende de T058)
- [ ] T060 [US5] Crear pruebas unitarias de decisiones de logout en `test/unit/auth/logout.spec.ts` (RF-014–RF-017, RF-022, RF-028; CE-010, CE-012); verificar idempotencia, revocación exclusiva del `sid` y vigencia residual del access token
- [ ] T061 [US5] Crear pruebas PostgreSQL en `test/integration/auth/logout.integration.spec.ts` (RF-014–RF-017, RF-022, RF-028; CE-010, CE-012); verificar idempotencia y sesiones hermanas utilizables
- [ ] T062 [US5] Crear pruebas E2E en `test/e2e/auth/logout.e2e-spec.ts` (RF-014–RF-020, RF-022, RF-028; CE-005, CE-007, CE-009, CE-010, CE-012); punto de control: verificar `204`, refresh rechazado, sesión hermana activa, access token vigente y ausencia de campos sensibles en la respuesta pública

## Fase 10: Rate limiting, Swagger y seguridad transversal

**Propósito**: completar protecciones y documentar exactamente el contrato entregado.

**Dependencia**: Fases 5–9 completas.

- [ ] T063 Implementar `AuthThrottlerGuard` con política global de 100/minuto y claves HMAC del email normalizado en `src/common/security/auth-throttler.guard.ts` (RF-009, RF-020, RF-029; US1, US2; CE-007, CE-008, CE-013); verificar que la clave no revele el email
- [ ] T064 Registrar throttling y límites de registro 5/hora por origen y 3/hora por email, y login 20/15 minutos por origen y 5/15 minutos por email, en `src/app.module.ts` y `src/auth/auth.controller.ts` (RF-009, RF-029; US1, US2; CE-008, CE-013)
- [ ] T065 Configurar Swagger con Bearer auth en `src/main.ts` y anotar `src/auth/dto/register.dto.ts`, `src/auth/dto/login.dto.ts`, `src/auth/dto/refresh.dto.ts`, `src/auth/dto/auth-response.dto.ts` y `src/auth/auth.controller.ts`; verificar los cinco endpoints, respuestas y ejemplos contra `specs/001-authentication/contracts/auth-api.md` sin modelos internos
- [ ] T066 [P] Crear pruebas unitarias del tracker en `test/unit/common/auth-throttler.guard.spec.ts` (RF-009, RF-020, RF-029; CE-007, CE-008, CE-013); verificar políticas y claves sin email visible
- [ ] T067 Crear pruebas E2E de límites y Swagger en `test/e2e/auth/security-swagger.e2e-spec.ts` (RF-009, RF-020, RF-029; CE-007, CE-008, CE-013); verificar `Retry-After`, políticas independientes, ausencia de oráculo y cinco rutas documentadas
- [ ] T068 Auditar respuestas y logs en `test/e2e/auth/no-secrets.e2e-spec.ts` (RF-005, RF-020, RF-027; CE-007); punto de control: verificar ausencia de contraseña, prehash, pepper, hashes, secretos JWT, stack y consultas

## Fase 11: Validación final, README y evidencia

**Propósito**: demostrar que la feature es reproducible, trazable y limitada al alcance.

**Dependencia**: Fases 1–10 completas.

- [ ] T069 Documentar Node.js 24, pnpm, NestJS 11, configuración, PostgreSQL, migraciones, scripts, store de throttling en memoria y pérdida de `PASSWORD_PEPPER` en `README.md`; agregar una tabla para `POST /auth/register`, `POST /auth/login`, `POST /auth/refresh`, `POST /auth/logout` y `GET /auth/me` con autenticación requerida, respuestas exitosas, errores públicos principales y enlace a Swagger, sin publicar secretos
- [ ] T070 Incorporar en `README.md` una tabla de trazabilidad hacia US1–US5, RF-001–RF-029 y CE-001–CE-013 usando estas tareas y pruebas; verificar cobertura completa sin crear `traceability.md` ni `validation.md`
- [ ] T071 Ejecutar desde `package.json` `format:check`, `lint`, `test:unit`, `test:integration`, `test:e2e`, `build` y `prisma:migrate:status`; punto de control local previo al deploy: registrar resultados y verificar migración desde cero, segunda aplicación sin cambios sobre una base actualizada, Swagger, cero secretos y ausencia de clientes, dispositivos u órdenes
- [ ] T072 Realizar el primer deploy verificable de autenticación desde el código versionado, provisionar PostgreSQL gestionado, configurar variables sin exponer secretos, ejecutar `prisma migrate deploy`, desplegar la aplicación, verificar Swagger y ejecutar smoke tests remotos de `POST /auth/register`, `POST /auth/login`, `POST /auth/refresh`, `POST /auth/logout` y `GET /auth/me`; registrar URL e instrucciones reproducibles en `README.md` y aclarar que el deploy se actualizará con las demás features del MVP
- [ ] T073 Medir bcrypt costo 12 y login mediante `test/bench/auth-performance.bench.ts` y el script `test:bench:auth` de `package.json`: medir hash y comparación locales por debajo de un segundo, repetir un smoke benchmark de login contra el deploy de T072 separando razonablemente latencia de red y registrar evidencia en `README.md` sin contraseña, prehash, pepper ni hashes; punto de control final: cerrar la feature únicamente después de completar el deploy, los smoke tests remotos y el benchmark local/remoto

## Dependencias y orden de ejecución

1. Las Fases 1–4 son fundacionales y secuenciales.
2. US1 precede a US2 porque login requiere Account, aunque sus pruebas pueden preparar fixtures.
3. US3 crea `JwtAccessStrategy` y `JwtAccessGuard` antes de `/auth/me` y del logout protegido.
4. US4 depende de Session y RefreshCredential creadas por registro o login.
5. US5 depende del guard de US3 y del comportamiento de Session consolidado en US4.
6. La Fase 10 requiere los cinco endpoints; la Fase 11 requiere implementación y pruebas completas.

## Oportunidades de paralelismo

- Solo las tareas marcadas `[P]` pueden ejecutarse en paralelo dentro de su fase.
- T004 no comparte archivos con TypeScript ni paquetes.
- T011 y T014 afectan artefactos independientes.
- T029 y T030 prueban servicios distintos.
- T031 y T032 preparan validación y mappers independientes.
- T066 y T067 separan unitarias del tracker y E2E transversal una vez completas T063–T065.

## Estrategia de implementación

### MVP primero

1. Completar Fases 1–4.
2. Completar US1 en la Fase 5.
3. Detenerse en T037 y validar registro independientemente.
4. Continuar con US2 y US3 para completar el acceso P1.

### Entrega incremental de un mes

1. **Semana 1**: Fases 1–4.
2. **Semana 2**: US1, US2 y US3.
3. **Semana 3**: US4 y US5.
4. **Semana 4**: rate limiting, Swagger, seguridad transversal, README y validación.

## Validación del formato

Las 73 tareas usan checkbox, ID secuencial, `[P]` solo ante independencia real, etiquetas `[US1]`–`[US5]`, rutas exactas, referencias RF/CE aplicables y resultados verificables.
