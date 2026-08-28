# Mobile Repair Shop API

NestJS API for an independent mobile-phone repair shop. Each registered account owns one workshop and manages its clients, their devices, and repair work orders in an isolated data boundary. The MVP includes JWT authentication, refresh-token rotation, controlled work-order transitions, pagination, filtering, and logical archiving.

Swagger is available at **`http://localhost:3000/api/docs`** while the application is running.

## Requirements and stack

- Node.js 24 or later
- pnpm 11.22.0
- PostgreSQL
- NestJS 11 and strict TypeScript
- Prisma 7
- Jest, Supertest, class-validator, Passport JWT, Swagger, Helmet, and NestJS Throttler

## Quick start

```bash
pnpm install
cp .env.example .env.local
# Edit .env.local with local, unique secrets and a PostgreSQL URL.
set -a; source .env.local; set +a
pnpm prisma:generate
pnpm prisma:migrate:deploy
pnpm start:dev
```

Do not commit `.env.local` or create secrets from the placeholders in `.env.example`. The application validates configuration before accepting traffic. `JWT_SECRET`, `JWT_REFRESH_SECRET`, `PASSWORD_PEPPER`, and `RATE_LIMIT_KEY_SECRET` must be non-empty and pairwise different.

> Losing or changing `PASSWORD_PEPPER` makes existing password hashes unverifiable and normally requires a password reset. It is never stored in PostgreSQL.

## Configuration

Copy `.env.example` to a local file outside version control and provide these values:

| Variable | Purpose |
|---|---|
| `NODE_ENV`, `PORT` | Runtime environment and HTTP port |
| `DATABASE_URL` | PostgreSQL connection URL |
| `JWT_SECRET`, `JWT_REFRESH_SECRET` | Separate access and refresh signing secrets |
| `JWT_ACCESS_TTL`, `JWT_REFRESH_TTL` | Token lifetimes; defaults are `15m` and `7d` |
| `JWT_ISSUER`, `JWT_AUDIENCE` | Required JWT verification claims |
| `BCRYPT_ROUNDS` | Bcrypt cost; must be `12` |
| `PASSWORD_PEPPER` | HMAC pepper applied before bcrypt |
| `CORS_ALLOWED_ORIGINS` | Comma-separated explicit browser origins |
| `TRUST_PROXY` | Whether Express trusts the upstream proxy |
| `RATE_LIMIT_KEY_SECRET` | HMAC key used to pseudonymize rate-limit identities |

Throttling uses an **in-memory store**. Counters reset when the process restarts and are not shared between multiple application instances; production scaling requires a shared store.

## PostgreSQL and Prisma migrations

Generate the client after installation or schema changes:

```bash
pnpm prisma:generate
```

Use migration history, never `prisma db push`:

```bash
# Local schema development only
pnpm prisma:migrate:dev --name <migration-name>

# Apply committed migrations in a clean or existing environment
pnpm prisma:migrate:deploy
pnpm prisma:migrate:status
```

### Start from an empty database

1. Create an empty PostgreSQL database and an application user that can create objects.
2. Set `DATABASE_URL` to that empty database.
3. Run `pnpm prisma:generate`.
4. Run `pnpm prisma:migrate:deploy`.
5. Run `pnpm prisma:migrate:status`; it must report the schema as up to date.
6. Run `pnpm prisma:migrate:deploy` again; it must report no pending migrations.
7. Start the API with `pnpm start:dev` and open `/api/docs`.

The committed migrations create authentication first and then the workshop domain (`domain_mvp`).

## Commands

| Command | Purpose |
|---|---|
| `pnpm start:dev` | Start the development server with watch mode |
| `pnpm start` | Start through Nest CLI |
| `pnpm start:prod` | Run the compiled application |
| `pnpm format` | Format TypeScript sources and tests |
| `pnpm format:check` | Check formatting without writing |
| `pnpm lint` | Run type-aware ESLint |
| `pnpm test:unit` | Run unit tests |
| `pnpm test:integration` | Run PostgreSQL integration tests |
| `pnpm test:e2e` | Run HTTP E2E tests |
| `pnpm build` | Compile the application |
| `pnpm prisma:generate` | Generate Prisma Client |
| `pnpm prisma:migrate:deploy` | Apply committed migrations |
| `pnpm prisma:migrate:status` | Check migration state |

Integration and E2E suites require a disposable PostgreSQL database through `DATABASE_URL` because their setup can reset the target schema.

## Authentication

Register or log in to obtain `tokens.accessToken` and `tokens.refreshToken`. Send the access token to every protected endpoint:

```http
Authorization: Bearer <accessToken>
```

Access tokens last approximately 15 minutes. Refresh tokens last approximately seven days, are rotated on every successful refresh, and are stored only as SHA-256 hashes. Reusing an already rotated refresh token revokes only that session. Logout revokes refresh capability for the current session; an already issued access token remains valid until its own expiration.

## API endpoints

All resource UUIDs are validated. Protected lookups return the same public `404 NOT_FOUND` for missing resources and resources belonging to another workshop.

| Method | Path | Bearer access token | Success | Main public errors |
|---|---|---:|---:|---|
| POST | `/auth/register` | No | 201 | 400 `VALIDATION_ERROR`, 409 `EMAIL_ALREADY_REGISTERED`, 429 `RATE_LIMITED` |
| POST | `/auth/login` | No | 200 | 400 `VALIDATION_ERROR`, 401 `INVALID_CREDENTIALS`, 429 `RATE_LIMITED` |
| POST | `/auth/refresh` | No; refresh token in body | 200 | 400 `VALIDATION_ERROR`, 401 `INVALID_REFRESH_TOKEN`, 429 `RATE_LIMITED` |
| POST | `/auth/logout` | Yes | 204 | 401 `AUTHENTICATION_REQUIRED`, 429 `RATE_LIMITED` |
| GET | `/auth/me` | Yes | 200 | 401 `AUTHENTICATION_REQUIRED`, 429 `RATE_LIMITED` |
| POST | `/clients` | Yes | 201 | 400, 401, 429 |
| GET | `/clients` | Yes | 200 | 400, 401, 429 |
| GET | `/clients/:id` | Yes | 200 | 400, 401, 404, 429 |
| PATCH | `/clients/:id` | Yes | 200 | 400, 401, 404, 409, 429 |
| DELETE | `/clients/:id` | Yes | 200 | 401, 404, 409, 429 |
| POST | `/devices` | Yes | 201 | 400, 401, 404, 429 |
| GET | `/devices` | Yes | 200 | 400, 401, 429 |
| GET | `/devices/:id` | Yes | 200 | 400, 401, 404, 429 |
| PATCH | `/devices/:id` | Yes | 200 | 400, 401, 404, 409, 429 |
| DELETE | `/devices/:id` | Yes | 200 | 401, 404, 409, 429 |
| POST | `/work-orders` | Yes | 201 | 400, 401, 404, 429 |
| GET | `/work-orders` | Yes | 200 | 400, 401, 429 |
| GET | `/work-orders/:id` | Yes | 200 | 400, 401, 404, 429 |
| PATCH | `/work-orders/:id` | Yes | 200 | 400, 401, 404, 409, 429 |
| PATCH | `/work-orders/:id/status` | Yes | 200 | 400, 401, 404, 409, 429 |
| DELETE | `/work-orders/:id` | Yes | 200 | 401, 404, 409, 429 |

Lists use `page=1` and `limit=20` by default, with a maximum limit of 100. Work orders also accept `status`, `clientId`, `deviceId`, `from`, and `to` filters. Normal lists exclude archived records, while explicit `GET /:id` lookups can return an archived record owned by the workshop.

`DELETE /work-orders/:id` performs **logical archiving**, not physical deletion. Only `DELIVERED` or `CANCELLED` orders can be archived. The MVP has no restore endpoint.

## Work-order lifecycle

New orders always start as `RECEIVED`.

| Current status | Allowed next status | Condition |
|---|---|---|
| `RECEIVED` | `DIAGNOSING`, `CANCELLED` | None |
| `DIAGNOSING` | `WAITING_PARTS`, `REPAIRING`, `CANCELLED` | Diagnosis is required for `WAITING_PARTS` or `REPAIRING` |
| `WAITING_PARTS` | `REPAIRING`, `CANCELLED` | None |
| `REPAIRING` | `WAITING_PARTS`, `READY`, `CANCELLED` | Work performed is required for `READY` |
| `READY` | `DELIVERED`, `REPAIRING` | Delivery time is assigned automatically for `DELIVERED` |
| `DELIVERED` | None | Final and read-only; archiving is allowed |
| `CANCELLED` | None | Final and read-only; archiving is allowed |

`WAITING_APPROVAL` is intentionally absent because the PRD excludes customer-approval waiting from the MVP.

## Reproducible register-to-order flow

The examples use `jq` to retain returned identifiers and tokens.

```bash
BASE_URL=http://localhost:3000

REGISTER=$(curl -fsS -X POST "$BASE_URL/auth/register" \
  -H 'Content-Type: application/json' \
  -d '{"ownerName":"Ana Perez","email":"ana@example.com","password":"a-local-password-123","workshopName":"Central Repairs","workshopAddress":"Main Street 123"}')
ACCESS_TOKEN=$(printf '%s' "$REGISTER" | jq -r '.tokens.accessToken')

CLIENT=$(curl -fsS -X POST "$BASE_URL/clients" \
  -H "Authorization: Bearer $ACCESS_TOKEN" -H 'Content-Type: application/json' \
  -d '{"firstName":"Luis","lastName":"Gomez","phone":"+54 11 5555 0101","address":"Second Street 45"}')
CLIENT_ID=$(printf '%s' "$CLIENT" | jq -r '.id')

DEVICE=$(curl -fsS -X POST "$BASE_URL/devices" \
  -H "Authorization: Bearer $ACCESS_TOKEN" -H 'Content-Type: application/json' \
  -d "{\"clientId\":\"$CLIENT_ID\",\"brand\":\"Motorola\",\"model\":\"Edge 40\",\"physicalCondition\":\"Screen cracked; device powers on\"}")
DEVICE_ID=$(printf '%s' "$DEVICE" | jq -r '.id')

WORK_ORDER=$(curl -fsS -X POST "$BASE_URL/work-orders" \
  -H "Authorization: Bearer $ACCESS_TOKEN" -H 'Content-Type: application/json' \
  -d "{\"deviceId\":\"$DEVICE_ID\",\"reportedIssue\":\"Broken display\",\"estimatedBudget\":85000}")
WORK_ORDER_ID=$(printf '%s' "$WORK_ORDER" | jq -r '.id')

curl -fsS "$BASE_URL/work-orders/$WORK_ORDER_ID" \
  -H "Authorization: Bearer $ACCESS_TOKEN"
```

The device payload deliberately has no PIN, pattern, password, or unlock-credential field. Undeclared properties are rejected globally.

## Security decisions

- Domain routes derive identity only from a validated access JWT and scope every read/write to its workshop.
- Foreign-workshop and missing UUIDs share the same public 404 response.
- Passwords use HMAC-SHA-384 with a server-side pepper before bcrypt cost 12, preserving the full UTF-8 input.
- Access and refresh JWTs use separate secrets and validation contexts.
- Raw refresh tokens, device credentials, internal Prisma objects, SQL queries, stack traces, and internal hashes are never returned.
- Refresh rotation and reuse detection are atomic; sibling sessions remain independent.
- Validation rejects undeclared properties, and Helmet, explicit CORS, throttling, and consistent public error filters are enabled globally.
- Archived and final work orders are immutable. Client and device archiving is blocked while active repairs exist.

## Authentication traceability

This table links the authentication specification to implementation tasks and executable evidence without publishing internal values.

| Scope | Requirements covered | Tasks | Primary evidence |
|---|---|---|---|
| US1 — Register | RF-001–RF-005, RF-020, RF-022–RF-027; CE-001, CE-002, CE-007, CE-009, CE-011 | T031–T037 | `register.spec.ts`, `register.integration.spec.ts`, `register.e2e-spec.ts`, `no-secrets.e2e-spec.ts` |
| US2 — Login | RF-006–RF-009, RF-016, RF-020–RF-024, RF-029; CE-003, CE-004, CE-007–CE-009, CE-013 | T038–T043, T063–T068 | `login.spec.ts`, `login.integration.spec.ts`, `login.e2e-spec.ts`, security E2E tests |
| US3 — Protected access | RF-018–RF-020, RF-028; CE-005, CE-007, CE-009, CE-012 | T044–T049 | `jwt-access.spec.ts`, `me.e2e-spec.ts`, `no-secrets.e2e-spec.ts` |
| US4 — Refresh rotation | RF-010–RF-013, RF-016–RF-017, RF-020–RF-022, RF-028; CE-006, CE-007, CE-009, CE-010, CE-012 | T050–T057 | `refresh.spec.ts`, `refresh.integration.spec.ts`, `refresh.e2e-spec.ts` |
| US5 — Logout | RF-014–RF-020, RF-022, RF-028; CE-005, CE-007, CE-009, CE-010, CE-012 | T058–T062 | `logout.spec.ts`, `logout.integration.spec.ts`, `logout.e2e-spec.ts` |
| Cross-cutting validation and security | RF-005, RF-009, RF-020–RF-021, RF-023–RF-029; CE-007–CE-009, CE-011–CE-013 | T063–T071 | `auth-throttler.guard.spec.ts`, `security-swagger.e2e-spec.ts`, `no-secrets.e2e-spec.ts`, complete local validation |

Together the rows cover **US1–US5, RF-001–RF-029, and CE-001–CE-013**. Detailed acceptance criteria remain in `specs/001-authentication/spec.md`; task-level evidence remains in `specs/001-authentication/tasks.md`.
