# Plan — Sesiones, Permisos dinámicos y lógica HR en el backend

> Diseño derivado de explorar los 3 repos: `Microservicios` (auth + recursos-humanos), `GatewayRototec` y este front `RototecRH`. Fuente: exploración del 2026-05-29.

## 0. Decisiones tomadas (2026-05-29)

1. **Una sola BD: `INTRA_ROTOTEC`.** El `INTRA_ROTOTEC_QA` de auth es solo el localhost del dev; en el diseño se asume que todo (auth, RRHH, gateway, `tSesiones`, permisos) vive en `INTRA_ROTOTEC`. No hay split real.
2. **Sesiones revocables.** El guard valida en cada request que la sesión siga viva en `tSesiones`; logout corta acceso de inmediato.
3. **Permisos nuevos, no legacy.** `tPermisos`/`tPermisosXRol`/`tSeccionesPorRol` son legacy (nombres literales de activities de apps Android / menú Intranet) y **no se tocan**. Se diseña un RBAC nuevo y limpio: `tAccesos` + `tAccesosPorRol` (§5), claim `accesos` en el JWT.
4. **Login por PIN: intencional.** El login por id de empleado + PIN se deja como está (es a propósito para la app móvil); no se toca (§7.2).
5. **Esta iteración = solo diseño.** No se toca código hasta confirmar este documento.

## 1. Cómo está armado el backend hoy (realidad, no el README)

- **Gateway** (`/home/plemus/WebstormProjects/GatewayRototec`, repo aparte): Fastify 5 + `@fastify/http-proxy`, puerto **3001**. El ruteo es **data-driven** desde la tabla `dbo.gateway_rutas` (en `INTRA_ROTOTEC`). Para `/api/v2/<x>` recorta `prefijo_entrada` y antepone `prefijo_reescritura`, reenviando al upstream `${codigo_servicio}_URL` (env del gateway). **Es un proxy ciego**: no valida JWT, reenvía `Authorization` tal cual.
- **auth** (`Microservicios/apps/domains/global/auth`): NestJS sobre Fastify, puerto **4012**, prefijo global `/auth`. TypeORM mssql → **`INTRA_ROTOTEC_QA`**. Login `POST /auth/user/login` (bcrypt contra `tUsuarios.PassW`) → arma permisos+secciones por rol → firma JWT con `jsonwebtoken` (`JWT_SECRET`, `expiresIn: '730d'`). **Stateless: no hay sesiones, ni refresh, ni revocación.** Devuelve `{ ok, message, data: "<jwt>" }` (el JWT es un string crudo en `data`).
- **recursos-humanos** (`Microservicios/apps/domains/rototec/recursos-humanos`): NestJS sobre Fastify, puerto **4007**, prefijo global `rrhh`. TypeORM mssql → **`INTRA_ROTOTEC`**, `synchronize:false`, entidades por glob `**/*.entity.{ts,js}`. Tiene lógica real **pero de control de producción** (acabados/rotomoldeo/Biotime), **no de nómina**. Sin guards, CORS `*`.
- **Validación de token**: no hay lib compartida. Cada servicio que quiere protegerse **copia** `guards/jwt.guard.ts` + `utils/jwt.helper.ts` (`jwt.verify` con el `JWT_SECRET` compartido). RRHH hoy **no aplica ningún guard**. No existe `@Roles`/`@RequierePermiso` en ningún lado: el rol/permisos viajan en el token pero **nadie los chequea para autorizar** (solo `/auth/me` los recalcula para el menú).

## 2. Esquema existente relevante (SQL Server, schema `dbo`)

```
tUsuarios(ID int IDENTITY PK, Username varchar(80), PassW varchar(256) [bcrypt], Email varchar(100),
          Rol int → tRoles.ID, IdEmpleado int → tEmpleados.id, UserUpdate, UserCreate, Created, Updated,
          EsVendedor varchar(2), IdVendedorSAP int, Activo bit, Ubicacion int → tUbicaciones.Id)
tRoles(ID PK, ROL varchar(80), Descripcion varchar(300), UserUpdate, UserCreate, Created, Updated)
tPermisos(id PK, Permiso varchar(100), path varchar(250), Descripcion varchar(200), id_app int, +audit)
tPermisosXRol(ID PK, Permiso int → tPermisos.id, ROL int → tRoles.ID, +audit)   ← RBAC rol↔permiso YA dinámico
tSeccionesPorRol / tSecciones / tSubSecciones    ← menú del Intranet web (otro eje RBAC)
tEmpleados(id PK, ~90 cols snake_case, incl. salario_base_contrato float, bonificacion_decreto_base_contrato float)
gateway_rutas(... codigo_servicio, prefijo_entrada, prefijo_reescritura, esta_activa, prioridad ...)
```

**Convenciones**: tablas `t`+PascalCase; relación con sufijo `XRol`/`PorRol`; auditoría `UserCreate/UserUpdate/Created/Updated`. PK con nombre inconsistente (`ID`/`id`/`Id`) — las tablas nuevas (`tUbicaciones`, `tFaceReference`, `tSesiones`) usan `Id`.

## 3. tSesiones — la tabla que diste y los ajustes propuestos

Tu tabla:
```sql
tSesiones(Id uniqueidentifier PK default newid(), Token nvarchar(500) unique,
          IdUsuario int → tUsuarios(ID), CreatedAt, RefreshedAt, LastSeen)
```

Problema: el JWT actual lleva `permisos[]` + `secciones[]` + alias legacy → fácilmente **supera 500 chars**, y `UNIQUE` sobre `nvarchar(max)` no es válido en SQL Server. Solución: **la sesión se identifica por su `Id` (GUID), que se incrusta en el JWT como claim `sid`**; el lookup/revocación es por `Id` (la PK, rapidísimo). El JWT completo se guarda en `Token nvarchar(max)` solo para auditoría, y un `TokenHash` da unicidad opcional.

```sql
CREATE TABLE dbo.tSesiones (
    Id          uniqueidentifier NOT NULL CONSTRAINT DF_tSesiones_Id DEFAULT newid()
                                 CONSTRAINT PK_tSesiones PRIMARY KEY,
    IdUsuario   int              NOT NULL CONSTRAINT FK_tSesiones_Usuario REFERENCES dbo.tUsuarios(ID),
    Token       nvarchar(max)    NULL,                 -- JWT completo (auditoría / recuperación)
    TokenHash   char(64)         NOT NULL              -- SHA-256(JWT) para lookup único
                                 CONSTRAINT UQ_tSesiones_TokenHash UNIQUE,
    IpAddress   varchar(45)      NULL,
    UserAgent   nvarchar(400)    NULL,
    CreatedAt   datetime         NOT NULL CONSTRAINT DF_tSesiones_Created   DEFAULT getdate(),
    RefreshedAt datetime         NOT NULL CONSTRAINT DF_tSesiones_Refreshed DEFAULT getdate(),
    LastSeen    datetime         NOT NULL CONSTRAINT DF_tSesiones_LastSeen  DEFAULT getdate(),
    ExpiresAt   datetime         NULL                  -- expiración de la sesión (más corta que el JWT 730d)
);
CREATE INDEX IX_tSesiones_IdUsuario ON dbo.tSesiones(IdUsuario);
```

(Versión mínima si prefieres no cambiar nada: mantener tu tabla, solo `ALTER COLUMN Token nvarchar(max)` y quitar el `UNIQUE` de `Token`, matchear por `Id`/`sid`.)

## 4. Flujo de sesiones (additivo — no rompe el login legacy del Intranet)

- `POST /auth/user/login?session=true` → autentica igual, **además** crea fila en `tSesiones` (con el JWT y su hash), incluye `sid = tSesiones.Id` como claim del token, y responde `{ token, session: { id, createdAt, expiresAt } }`. Sin el flag → comportamiento actual intacto (stateless, sin `sid`).
- `POST /auth/session/logout` (Bearer) → `DELETE FROM tSesiones WHERE Id = @sid`.
- `POST /auth/session/logout-all` (opcional) → borra todas las del `IdUsuario`.
- **Guard revocable** (nuevo, en auth y copiado a RRHH): si el token trae `sid`, valida que la sesión exista y no esté expirada (`SELECT 1 FROM tSesiones WHERE Id=@sid AND (ExpiresAt IS NULL OR ExpiresAt > getdate())`), refresca `LastSeen` (throttled). Si no trae `sid` → cae al modo stateless (compatibilidad legacy). **(DECISIÓN: revocable vs solo-registro)**

**Puntos a tocar en auth**: `signToken()` (`utils/auth.helper.ts`) para inyectar `sid`; `user.service.ts` `loginUser`/`loginByPin` para crear la sesión; nueva entity `Sesion` (registrarla en el array `entities` de `app.module.ts`); nuevo repo; nuevo controller `session.controller.ts`.

## 5. Permisos dinámicos — **RBAC nuevo** (las tablas legacy no se tocan)

Las `tPermisos`/`tPermisosXRol` legacy guardan nombres literales de activities Android → se quedan como están. Se crea un modelo nuevo y limpio basado en **claves tipo slug** `<modulo>.<recurso>.<accion>` (ej. `rrhh.empleados.crear`, `rrhh.planilla.cerrar`), asignables a roles dinámicamente.

```sql
-- Catálogo de accesos (clave única, agrupada por módulo)
CREATE TABLE dbo.tAccesos (
    Id          int IDENTITY    NOT NULL CONSTRAINT PK_tAccesos PRIMARY KEY,
    Clave       varchar(120)    NOT NULL CONSTRAINT UQ_tAccesos_Clave UNIQUE,  -- 'rrhh.empleados.crear'
    Modulo      varchar(60)     NOT NULL,                                       -- 'rrhh' (agrupador para la UI admin)
    Descripcion varchar(200)    NULL,
    Activo      bit             NOT NULL CONSTRAINT DF_tAccesos_Activo DEFAULT 1,
    UserCreate  int NULL, UserUpdate int NULL,
    Created     datetime NOT NULL CONSTRAINT DF_tAccesos_Created DEFAULT getdate(),
    Updated     datetime NULL
);

-- Asignación rol↔acceso (dinámica: agregar acceso a un rol = 1 INSERT)
CREATE TABLE dbo.tAccesosPorRol (
    Id          int IDENTITY    NOT NULL CONSTRAINT PK_tAccesosPorRol PRIMARY KEY,
    IdRol       int             NOT NULL CONSTRAINT FK_tAccesosPorRol_Rol    REFERENCES dbo.tRoles(ID),
    IdAcceso    int             NOT NULL CONSTRAINT FK_tAccesosPorRol_Acceso REFERENCES dbo.tAccesos(Id),
    UserCreate  int NULL,
    Created     datetime NOT NULL CONSTRAINT DF_tAccesosPorRol_Created DEFAULT getdate(),
    CONSTRAINT UQ_tAccesosPorRol UNIQUE (IdRol, IdAcceso)
);
```

(Opcional v2 — override por usuario: `tAccesosPorUsuario(Id, IdUsuario → tUsuarios.ID, IdAcceso, Conceder bit)` para conceder/denegar accesos puntuales por encima del rol. No entra en v1.)

(Opcional — aislar de lo legacy con un schema propio `auth.Accesos` / `auth.AccesosPorRol` en vez de `dbo`. Más limpio pero el repo hoy usa todo en `dbo`; queda a tu criterio.)

**Resolución y enforcement:**
- En login, auth resuelve `accesos: string[]` (las `Clave` del rol vía `tAccesosPorRol` JOIN `tAccesos`) y las mete en el JWT como claim **`accesos`** (distinto del `permisos` legacy, que se queda con los nombres de activities Android — no colisionan).
- Como las sesiones son revocables (el guard ya golpea BD por `sid`), se pueden **re-resolver los accesos en cada validación de sesión** → un cambio de accesos surte efecto sin re-login. (Alternativa más barata: resolverlos solo al login y refrescar al renovar sesión.)
- `@RequiereAcceso('rrhh.empleados.crear')` (decorator `SetMetadata`) + `AccesosGuard` que corre después del guard de sesión, lee la clave requerida y valida contra `req.user.accesos`. Soporta comodín opcional (`rrhh.*`, `rrhh.empleados.*`) para roles admin.
- Endpoints admin en auth: CRUD de `tAccesos`, asignar/revocar `tAccesosPorRol`, y listar accesos por rol (para una pantalla de administración de roles en el front).

## 6. Lógica HR en recursos-humanos

El front espera: empleados (CRUD+baja+reactivar), turnos (catálogo diurno/nocturno), asignaciones-turno, ausencias, atrasos, asistencias, bonificaciones, planillas. **Hoy el MS no tiene ninguno** con contrato coincidente (es producción).

- **Reusar `tEmpleados`** como maestro (ya tiene `salario_base_contrato`, `bonificacion_decreto_base_contrato`). Hay que mapear el tipo `Empleado` del front (diseñado contra el mock) ↔ las ~90 columnas reales.
- **Crear tablas nuevas** (SQL manual, `synchronize:false`) para los conceptos de nómina que no existen: `tTurnos`, `tAsignacionesTurno`, `tAusencias`, `tAtrasos`, `tAsistencias`, `tBonificaciones`, `tPlanillas` + `tPlanillaLineas`. (Las asistencias podrían venir de Biotime en vez de tabla propia — a confirmar.)
- **Módulos NestJS nuevos** en RRHH siguiendo el patrón existente (controller + service + repo custom + entity).
- **Ruteo gateway**: insertar fila en `gateway_rutas` (`prefijo_entrada='/api/v2/rrhh'` → `rewritePrefix='/rrhh'`, `codigo_servicio='RRHH'`) y `RRHH_URL=http://<host>:4007` en el `.env` del gateway. El front entonces llama `/api/v2/rrhh/empleados` (ajustar endpoints o `VITE_API_BASE_URL` a `.../api/v2/rrhh`).

Esto es el bloque más grande (es construir el backend de nómina casi entero) → va como fase posterior a auth/sesiones.

## 7. Riesgos críticos a confirmar

1. ~~DB split~~ → **resuelto**: todo en `INTRA_ROTOTEC` (QA es solo el localhost del dev). Al implementar en auth habrá que apuntar su `.env` a `INTRA_ROTOTEC`.
2. ~~Dos logins PIN~~ → **intencional**: el login por PIN (`login/pin`, por id de empleado, PIN en texto plano) es a propósito para login por ID de empleado (app móvil/biométrica). Se deja como está; no se toca.
3. **Gateway no autentica** y no hay fila `gateway_rutas` para auth ni RRHH en los repos (viven en la BD viva). Hay que crearlas/confirmarlas.
4. **JWT 730d + `JWT_SECRET` compartido** en todos los MS. Las sesiones mitigan la no-revocación; considerar bajar la vida del token de sesión.
5. **Credenciales en texto plano** en los `.env` versionados (SA / `@dminR0t24`, `JWT_SECRET`). Fuera de alcance pero relevante.

## 8. Estado de implementación — sesiones en auth (hecho)

Implementado en `Microservicios/apps/domains/global/auth` (build `nest build` OK + revisión adversarial aplicada):

- `sql/tSesiones.sql` — DDL final (correr manual en la BD; `synchronize:false`). Id app-assigned (sin `DEFAULT newid()`), `UNIQUE(TokenHash)`, índices en `IdUsuario` y filtrado en `ExpiresAt`.
- `src/user/models/entities/sesion.entity.ts`, `src/session/{sesion.repository,session.service,session.controller,session.module,session.types}.ts`, `src/guards/sesion.guard.ts`.
- `signToken(... sid?)` inyecta el claim `sid`; `loginUser` recibe contexto de sesión y devuelve `{token, session?}`; controller lee `?session=true` + ip/user-agent.
- `crearSesion` usa `insert()` (no `save()`); `SESSION_TTL_DAYS` validado (cae a 30 si la env es inválida, nunca a "sin expiración").

**Decisión aplicada (revisión #3, sev high):** la rama `loginType=PIN` del login principal **no crea sesión revocable** (pasa `null` a `emitir`) — esa ruta no verifica credencial (login por id de empleado, intencional para móvil); las sesiones son solo para el login web username/password. El endpoint dedicado `POST /auth/user/login/pin` queda intacto. *Confirmar si está bien así.*

**Follow-ups (no bloquean):**
- Purga de sesiones vencidas: `DELETE FROM tSesiones WHERE ExpiresAt < GETDATE()` vía `@nestjs/schedule` o SQL Agent job (el índice filtrado ya está).
- Re-resolver permisos/accesos al validar sesión (cuando se implemente el RBAC nuevo §5).
- `SesionGuard` se copiará/compartirá a RRHH cuando se protejan sus endpoints.
```
