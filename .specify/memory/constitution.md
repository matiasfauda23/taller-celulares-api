<!--
Sync Impact Report
- Cambio de versión: plantilla sin ratificar → 1.0.0
- Principios modificados: ninguno; primera ratificación del proyecto
- Principios agregados:
  - I. Desarrollo guiado por especificaciones
  - II. Seguridad y aislamiento de datos
  - III. Integridad del dominio y atomicidad
  - IV. Validación y errores seguros
  - V. Pruebas y evidencia
  - VI. Simplicidad y alcance
  - VII. Documentación, Git y entrega
  - VIII. Restricciones técnicas
- Secciones agregadas: Aplicación de la Constitution; Control de cumplimiento; Gobernanza
- Secciones eliminadas: ninguna
- TODOs de seguimiento: ninguno
-->

# Constitution de API Taller de Celulares

## Core Principles

### I. Desarrollo guiado por especificaciones

- Toda funcionalidad o cambio de comportamiento DEBE partir de una especificación revisable.
- Las especificaciones DEBEN describir QUÉ debe ocurrir y POR QUÉ mediante comportamientos
  observables. Las decisiones de implementación DEBEN pertenecer al plan técnico.
- Ninguna decisión relevante DEBE quedar registrada únicamente en el chat o en Engram; DEBE
  incorporarse al artefacto versionado que corresponda.
- Todo cambio de comportamiento DEBE actualizar su especificación, sus pruebas y su documentación.
- DEBE existir trazabilidad comprobable entre requisito, tarea, implementación y evidencia.

**Razón:** separar intención e implementación permite revisar el comportamiento antes de construirlo
y evita que decisiones esenciales se pierdan fuera del repositorio.

### II. Seguridad y aislamiento de datos

- Toda ruta que exponga o modifique datos del taller DEBE estar protegida, excepto las rutas públicas
  de autenticación decididas explícitamente.
- Toda lectura y escritura DEBE limitarse a los recursos de la cuenta autenticada. La autorización NO
  DEBE aplicarse únicamente en los listados.
- La consulta de un recurso ajeno NO DEBE revelar si dicho recurso existe.
- Contraseñas, hashes, tokens, secretos y credenciales NO DEBEN aparecer en respuestas, logs ni
  commits.
- El archivo `.env` real NO DEBE versionarse.

**Razón:** el aislamiento por cuenta es un límite de seguridad transversal y debe sostenerse en cada
punto de acceso a los datos.

### III. Integridad del dominio y atomicidad

- Las reglas de negocio DEBEN centralizarse en services o componentes de dominio y NO DEBEN
  duplicarse en controllers.
- Las transiciones de estado DEBEN validarse mediante una única definición coherente.
- Toda operación inválida DEBE rechazarse sin producir modificaciones parciales.
- El archivado DEBE conservar la integridad de las relaciones y el historial.
- Los controllers DEBEN ser delgados: reciben la solicitud, delegan el comportamiento y devuelven la
  respuesta.

**Razón:** una única autoridad para las reglas reduce contradicciones y permite que las operaciones
mantengan el dominio en un estado válido.

### IV. Validación y errores seguros

- Toda entrada externa DEBE validarse mediante DTOs.
- La validación global DEBE rechazar propiedades no declaradas.
- Los errores DEBEN usar respuestas consistentes y códigos HTTP apropiados.
- En producción, las respuestas NO DEBEN exponer stack traces, consultas de base de datos ni detalles
  internos.
- Los errores de autenticación y autorización NO DEBEN filtrar información sensible.

**Razón:** validar en los límites y controlar la información de error protege la integridad de la API
y evita exposiciones accidentales.

### V. Pruebas y evidencia

- Las reglas críticas DEBEN contar con pruebas automatizadas. Como mínimo, DEBEN probarse la
  autenticación, el aislamiento entre cuentas, las transiciones de órdenes y las restricciones de
  archivado.
- Una tarea NO DEBE considerarse terminada solamente porque el código compila.
- Antes de marcar trabajo como completado, DEBEN ejecutarse las verificaciones disponibles de
  formato, lint, tests y build.
- Ningún cambio DEBE romper pruebas existentes.
- La evidencia de las verificaciones ejecutadas DEBE acompañar la finalización de cada tarea.

**Razón:** la evidencia ejecutable demuestra que el comportamiento especificado funciona y que el
cambio no degradó capacidades existentes.

### VI. Simplicidad y alcance

- DEBE implementarse la solución más simple que satisfaga la especificación y la consigna.
- NO DEBEN agregarse funcionalidades fuera del PRD sin actualizar primero el alcance.
- NO DEBEN incorporarse abstracciones, dependencias ni patrones sin una necesidad concreta y
  documentada.
- La API DEBE organizarse en módulos cohesivos por responsabilidad.
- Mientras permanezcan fuera del MVP, NO DEBEN implementarse frontend, pagos, inventario,
  notificaciones, roles múltiples ni restauración.

**Razón:** limitar el sistema al problema aprobado reduce complejidad accidental y mantiene el
desarrollo verificable.

### VII. Documentación, Git y entrega

- Los endpoints entregados DEBEN documentarse en Swagger y en el README.
- Toda variable necesaria DEBE documentarse en `.env.example` sin valores secretos.
- Los commits DEBEN ser progresivos, claros y seguir Conventional Commits.
- Cada commit DEBE representar una unidad coherente de trabajo.
- El repositorio DEBE permitir instalar, configurar, ejecutar, probar y desplegar el proyecto
  mediante instrucciones documentadas.
- La API desplegada y su documentación DEBEN corresponder con el código versionado.

**Razón:** documentación, historial y despliegue deben describir el mismo producto reproducible para
que el trabajo pueda revisarse y mantenerse.

### VIII. Restricciones técnicas

- El proyecto DEBE utilizar NestJS 11 y TypeScript con modo estricto.
- La persistencia DEBE utilizar Prisma y PostgreSQL.
- El gestor de paquetes DEBE ser pnpm.
- La autenticación DEBE utilizar JWT con access tokens y refresh tokens, y bcrypt para las
  contraseñas.
- La API DEBE incorporar Helmet, CORS, rate limiting y validación global.
- Swagger DEBE representar el contrato visible de la API.
- Estas tecnologías NO DEBEN reemplazarse sin una modificación explícita de esta Constitution y una
  justificación documentada.

**Razón:** una base técnica estable evita decisiones incompatibles y permite evaluar el proyecto con
criterios uniformes.

## Aplicación de la Constitution

Estos principios gobiernan toda especificación, plan, tarea, implementación, revisión y entrega del
proyecto. El PRD conserva la autoridad sobre el alcance y los requisitos del producto; esta
Constitution establece las reglas transversales bajo las cuales deben desarrollarse.

Cuando una decisión afecte el comportamiento observable, el alcance o una restricción técnica, DEBE
registrarse en el artefacto versionado correspondiente antes de implementar el cambio.

## Control de cumplimiento

- Toda especificación y todo plan técnico DEBEN incluir una comprobación explícita de cumplimiento
  con esta Constitution.
- Toda tarea finalizada DEBE conservar trazabilidad hacia su requisito y presentar evidencia de las
  verificaciones aplicables.
- Toda excepción DEBE identificarse y justificarse explícitamente antes de aceptar el trabajo.
- Una revisión DEBE rechazar cambios que vulneren un principio vigente o que no documenten una
  excepción aprobada.

## Governance

Esta Constitution prevalece sobre decisiones informales y prácticas inconsistentes. Las
especificaciones, los planes y las revisiones DEBEN comprobar su cumplimiento.

Toda excepción DEBE justificarse explícitamente, delimitar su alcance y quedar registrada en un
artefacto versionado. Una excepción no modifica por sí misma esta Constitution ni crea un precedente
automático.

Toda modificación de esta Constitution DEBE documentar el motivo, actualizar el Sync Impact Report y
ajustar la versión conforme a versionado semántico:

- **MAJOR:** eliminación de principios o redefiniciones incompatibles con la gobernanza vigente.
- **MINOR:** incorporación de nuevos principios o ampliaciones materiales de los existentes.
- **PATCH:** aclaraciones o correcciones que no cambien el significado normativo.

La fecha de última modificación DEBE actualizarse en cada enmienda. La fecha de ratificación DEBE
conservar la adopción original del documento.

**Versión**: 1.0.0 | **Ratificada**: 2026-08-25 | **Última modificación**: 2026-08-25
