# Modelo de datos: Autenticación

Este documento define el modelo persistente requerido por la feature. `prisma/schema.prisma` será
la fuente de verdad durante la implementación; aquí se documentan entidades, invariantes y
transiciones sin escribir todavía el schema.

## Diagrama conceptual

```text
Account 1 ─── 1 Workshop
Account 1 ─── * Session
Session 1 ─── * RefreshCredential
RefreshCredential 0..1 ─── 0..1 RefreshCredential (sucesora)
```

## Account

Representa la identidad del propietario y el límite de pertenencia del taller.

| Campo | Tipo conceptual | Reglas |
|---|---|---|
| `id` | UUID | Identificador primario, generado por la aplicación o base |
| `ownerName` | Texto | 2–100 caracteres después de recortar |
| `email` | Texto | Máximo 254, formato válido, recortado, minúsculas, único global |
| `passwordHash` | Texto | Hash bcrypt costo 12 de `base64(HMAC-SHA-384(password UTF-8, PASSWORD_PEPPER))`; nunca público |
| `createdAt` | Fecha/hora UTC | Asignación automática |
| `updatedAt` | Fecha/hora UTC | Actualización automática |

### Invariantes

- `email` tiene índice/restricción única en PostgreSQL.
- La contraseña en texto plano nunca forma parte de la entidad persistente.
- HMAC-SHA-384 procesa la contraseña completa; su digest de 48 bytes codificado en Base64 produce 64
  caracteres ASCII antes de bcrypt, por debajo de su límite de 72 bytes.
- Bcrypt genera y conserva su salt individual dentro de `passwordHash`.
- `PASSWORD_PEPPER` no forma parte de Account ni de ninguna entidad PostgreSQL. Cambiarlo o perderlo
  impide verificar los hashes existentes y normalmente exige restablecer las contraseñas.
- Contraseñas distintas después del byte 72 deben producir verificaciones distintas.
- Cada Account debe tener exactamente un Workshop después de completar el registro.
- Una Account puede tener cero o más Session históricas y varias activas.

## Workshop

Representa el único taller independiente de la cuenta.

| Campo | Tipo conceptual | Reglas |
|---|---|---|
| `id` | UUID | Identificador primario |
| `accountId` | UUID | FK requerida a Account; única |
| `name` | Texto | 2–120 caracteres después de recortar |
| `address` | Texto | 5–200 caracteres después de recortar |
| `createdAt` | Fecha/hora UTC | Asignación automática |
| `updatedAt` | Fecha/hora UTC | Actualización automática |

### Invariantes

- `accountId` único materializa la relación uno a uno.
- Workshop no existe sin Account.
- El borrado de cuentas y talleres está fuera de alcance; las relaciones deben usar una política que
  impida borrados accidentales.

## Session

Representa una sesión independiente de una cuenta.

| Campo | Tipo conceptual | Reglas |
|---|---|---|
| `id` | UUID | Identificador primario y claim `sid` |
| `accountId` | UUID | FK requerida a Account |
| `version` | Entero | Inicia en 0; incrementa en cada rotación |
| `expiresAt` | Fecha/hora UTC | Vencimiento de la credencial de renovación vigente |
| `revokedAt` | Fecha/hora UTC opcional | Presente cuando ya no admite renovación |
| `revocationReason` | Enum opcional | `LOGOUT` o `TOKEN_REUSE` |
| `createdAt` | Fecha/hora UTC | Asignación automática |
| `updatedAt` | Fecha/hora UTC | Actualización automática |

### Estado derivado

| Estado | Condición | Comportamiento |
|---|---|---|
| Activa | `revokedAt IS NULL` y `expiresAt > now` | Puede renovar con su RefreshCredential activa |
| Vencida | `expiresAt <= now` | No puede renovar |
| Revocada | `revokedAt IS NOT NULL` | No puede renovar |

La validez de un access token ya emitido no depende de este estado; continúa hasta su propio `exp`.

## RefreshCredential

Representa una generación de credencial de renovación sin almacenar el token bruto.

| Campo | Tipo conceptual | Reglas |
|---|---|---|
| `id` | UUID | Identificador primario y claim `jti` |
| `sessionId` | UUID | FK requerida a Session |
| `tokenHash` | Hash hexadecimal | SHA-256 del token completo; único; nunca público |
| `status` | Enum | `ACTIVE` o `ROTATED` |
| `expiresAt` | Fecha/hora UTC | Coincide con el `exp` de esa generación |
| `rotatedAt` | Fecha/hora UTC opcional | Presente cuando dejó de ser ACTIVE por rotación |
| `successorId` | UUID opcional | Relación única con la credencial sucesora |
| `createdAt` | Fecha/hora UTC | Asignación automática |

### Invariantes

- Solo puede existir una RefreshCredential `ACTIVE` por Session.
- Una credencial `ROTATED` conserva su hash hasta vencer para detectar reutilización.
- Una credencial activa pertenece a una Session activa y no vencida.
- `successorId` no puede apuntar a la misma fila ni cruzar sesiones.
- Revocar una Session hace inutilizables todas sus credenciales, aunque su estado físico no se
  actualice individualmente.

## Índices y restricciones

| Entidad | Restricción/índice | Motivo |
|---|---|---|
| Account | unique `email` | Unicidad global y carreras concurrentes |
| Workshop | unique `accountId` | Relación uno a uno |
| Session | index `accountId, revokedAt` | Consultar sesiones de una cuenta sin afectar otras |
| RefreshCredential | unique `tokenHash` | Localización y no duplicación |
| RefreshCredential | unique `successorId` cuando existe | Cadena lineal |
| RefreshCredential | index `sessionId, status` | Credencial activa e historial |
| RefreshCredential | index `expiresAt` | Limpieza operativa futura de historial vencido |

Si Prisma/PostgreSQL no permite expresar directamente “una ACTIVE por sesión” mediante el esquema
portátil elegido, la combinación de actualización condicional, versión de Session y transacción
`Serializable` será la autoridad. No se introducirá SQL específico salvo que la implementación
demuestre que ese invariante no puede sostenerse de forma segura.

## Transiciones

### Crear sesión

```text
NO EXISTE → Session activa + RefreshCredential ACTIVE
```

Ocurre en registro y login. La Session y su primera credencial se crean atómicamente.

### Rotar

```text
Credential[n] ACTIVE → ROTATED
Session.version n → n+1
Credential[n+1] NO EXISTE → ACTIVE
Session.expiresAt → expiración de Credential[n+1]
```

La transición completa es atómica. Nunca quedan dos sucesoras activas.

### Detectar reutilización

```text
Credential anterior ROTATED + presentación válida
→ Session.revokedAt = now
→ Session.revocationReason = TOKEN_REUSE
```

Las Session hermanas de la misma Account no cambian.

### Logout

```text
Session activa → Session revocada (LOGOUT)
```

La operación es idempotente. El access token presentado mantiene vigencia hasta su `exp`.

## Operaciones atómicas

### Registro

Una única transacción:

1. Crear Account.
2. Crear Workshop enlazado.
3. Crear Session.
4. Crear RefreshCredential inicial.

El hash de contraseña y el material temporal de tokens pueden prepararse antes, pero ningún token se
devuelve hasta confirmar la transacción.

### Refresh concurrente

La autoridad es una actualización condicional por credencial `ACTIVE` y `Session.version` dentro
de una transacción `Serializable`. Un solo proceso actualiza una fila. Un competidor que encuentre
la credencial ya `ROTATED` aplica la transición de reutilización.

## Datos públicos

Las respuestas solo pueden proyectar:

- Account: `id`, `ownerName`, `email`.
- Workshop: `id`, `name`, `address`.
- Tokens: valores recién emitidos y duraciones públicas.

Nunca se proyectan `passwordHash`, `tokenHash`, estados internos, motivos de revocación,
versiones, secretos ni objetos Prisma completos.
