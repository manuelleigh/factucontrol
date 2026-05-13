# GestPyme / FactuControl

Sistema web para gestionar obras, cobros, clientes, proveedores, presupuestos, cotizaciones, compras, gastos y reportes financieros en microempresas.

La aplicacion esta construida con **Node.js + Express + EJS + Sequelize + SQLite**, con autenticacion por sesiones, control de roles, carga de archivos y generacion de reportes en PDF, CSV y XLSX.

## Tabla de contenido

1. [Resumen](#resumen)
2. [Stack tecnologico](#stack-tecnologico)
3. [Arquitectura](#arquitectura)
4. [Estructura del proyecto](#estructura-del-proyecto)
5. [Requisitos](#requisitos)
6. [Instalacion](#instalacion)
7. [Variables de entorno](#variables-de-entorno)
8. [Scripts disponibles](#scripts-disponibles)
9. [Arranque](#arranque)
10. [Autenticacion y permisos](#autenticacion-y-permisos)
11. [Modulos funcionales](#modulos-funcionales)
12. [Endpoints](#endpoints)
13. [Modelo de datos](#modelo-de-datos)
14. [Adjuntos y uploads](#adjuntos-y-uploads)
15. [Reportes](#reportes)
16. [Asistente IA](#asistente-ia)
17. [Manejo de errores](#manejo-de-errores)
18. [Pruebas](#pruebas)
19. [Despliegue](#despliegue)

## Resumen

GestPyme centraliza la operacion administrativa y financiera de una microempresa, con foco en:

- Gestion de clientes y proveedores.
- Control de obras y su estado.
- Registro de presupuestos y cotizaciones.
- Facturacion interna de cobros, gastos y compras.
- Analisis de rentabilidad por obra.
- Generacion de reportes ejecutivos.
- Asistencia con IA para diagnostico y lectura del negocio.

La aplicacion levanta una interfaz web tradicional renderizada server-side con EJS y expone una API JSON para las operaciones CRUD y de analitica.

## Stack tecnologico

- Runtime: Node.js
- Framework web: Express 5
- Motor de vistas: EJS
- ORM: Sequelize 6
- Base de datos principal: SQLite
- Sesiones: `express-session` + `connect-sqlite3`
- Carga de archivos: Multer
- Autenticacion: bcrypt para contraseñas
- Fechas: Day.js
- Exportaciones: PDFKit, xlsx, `pdf-parse`
- SMTP: Nodemailer
- Utilidades: `dotenv`, `open`

## Arquitectura

La aplicacion sigue una separacion por capas:

- `routes/`: define las rutas HTTP y aplica autenticacion/permisos.
- `controllers/`: adapta la solicitud HTTP al dominio y prepara respuestas JSON o vistas.
- `services/`: contiene la logica principal del negocio.
- `models/`: define entidades Sequelize y asociaciones.
- `middleware/`: autenticacion, control de errores, carga de archivos y utilidades de request.
- `views/`: plantillas EJS para dashboard, modulos y pantallas de error.
- `reports/`: artefactos y salidas de reportes.
- `database/`: configuracion de SQLite, migraciones y archivo de base de datos.
- `uploads/`: archivos adjuntos guardados por el sistema.

### Flujo general de ejecucion

1. `app.js` carga variables de entorno.
2. Se inicializa Sequelize con SQLite.
3. Se ejecutan migraciones pendientes.
4. Se asegura la existencia de un usuario administrador por defecto.
5. Se monta Express, sesiones, rutas y manejadores de error.
6. La app escucha en el puerto configurado y, en desarrollo, abre el navegador automaticamente.

## Estructura del proyecto

```text
factucontrol/
  app.js
  package.json
  controllers/
  database/
  middleware/
  migrations/
  models/
  public/
  reports/
  routes/
  scripts/
  services/
  tests/
  uploads/
  utils/
  views/
```

## Requisitos

- Node.js 18 o superior recomendado.
- npm.
- SQLite local.
- Entorno Windows, Linux o macOS.

## Instalacion

1. Clona el repositorio.
2. Instala dependencias:

```bash
npm install
```

3. Copia el archivo de ejemplo de entorno:

```bash
copy .env.example .env
```

4. Ajusta los valores de `.env`.
5. Ejecuta migraciones y crea el usuario inicial:

```bash
npm run bootstrap
```

6. Inicia la aplicacion:

```bash
npm start
```

## Variables de entorno

El archivo de ejemplo es `.env.example`.

| Variable | Descripcion | Valor por defecto |
| --- | --- | --- |
| `PORT` | Puerto HTTP de la aplicacion | `3000` |
| `DB_PATH` | Ruta de la base SQLite principal | `database/gestpyme.sqlite` |
| `UPLOAD_DIR` | Carpeta para adjuntos | `uploads` |
| `MAX_FILE_SIZE_MB` | Tamano maximo por archivo | `5` |
| `SESSION_SECRET` | Secreto de sesiones | `gestpyme-dev-secret` en desarrollo |
| `SESSION_MAX_AGE` | Vigencia de la cookie de sesion | `7200000` |
| `ADMIN_NAME` | Nombre del usuario administrador inicial | `Administrador` |
| `ADMIN_EMAIL` | Correo del admin inicial | `admin@gestpyme.pe` |
| `ADMIN_PASSWORD` | Password inicial del admin | `GestPyme123!` |
| `ADMIN_ROLE` | Rol del admin inicial | `admin` |
| `SMTP_HOST` | Host SMTP para notificaciones | vacio |
| `SMTP_PORT` | Puerto SMTP | `587` |
| `SMTP_SECURE` | Uso de TLS/SSL | `false` |
| `SMTP_USER` | Usuario SMTP | vacio |
| `SMTP_PASS` | Password SMTP | vacio |
| `SMTP_FROM` | Remitente de correo | vacio |
| `GROQ_API_KEY` | Clave para el asistente IA | vacio |
| `GROQ_MODEL` | Modelo remoto para IA | `llama-3.1-8b-instant` |
| `GROQ_MAX_COMPLETION_TOKENS` | Limite de tokens de salida | `220` |

## Scripts disponibles

Definidos en `package.json`:

- `npm run dev`: arranca con `nodemon`.
- `npm start`: arranque normal con Node.js.
- `npm run migrate`: ejecuta migraciones.
- `npm run bootstrap`: prepara la base y crea el admin inicial.
- `npm run check`: valida sintaxis de `app.js`.
- `npm test`: ejecuta pruebas y chequeo de sintaxis.

## Arranque

El punto de entrada es `app.js`.

Comportamiento relevante:

- Carga `dotenv`.
- Verifica `SESSION_SECRET` y emite advertencia si falta.
- Asegura la carpeta de uploads.
- Monta `express-session` usando `connect-sqlite3`.
- Registra vistas EJS en `views/`.
- Sirve contenido estatico desde `public/`.
- Monta la API y las paginas protegidas.
- Ejecuta `runMigrations()` antes de levantar el servidor.
- Ejecuta `ensureDefaultAdminUser()` para garantizar acceso inicial.
- En desarrollo intenta abrir el navegador automaticamente con `open`.

## Autenticacion y permisos

La autenticacion se basa en sesiones almacenadas en SQLite.

### Sesion

- La cookie es `httpOnly`.
- `sameSite` se configura como `lax`.
- `secure` se activa en produccion.
- El tiempo de vida se controla con `SESSION_MAX_AGE`.

### Usuario autenticado

El middleware `hydrateCurrentUser` carga el usuario desde la sesion y lo expone en:

- `req.user`
- `res.locals.currentUser`
- `res.locals.isAuthenticated`

### Roles

Los roles definidos por el sistema son:

- `admin`
- `operador`

Reglas principales:

- `requireAuth` protege paginas y endpoints API.
- `requireRole('admin', 'operador')` permite escritura operacional.
- Algunas acciones de desactivacion quedan limitadas a `admin`.

### Credenciales iniciales

El script de bootstrap crea o actualiza el usuario administrador inicial con los valores de:

- `ADMIN_NAME`
- `ADMIN_EMAIL`
- `ADMIN_PASSWORD`
- `ADMIN_ROLE`

## Modulos funcionales

### Dashboard

- Resumen ejecutivo del negocio.
- Indicadores de ingresos, gastos, cobranzas, pagos y obras activas.
- Alertas por vencimientos y focos de revision.

### Clientes

- Alta, edicion, listado y desactivacion.
- Relacion con obras, cobros y presupuestos.

### Proveedores

- Alta, edicion, listado y desactivacion.
- Relacion con cotizaciones, gastos y compras.

### Obras

- Alta, edicion y cierre de obras.
- Asociacion con cliente.
- Seguimiento de presupuesto, fechas y estado.

### Categorias

- Administracion de categorias para gastos operativos y compras de bienes.
- Soporta presupuesto mensual, mes y anio.

### Cobros

- Registro de ingresos por obra y cliente.
- Adjuntos en comprobantes.
- Cambio de estado y listado filtrable.

### Presupuestos

- Solicitudes vinculadas a clientes.
- Aprobacion o rechazo.
- Vinculacion opcional con una obra.

### Cotizaciones

- Registro de ofertas de proveedores para obras.
- Aprobacion o rechazo.
- Vinculacion opcional con factura de compra.

### Gastos operativos

- Registro de egresos operativos por factura.
- Archivo adjunto.
- Pago manual y control de estado.

### Compras de bienes

- Registro de compras ligadas a obra, proveedor y categoria.
- Captura de nombre del bien, cantidad y tipo/estado del bien.
- Adjuntos y control de pago.

### Rentabilidad

- Ranking financiero por obra.
- Utilidad, ingresos, egresos y margen.

### Reportes

- Reporte mensual.
- Reporte de rentabilidad.
- Exportacion a PDF, CSV y XLSX.

### Asistente IA

- Consulta contextual por modulo.
- Lectura de snapshot del negocio.
- Respuestas orientadas a diagnostico, riesgos y acciones.

### Auditoria y notificaciones

- `audit_logs` guarda trazabilidad de cambios relevantes.
- El dashboard puede disparar un resumen de alertas vencidas por correo, si la configuracion SMTP esta disponible.

## Endpoints

### Autenticacion

| Metodo | Ruta | Descripcion |
| --- | --- | --- |
| `GET` | `/login` | Renderiza login |
| `POST` | `/api/auth/login` | Inicia sesion |
| `POST` | `/api/auth/logout` | Cierra sesion |
| `DELETE` | `/api/auth/logout` | Cierra sesion |
| `POST` | `/logout` | Cierra sesion |

### Paginas web

Todas estas rutas requieren autenticacion:

| Metodo | Ruta | Vista |
| --- | --- | --- |
| `GET` | `/` | Dashboard |
| `GET` | `/proveedores` | Proveedores |
| `GET` | `/clientes` | Clientes |
| `GET` | `/obras` | Obras |
| `GET` | `/categorias` | Categorias |
| `GET` | `/cobros` | Cobros |
| `GET` | `/presupuestos` | Presupuestos |
| `GET` | `/cotizaciones` | Cotizaciones |
| `GET` | `/gastos` | Gastos operativos |
| `GET` | `/compras` | Compras de bienes |
| `GET` | `/rentabilidad` | Rentabilidad |
| `GET` | `/reportes` | Reportes |
| `GET` | `/asistente` | Asistente IA |

### API principal

#### Dashboard y rentabilidad

| Metodo | Ruta | Descripcion |
| --- | --- | --- |
| `GET` | `/api/dashboard` | Resumen general con alertas |
| `GET` | `/api/rentabilidad` | Ranking de rentabilidad |

#### Proveedores

| Metodo | Ruta | Descripcion |
| --- | --- | --- |
| `GET` | `/api/proveedores` | Listado |
| `POST` | `/api/proveedores` | Crear |
| `PUT` | `/api/proveedores/:id` | Actualizar |
| `PATCH` | `/api/proveedores/:id/desactivar` | Desactivar |

#### Clientes

| Metodo | Ruta | Descripcion |
| --- | --- | --- |
| `GET` | `/api/clientes` | Listado |
| `POST` | `/api/clientes` | Crear |
| `PUT` | `/api/clientes/:id` | Actualizar |
| `PATCH` | `/api/clientes/:id/desactivar` | Desactivar |

#### Obras

| Metodo | Ruta | Descripcion |
| --- | --- | --- |
| `GET` | `/api/obras` | Listado |
| `POST` | `/api/obras` | Crear |
| `PUT` | `/api/obras/:id` | Actualizar |
| `PATCH` | `/api/obras/:id/cerrar` | Cerrar obra |

#### Categorias

| Metodo | Ruta | Descripcion |
| --- | --- | --- |
| `GET` | `/api/categorias` | Listado |
| `POST` | `/api/categorias` | Crear |
| `PUT` | `/api/categorias/:id` | Actualizar |

#### Cobros

| Metodo | Ruta | Descripcion |
| --- | --- | --- |
| `GET` | `/api/cobros` | Listado |
| `POST` | `/api/cobros` | Crear con adjunto |
| `PUT` | `/api/cobros/:id` | Actualizar con adjunto |

#### Presupuestos

| Metodo | Ruta | Descripcion |
| --- | --- | --- |
| `GET` | `/api/presupuestos` | Listado |
| `POST` | `/api/presupuestos` | Crear |
| `PUT` | `/api/presupuestos/:id` | Actualizar |
| `PATCH` | `/api/presupuestos/:id/aprobar` | Aprobar |
| `PATCH` | `/api/presupuestos/:id/rechazar` | Rechazar |

#### Cotizaciones

| Metodo | Ruta | Descripcion |
| --- | --- | --- |
| `GET` | `/api/cotizaciones` | Listado |
| `POST` | `/api/cotizaciones` | Crear |
| `PUT` | `/api/cotizaciones/:id` | Actualizar |
| `PATCH` | `/api/cotizaciones/:id/aprobar` | Aprobar |
| `PATCH` | `/api/cotizaciones/:id/rechazar` | Rechazar |

#### Gastos

| Metodo | Ruta | Descripcion |
| --- | --- | --- |
| `GET` | `/api/gastos` | Listado |
| `POST` | `/api/gastos` | Crear con adjunto |
| `PUT` | `/api/gastos/:id` | Actualizar con adjunto |
| `PATCH` | `/api/gastos/:id/pagar` | Marcar como pagado |

#### Compras

| Metodo | Ruta | Descripcion |
| --- | --- | --- |
| `GET` | `/api/compras` | Listado |
| `POST` | `/api/compras` | Crear con adjunto |
| `PUT` | `/api/compras/:id` | Actualizar con adjunto |
| `PATCH` | `/api/compras/:id/pagar` | Marcar como pagado |

#### Reportes

| Metodo | Ruta | Descripcion |
| --- | --- | --- |
| `GET` | `/api/reportes/mensual` | Reporte mensual en PDF, CSV o XLSX |
| `GET` | `/api/reportes/rentabilidad` | Reporte de rentabilidad en PDF, CSV o XLSX |

#### Asistente

| Metodo | Ruta | Descripcion |
| --- | --- | --- |
| `POST` | `/api/asistente/consultar` | Consulta al asistente IA |

## Modelo de datos

Las entidades Sequelize se definen en `models/` y las relaciones se registran en `models/index.js`.

### Tablas principales

- `users`
- `proveedores`
- `clientes`
- `obras`
- `cobros`
- `categorias`
- `presupuestos`
- `cotizaciones`
- `gastos_operativos`
- `compras_bienes`
- `audit_logs`
- `schema_migrations`
- `Sessions`

### Relaciones principales

- Un cliente tiene muchas obras.
- Un cliente tiene muchos cobros.
- Una obra pertenece a un cliente.
- Una obra tiene muchos cobros, gastos, compras, presupuestos y cotizaciones.
- Un proveedor tiene muchas cotizaciones, gastos y compras.
- Una categoria tiene muchos gastos y compras.
- Un presupuesto puede quedar asociado a una obra.
- Una cotizacion puede convertirse en compra vinculada.
- Un usuario tiene registros en audit logs.

## Servicios internos

Los servicios concentran la logica mas importante del dominio:

- `services/gestpymeService.js`: CRUD, consultas agregadas, alertas, dashboard y rentabilidad.
- `services/reportService.js`: construccion y exportacion de reportes.
- `services/asistenteService.js`: contexto, prompts y respuestas del asistente IA.
- `services/userService.js`: autenticacion, serializacion de usuario y usuario administrador inicial.
- `services/auditService.js`: escritura de auditoria.
- `services/notificationService.js`: envio de correos de notificacion.
- `services/proveedorService.js`: reglas y operaciones asociadas a proveedores.
- `services/registroService.js`: logica de registros de compras y gastos.

### Observaciones de esquema

- `schema_migrations` registra migraciones ejecutadas.
- `Sessions` almacena sesiones de `connect-sqlite3`.
- `users` incluye control de intentos fallidos y bloqueo temporal.
- Existen indices unicos en identificadores fiscales y numeros de factura por proveedor.

## Adjuntos y uploads

Los archivos subidos se gestionan con `middleware/upload.js`.

### Reglas

- Tamano maximo configurable por `MAX_FILE_SIZE_MB`.
- Tipos permitidos por defecto:
  - `application/pdf`
  - `image/jpeg`
  - `image/png`
- Los nombres se sanitizan y se les antepone un UUID.
- Los adjuntos se guardan en `uploads/` o en la subcarpeta configurada.

### Casos de uso

- Comprobantes de cobro.
- Adjuntos de gasto.
- Adjuntos de compra.

## Reportes

La logica de reportes esta en `services/reportService.js` y usa `pdfkit` y `xlsx`.

### Formatos soportados

- `pdf` por defecto.
- `csv`.
- `xlsx`.

### Reporte mensual

Incluye:

- Resultado del mes.
- Ingresos del mes.
- Gastos del mes.
- Cuentas por cobrar.
- Cuentas por pagar.
- Obras activas.
- Alertas operativas.

### Reporte de rentabilidad

Incluye:

- Ranking de obras.
- Ingresos.
- Egresos.
- Utilidad.
- Margen porcentual.
- Resumen gerencial con mejor y peor obra.

## Asistente IA

El asistente se monta en `/asistente` y responde por API en `/api/asistente/consultar`.

### Configuracion

La configuracion se obtiene desde variables de entorno y se expone al front para consulta contextual.

### Entradas

- `scope`
- `question`
- `month`
- `year`

### Uso esperado

- Analisis general del negocio.
- Diagnostico de cobros, gastos, compras y rentabilidad.
- Recomendaciones accionables por modulo.

## Manejo de errores

El middleware `middleware/errorHandler.js` normaliza:

- errores 404
- errores de validacion de Sequelize
- errores de unicidad
- errores genericos

### Respuesta API

En rutas que comienzan con `/api/`, el sistema responde en JSON con:

- `error`
- `details`

### Respuesta web

En vistas normales renderiza la pantalla de error correspondiente.

## Pruebas

El proyecto incluye pruebas en `tests/`.

Actualmente existe una prueba de reglas de registro:

- `tests/registroRules.test.js`

Comando de ejecucion:

```bash
npm test
```

## Despliegue

### Produccion

- Define `NODE_ENV=production`.
- Usa un `SESSION_SECRET` fuerte y unico.
- Configura SMTP si deseas notificaciones por correo.
- Configura la clave del asistente IA si vas a usarlo.
- Revisa que la carpeta de uploads tenga permisos de escritura.

### Base de datos

La app usa SQLite, por lo que el archivo de base debe persistir entre reinicios.

### Mantenimiento

- Las migraciones se ejecutan al arrancar.
- Si agregas una migracion nueva, el sistema la aplicara automaticamente en el siguiente inicio.
- El usuario administrador inicial se reasegura en cada bootstrap y arranque segun la logica de `services/userService.js`.

## Archivos clave

- `app.js`: arranque y montaje de la aplicacion.
- `database/migrate.js`: ejecutor de migraciones.
- `services/gestpymeService.js`: logica central del dominio.
- `services/reportService.js`: reportes y exportaciones.
- `services/asistenteService.js`: asistente IA.
- `services/userService.js`: autenticacion y admin inicial.
- `middleware/auth.js`: proteccion y roles.
- `middleware/upload.js`: manejo de archivos.
- `middleware/errorHandler.js`: errores y validaciones.

---

Si quieres, en el siguiente paso puedo convertir este README en una version aun mas profesional con:

1. Diagrama de arquitectura.
2. Tabla detallada de modelos/campos.
3. Ejemplos de payloads JSON para cada endpoint.
4. Guia de despliegue en produccion paso a paso.
