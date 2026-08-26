# Quickstart de validación: Autenticación

Guía de ejecución futura para demostrar la feature una vez implementada. Esta fase de planificación
no ejecuta comandos, instala dependencias ni inicializa NestJS.

## Prerrequisitos

- Node.js 24 LTS; el entorno local de referencia usa v24.17.0.
- pnpm.
- PostgreSQL accesible para desarrollo.
- Variables definidas a partir de `.env.example`, usando secretos locales distintos a los ejemplos.

## Preparación prevista

```bash
pnpm install
pnpm prisma generate
pnpm prisma migrate dev
```

Para CI o deploy, sustituir `migrate dev` por:

```bash
pnpm prisma migrate deploy
```

No usar `prisma db push` en un entorno persistente.

## Comprobación de configuración

Antes de iniciar:

- `JWT_SECRET` y `JWT_REFRESH_SECRET` existen y son diferentes.
- `JWT_ACCESS_TTL=15m`.
- `JWT_REFRESH_TTL=7d`.
- `BCRYPT_ROUNDS=12`.
- `PASSWORD_PEPPER` contiene un secreto local no vacío y diferente de los secretos JWT.
- `CORS_ALLOWED_ORIGINS` contiene únicamente orígenes explícitos.
- `DATABASE_URL` apunta a la base correcta.
- `RATE_LIMIT_KEY_SECRET` no coincide con secretos JWT.

La aplicación debe fallar al arrancar si falta una variable obligatoria o si los secretos JWT
coinciden. También debe fallar si falta `PASSWORD_PEPPER`. El archivo `.env.example` documenta el
nombre mediante un placeholder, nunca un pepper real. Cambiar o perder este secreto impide verificar
contraseñas existentes y normalmente requiere restablecerlas.

## Verificaciones automatizadas previstas

```bash
pnpm format:check
pnpm lint
pnpm test
pnpm test:integration
pnpm test:e2e
pnpm build
pnpm prisma migrate status
```

Los nombres definitivos de scripts se fijarán durante la implementación y deberán documentarse en el
README.

## Recorrido E2E mínimo

Los cuerpos y respuestas completos están en [contracts/auth-api.md](./contracts/auth-api.md).

### 1. Registrar

1. Enviar `POST /auth/register` con datos válidos.
2. Esperar `201`, proyecciones públicas de Account/Workshop y ambos tokens.
3. Verificar que el correo devuelto esté en minúsculas y sin espacios exteriores.
4. Confirmar que respuesta y logs no contengan contraseña, hash ni secreto.
5. Repetir con el mismo correo usando otras mayúsculas; esperar `409`.

**Evidencia**: RF-001–RF-005, RF-022–RF-027; CE-001, CE-002, CE-007, CE-011.

### 2. Validar bordes

1. Probar contraseñas de 12 y 128 caracteres; deben aceptarse.
2. Probar 11 y 129; deben devolver `400 VALIDATION_ERROR`.
3. Probar dos contraseñas de más de 72 bytes con el mismo prefijo y sufijos distintos; solo la
   contraseña completa original debe autenticar.
4. Probar caracteres UTF-8 multibyte que superen 72 bytes aun con menos de 72 caracteres; la
   contraseña completa debe participar en la verificación.
5. Arrancar una configuración aislada sin `PASSWORD_PEPPER`; debe fallar antes de aceptar tráfico.
6. Inspeccionar respuestas y logs: contraseña, prehash, pepper y hash bcrypt no deben aparecer.
7. Probar mínimos/máximos de nombre, taller, dirección y correo.
8. Agregar una propiedad no declarada; debe devolver `400`.

**Evidencia**: RF-021, RF-023–RF-025.

### 3. Login genérico

1. Iniciar sesión con credenciales válidas; esperar `200` y una nueva sesión independiente.
2. Probar correo inexistente.
3. Probar correo existente con contraseña incorrecta.
4. Comparar las dos respuestas inválidas: status, código y mensaje deben ser idénticos.

**Evidencia**: RF-006–RF-008; CE-003, CE-004.

### 4. Protección

1. Solicitar `GET /auth/me` sin token; esperar `401`.
2. Repetir con token inválido y vencido; esperar `401`.
3. Repetir con access token vigente; esperar `200` y datos públicos.
4. Verificar en una emisión normal que la diferencia entre claims `iat` y `exp` sea aproximadamente
   900 segundos, manteniendo `JWT_ACCESS_TTL=15m`.
5. Para probar expiración sin esperar 15 minutos, arrancar exclusivamente esa prueba E2E con una
   aplicación aislada y override `JWT_ACCESS_TTL=1s`; comprobar aceptación antes de vencer y `401`
   después.

El TTL `1s` existe solo en la configuración de esa prueba. No modifica producción, desarrollo normal
ni `.env.example`.

**Evidencia**: RF-018–RF-020; CE-005.

### 5. Rotación

1. Enviar `POST /auth/refresh` con refresh token válido; esperar `200` y un par nuevo.
2. Reusar el token anterior; esperar `401`.
3. Intentar usar el nuevo refresh token de esa sesión; esperar `401` porque la reutilización revocó
   únicamente esa sesión.
4. Verificar que una segunda sesión de la misma cuenta todavía renueva correctamente.

**Evidencia**: RF-010–RF-013, RF-016–RF-017; CE-006, CE-010.

### 6. Refresh concurrente

1. Enviar dos solicitudes simultáneas con el mismo refresh token.
2. Verificar que como máximo una responde `200`.
3. Verificar que la otra responde `401` y que no existen dos credenciales sucesoras activas.
4. Confirmar que solo esa sesión queda revocada.

**Evidencia**: RF-012–RF-013, RF-022; CE-006, CE-010.

### 7. Logout y vigencia residual

1. Enviar `POST /auth/logout` con access token vigente; esperar `204`.
2. Repetir logout; esperar `204`.
3. Intentar refresh de esa sesión; esperar `401`.
4. Solicitar `GET /auth/me` con el access token todavía vigente; esperar `200`.
5. Después de su `exp`, repetir; esperar `401`.
6. Confirmar que otra sesión permanece activa.

**Evidencia**: RF-014–RF-017, RF-028; CE-010, CE-012.

### 8. Rate limiting

1. Superar 5 logins fallidos por correo normalizado en 15 minutos; esperar `429`.
2. Superar 20 intentos de login desde un origen en 15 minutos alternando correos; esperar `429`.
3. Superar los límites reforzados de registro.
4. Verificar `Retry-After` y que la respuesta no indique si el correo existe.
5. Verificar que el límite global de 100 solicitudes/minuto se aplica al resto de rutas.

**Evidencia**: RF-009, RF-029; CE-008, CE-013.

## Inspección de persistencia

En una base de pruebas aislada, comprobar:

- Una Account tiene exactamente un Workshop.
- Varias Session pueden pertenecer a la misma Account.
- `email` está normalizado y protegido por unicidad.
- `passwordHash` no coincide con la contraseña.
- Ninguna RefreshCredential contiene el JWT bruto.
- Cada Session tiene como máximo una credencial `ACTIVE`.
- El historial `ROTATED` permite detectar reutilización.

Consultar [data-model.md](./data-model.md) para las invariantes completas.

## Criterio de salida

La feature está lista para entrega únicamente cuando:

- todas las verificaciones disponibles terminan correctamente;
- las migraciones se aplican desde cero y sobre una base actualizada;
- Swagger coincide con [contracts/auth-api.md](./contracts/auth-api.md);
- no aparecen secretos en respuestas ni logs;
- se adjunta evidencia de format, lint, tests, build y deploy.
