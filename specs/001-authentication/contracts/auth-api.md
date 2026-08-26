# Contrato REST: Autenticación

**Base path**: `/auth`

**Formato**: `application/json`, excepto respuestas `204 No Content`.

Este contrato define comportamiento HTTP para planificación. Swagger deberá reflejarlo durante la
implementación sin incluir secretos de configuración ni esquemas persistentes internos.

## Convenciones

### Tokens

- Los access tokens se envían como `Authorization: Bearer <accessToken>`.
- Los refresh tokens se envían únicamente en el cuerpo de `POST /auth/refresh`.
- Ninguna respuesta devuelve hashes, secretos de firma ni credenciales persistidas.

### Error público

```json
{
  "statusCode": 400,
  "code": "VALIDATION_ERROR",
  "message": "Request validation failed",
  "path": "/auth/register",
  "details": [
    {
      "field": "email",
      "message": "email must be valid"
    }
  ]
}
```

`details` solo aparece en errores de validación corregibles. Producción nunca incluye stack trace,
consulta, causa interna, contraseña, hash ni token.

## POST /auth/register

Registra atómicamente una cuenta, un taller, una sesión y su primera credencial de renovación.

### Solicitud

```json
{
  "ownerName": "Ana Pérez",
  "email": "ana@example.com",
  "password": "correct horse battery staple",
  "workshopName": "Taller Central",
  "workshopAddress": "Av. Siempre Viva 123"
}
```

### Normalización y validación

| Campo | Regla |
|---|---|
| `ownerName` | Recortar; 2–100 caracteres |
| `email` | Recortar; minúsculas; formato válido; máximo 254; único global |
| `password` | 12–128 caracteres; cualquier carácter; no se recorta |
| `workshopName` | Recortar; 2–120 caracteres |
| `workshopAddress` | Recortar; 5–200 caracteres |

Las propiedades adicionales se rechazan.

### Respuesta `201 Created`

```json
{
  "account": {
    "id": "uuid",
    "ownerName": "Ana Pérez",
    "email": "ana@example.com"
  },
  "workshop": {
    "id": "uuid",
    "name": "Taller Central",
    "address": "Av. Siempre Viva 123"
  },
  "tokens": {
    "accessToken": "<jwt>",
    "refreshToken": "<jwt>",
    "accessExpiresIn": 900,
    "refreshExpiresIn": 604800
  }
}
```

Las duraciones se expresan en segundos y son aproximadas.

### Errores

| HTTP | Código | Condición |
|---:|---|---|
| 400 | `VALIDATION_ERROR` | Campo ausente, inválido o propiedad adicional |
| 409 | `EMAIL_ALREADY_REGISTERED` | Correo normalizado ya registrado, incluida carrera concurrente |
| 429 | `RATE_LIMITED` | Límite por origen o correo normalizado excedido |
| 500 | `INTERNAL_ERROR` | Fallo inesperado; no queda creación parcial |

## POST /auth/login

Crea una nueva sesión independiente para credenciales válidas.

### Solicitud

```json
{
  "email": "ana@example.com",
  "password": "correct horse battery staple"
}
```

El correo se recorta y normaliza a minúsculas. No se permiten propiedades adicionales.

### Respuesta `200 OK`

```json
{
  "account": {
    "id": "uuid",
    "ownerName": "Ana Pérez",
    "email": "ana@example.com"
  },
  "workshop": {
    "id": "uuid",
    "name": "Taller Central",
    "address": "Av. Siempre Viva 123"
  },
  "tokens": {
    "accessToken": "<jwt>",
    "refreshToken": "<jwt>",
    "accessExpiresIn": 900,
    "refreshExpiresIn": 604800
  }
}
```

### Errores

| HTTP | Código | Condición |
|---:|---|---|
| 400 | `VALIDATION_ERROR` | Forma inválida o propiedad adicional |
| 401 | `INVALID_CREDENTIALS` | Correo inexistente o contraseña incorrecta |
| 429 | `RATE_LIMITED` | Límite por origen o correo normalizado excedido |
| 500 | `INTERNAL_ERROR` | Fallo inesperado |

Correo inexistente y contraseña incorrecta producen exactamente el mismo status, código y mensaje.
`RATE_LIMITED` es distinguible, incluye `Retry-After` y no confirma si la cuenta existe.

## POST /auth/refresh

Rota la credencial de renovación de una sesión y emite un nuevo par.

### Solicitud

```json
{
  "refreshToken": "<jwt>"
}
```

No se permiten propiedades adicionales.

### Respuesta `200 OK`

```json
{
  "tokens": {
    "accessToken": "<jwt>",
    "refreshToken": "<new-jwt>",
    "accessExpiresIn": 900,
    "refreshExpiresIn": 604800
  }
}
```

El token presentado queda rotado antes de devolver la respuesta.

### Errores

| HTTP | Código | Condición |
|---:|---|---|
| 400 | `VALIDATION_ERROR` | Body ausente, inválido o con propiedades adicionales |
| 401 | `INVALID_REFRESH_TOKEN` | Token inválido, vencido, rotado, revocado o sesión no renovable |
| 429 | `RATE_LIMITED` | Límite global excedido |
| 500 | `INTERNAL_ERROR` | Fallo inesperado sin rotación parcial visible |

El `401` no distingue firma, expiración, revocación ni reutilización. Si una credencial rotada se
reutiliza, se revoca solo su sesión.

### Concurrencia

Dos solicitudes simultáneas con el mismo refresh token tienen este resultado observable:

- como máximo una obtiene `200`;
- la otra obtiene `401 INVALID_REFRESH_TOKEN`;
- la detección de reutilización deja la sesión sin capacidad de renovación;
- ninguna otra sesión de la cuenta se modifica.

## POST /auth/logout

Revoca únicamente la sesión identificada por el access token.

### Autenticación

`Authorization: Bearer <accessToken>`

No requiere body.

### Respuesta `204 No Content`

La operación es idempotente para una sesión ya revocada. No devuelve cuerpo.

El access token usado puede continuar autenticando hasta su vencimiento, pero la sesión ya no puede
renovarse.

### Errores

| HTTP | Código | Condición |
|---:|---|---|
| 401 | `AUTHENTICATION_REQUIRED` | Access token ausente, inválido o vencido |
| 429 | `RATE_LIMITED` | Límite global excedido |
| 500 | `INTERNAL_ERROR` | Fallo inesperado |

## GET /auth/me

Demuestra la protección Bearer y devuelve la proyección pública de la cuenta autenticada y su taller.

### Autenticación

`Authorization: Bearer <accessToken>`

### Respuesta `200 OK`

```json
{
  "account": {
    "id": "uuid",
    "ownerName": "Ana Pérez",
    "email": "ana@example.com"
  },
  "workshop": {
    "id": "uuid",
    "name": "Taller Central",
    "address": "Av. Siempre Viva 123"
  }
}
```

Un access token vigente sigue obteniendo `200` aunque su Session haya sido revocada por logout o
reutilización. Al vencer, obtiene `401`.

### Errores

| HTTP | Código | Condición |
|---:|---|---|
| 401 | `AUTHENTICATION_REQUIRED` | Access token ausente, inválido o vencido |
| 429 | `RATE_LIMITED` | Límite global excedido |
| 500 | `INTERNAL_ERROR` | Fallo inesperado |

## Requisitos de documentación Swagger

- Documentar los cinco endpoints, DTOs, códigos y ejemplos públicos anteriores.
- Marcar `/auth/logout` y `/auth/me` con autenticación Bearer.
- No documentar hashes, secretos, estados internos ni modelos persistentes.
- Validar mediante smoke test que el documento generado contiene las rutas y respuestas entregadas.
