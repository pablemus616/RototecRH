# Capacitaciones — Plan 2: Backend Transaccional (asignación + examen tokenizado + calificación)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. Each code step shows COMPLETE code — no placeholders, no "similar to". Follow TDD where indicated: write the failing test, run it (red), implement, run it (green), commit.

**Goal:** Sobre el módulo `capacitaciones` ya creado por el Plan 1 (autoría), agregar el flujo transaccional: asignación de pensums a empleados (primaria por puesto y secundaria), examen tokenizado público con calificación server-side, y la reimplementación en código (sin triggers) de las reglas legacy de **nota → estado de módulo → licencia del header → bono al capacitador**. El corazón de la lógica vive en funciones PURAS testeadas (`lib/calificacion.ts`).

**Architecture:** 6 tablas NUEVAS (PascalCase, PK `Id`) creadas por SQL idempotente (`IF NOT EXISTS`), mapeadas como entidades TypeORM y registradas en `TypeOrmModule.forFeature`. Lógica de cálculo aislada en funciones puras (reciben `ahora: Date` por parámetro, nada de `Date.now` interno) con su `.spec.ts`. Tres services: `AsignacionesService` (explosión de módulos a detalle), `EmpleadosCapService` (lista/detalle con resumen y licencia) y `ExamenService` (token + corrección + persistencia + licencia + bono, orquestando la lib). Controllers delgados bajo `/rrhh/capacitaciones`. Specs estilo plain Jest (`new Service(mockRepo)` / `new Fn()`), sin `TestingModule`.

**Tech Stack:** NestJS + Fastify, TypeORM (MSSQL, `synchronize:false`, `autoLoadEntities:true`), class-validator, Jest. `crypto.randomUUID` (Node nativo) para tokens. Raw query (`repo.query`) solo para `tBonosPorIntento` (config legacy sin entidad).

## Global Constraints

- Ruta raíz del MS: `/home/plemus/WebstormProjects/Microservicios/apps/domains/global/recursos-humanos` (en este plan, `$RH`). Repo git: `/home/plemus/WebstormProjects/Microservicios`. Rama: `feat/capacitaciones-backend` (continúa sobre lo del Plan 1).
- Prefijo global `/rrhh` lo agrega `main.ts` — los `@Controller` NO lo repiten.
- Respuestas auto-envueltas por `GlobalResponseInterceptor` — NUNCA envolver `{ok,message,data}` a mano.
- TypeORM `synchronize:false`: las tablas NO se crean por la entidad. Tablas nuevas se crean por SQL idempotente a mano en `$RH/src/capacitaciones/sql/`.
- Entidades sobre tablas legacy: nombre/columnas EXACTOS, PK `ID` (mayúsculas) salvo `tEmpleados`/`tPuestos` (PK `id`). Tablas NUEVAS: PascalCase + PK `Id` (como `tAusencias`). Columnas nullable se tipan `T | null`.
- `Empleado` (`src/models/entities/empleado.entity.ts`): PK `id`, FK `idPuesto` (col `id_puesto`), `empresaId` (col `empresa_id`), `estaActivo` (col `esta_activo`, bit), nombres en partes (`nombre`, `apellido`). `tPuestos` PK `id`.
- Las entidades de autoría (`Pensum`, `PensumModulo`, `PensumTema`, `Evaluacion`, `Pregunta`, `Respuesta`) y el módulo `capacitaciones.module.ts` YA EXISTEN (Plan 1). Reusarlas; NO redefinirlas. Recordar: `PensumModulo.bono` es `boolean | null` (flag), `porcentajeAprobacion` y `vigencia` son `number | null`, `Respuesta.respuestaCorrecta` es `boolean`, `Pregunta.puntosPorRespuesta` es `number | null`.
- Validación: `ValidationPipe` global con `whitelist:true, forbidNonWhitelisted:true`. Update DTOs all-optional a mano (no `PartialType`).
- Lógica pura: funciones en `lib/` reciben `ahora: Date` por parámetro; specs con `new Fn()` directo.
- Test runner: `cd $RH && npx jest <ruta>`. Build: `cd $RH && npm run build`. Commits en el repo `Microservicios`.
- **Fuera de alcance de este plan** (son Plan 4 / frontend): la MIGRACIÓN de capacitados vigentes desde las tablas legacy, el diploma DOCX, la reasignación de vencidos/reprobados, y todo el frontend. Aquí solo se construye el backend transaccional + examen + calificación + bono.

---

## File Structure

```
$RH/src/capacitaciones/
├── sql/
│   └── 002-tablas-transaccionales.sql     (NUEVA — 6 tablas IF NOT EXISTS)
├── lib/
│   ├── calificacion.ts                    (NUEVA — lógica pura)
│   └── calificacion.spec.ts               (NUEVA)
├── dto/
│   ├── asignacion.dto.ts                  (NUEVA — CrearAsignacionPrimariaDto, CrearAsignacionSecundariaDto)
│   └── examen.dto.ts                      (NUEVA — GenerarExamenDto, EnviarRespuestasDto)
├── asignaciones.service.ts                (NUEVA)
├── asignaciones.service.spec.ts           (NUEVA)
├── asignaciones.controller.ts             (NUEVA)
├── empleados-cap.service.ts               (NUEVA)
├── empleados-cap.service.spec.ts          (NUEVA)
├── empleados-cap.controller.ts            (NUEVA)
├── examen.service.ts                      (NUEVA)
├── examen.service.spec.ts                 (NUEVA)
├── examen.controller.ts                   (NUEVA)
└── capacitaciones.module.ts               (MODIFICAR — +6 entidades, +servicios, +controllers)

$RH/src/models/entities/
├── cap-asignacion.entity.ts               (NUEVA — tCapAsignacion)
├── cap-asignacion-detalle.entity.ts       (NUEVA — tCapAsignacionDetalle)
├── cap-intento.entity.ts                  (NUEVA — tCapIntento)
├── cap-intento-detalle.entity.ts          (NUEVA — tCapIntentoDetalle)
├── cap-examen-token.entity.ts             (NUEVA — tCapExamenToken)
└── cap-bono.entity.ts                     (NUEVA — tCapBono)
```

---

### Task 1: SQL idempotente + 6 entidades nuevas + registro en el módulo

**Files:**
- Create: `$RH/src/capacitaciones/sql/002-tablas-transaccionales.sql`
- Create: `$RH/src/models/entities/cap-asignacion.entity.ts`
- Create: `$RH/src/models/entities/cap-asignacion-detalle.entity.ts`
- Create: `$RH/src/models/entities/cap-intento.entity.ts`
- Create: `$RH/src/models/entities/cap-intento-detalle.entity.ts`
- Create: `$RH/src/models/entities/cap-examen-token.entity.ts`
- Create: `$RH/src/models/entities/cap-bono.entity.ts`
- Modify: `$RH/src/capacitaciones/capacitaciones.module.ts` (agregar las 6 entidades a `TypeOrmModule.forFeature`)

**Interfaces:**
- Produces: entidades `CapAsignacion`, `CapAsignacionDetalle`, `CapIntento`, `CapIntentoDetalle`, `CapExamenToken`, `CapBono` (importables desde `../models/entities/*`).

- [ ] **Step 1: Crear el SQL idempotente**

`sql/002-tablas-transaccionales.sql`:
```sql
-- Tablas transaccionales de capacitaciones (Plan 2). Idempotente: solo crea lo que falta.
-- Keyeadas por EmpleadoId INT -> tEmpleados.id (sin el ID_FH string del legacy).

IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'tCapAsignacion' AND schema_id = SCHEMA_ID('dbo'))
BEGIN
  CREATE TABLE dbo.tCapAsignacion (
    Id INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_tCapAsignacion PRIMARY KEY,
    EmpleadoId INT NOT NULL,
    IdPensum INT NOT NULL,
    Tipo NVARCHAR(20) NOT NULL,            -- 'primaria' | 'secundaria'
    FechaInicio DATE NULL,
    LicenciaActiva BIT NOT NULL CONSTRAINT DF_tCapAsignacion_LicenciaActiva DEFAULT 0,
    VenceLicencia DATE NULL,
    FechaFinaliza DATETIME NULL,
    CreadoEn DATETIME NOT NULL CONSTRAINT DF_tCapAsignacion_CreadoEn DEFAULT GETDATE()
  );
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'tCapAsignacionDetalle' AND schema_id = SCHEMA_ID('dbo'))
BEGIN
  CREATE TABLE dbo.tCapAsignacionDetalle (
    Id INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_tCapAsignacionDetalle PRIMARY KEY,
    IdAsignacion INT NOT NULL,
    IdModulo INT NOT NULL,                  -- tPensumDetalle.ID
    Puntuacion INT NULL,
    Estado NVARCHAR(20) NOT NULL CONSTRAINT DF_tCapAsignacionDetalle_Estado DEFAULT 'Pendiente',
    Intentos INT NOT NULL CONSTRAINT DF_tCapAsignacionDetalle_Intentos DEFAULT 0,
    CreadoEn DATETIME NOT NULL CONSTRAINT DF_tCapAsignacionDetalle_CreadoEn DEFAULT GETDATE()
  );
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'tCapIntento' AND schema_id = SCHEMA_ID('dbo'))
BEGIN
  CREATE TABLE dbo.tCapIntento (
    Id INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_tCapIntento PRIMARY KEY,
    IdAsignacionDetalle INT NOT NULL,
    IdEvaluacion INT NOT NULL,
    Puntaje INT NOT NULL,
    Aprobado BIT NOT NULL,
    TomadoEn DATETIME NOT NULL CONSTRAINT DF_tCapIntento_TomadoEn DEFAULT GETDATE()
  );
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'tCapIntentoDetalle' AND schema_id = SCHEMA_ID('dbo'))
BEGIN
  CREATE TABLE dbo.tCapIntentoDetalle (
    Id INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_tCapIntentoDetalle PRIMARY KEY,
    IdIntento INT NOT NULL,
    IdPregunta INT NOT NULL,
    IdRespuestaElegida INT NULL,
    Correcta BIT NOT NULL,
    Puntos FLOAT NOT NULL CONSTRAINT DF_tCapIntentoDetalle_Puntos DEFAULT 0
  );
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'tCapExamenToken' AND schema_id = SCHEMA_ID('dbo'))
BEGIN
  CREATE TABLE dbo.tCapExamenToken (
    Token NVARCHAR(64) NOT NULL CONSTRAINT PK_tCapExamenToken PRIMARY KEY,
    IdAsignacionDetalle INT NOT NULL,
    IdEvaluacion INT NOT NULL,
    ExpiraEn DATETIME NOT NULL,
    UsadoEn DATETIME NULL,
    CreadoEn DATETIME NOT NULL CONSTRAINT DF_tCapExamenToken_CreadoEn DEFAULT GETDATE()
  );
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'tCapBono' AND schema_id = SCHEMA_ID('dbo'))
BEGIN
  CREATE TABLE dbo.tCapBono (
    Id INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_tCapBono PRIMARY KEY,
    CapacitadorId INT NOT NULL,
    EmpleadoId INT NOT NULL,
    IdModulo INT NOT NULL,
    Intentos INT NOT NULL,
    Monto FLOAT NOT NULL,
    Pagado BIT NOT NULL CONSTRAINT DF_tCapBono_Pagado DEFAULT 0,
    CreadoEn DATETIME NOT NULL CONSTRAINT DF_tCapBono_CreadoEn DEFAULT GETDATE()
  );
END
GO
```

- [ ] **Step 2: Crear las 6 entidades**

`cap-asignacion.entity.ts`:
```typescript
import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'tCapAsignacion', schema: 'dbo' })
export class CapAsignacion {
  @PrimaryGeneratedColumn({ name: 'Id' })
  id: number;

  @Column({ name: 'EmpleadoId', type: 'int' })
  empleadoId: number;

  @Column({ name: 'IdPensum', type: 'int' })
  idPensum: number;

  @Column({ name: 'Tipo', type: 'nvarchar', length: 20 })
  tipo: string; // 'primaria' | 'secundaria'

  @Column({ name: 'FechaInicio', type: 'date', nullable: true })
  fechaInicio: Date | null;

  @Column({ name: 'LicenciaActiva', type: 'bit', default: false })
  licenciaActiva: boolean;

  @Column({ name: 'VenceLicencia', type: 'date', nullable: true })
  venceLicencia: Date | null;

  @Column({ name: 'FechaFinaliza', type: 'datetime', nullable: true })
  fechaFinaliza: Date | null;

  @Column({ name: 'CreadoEn', type: 'datetime' })
  creadoEn: Date;
}
```

`cap-asignacion-detalle.entity.ts`:
```typescript
import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'tCapAsignacionDetalle', schema: 'dbo' })
export class CapAsignacionDetalle {
  @PrimaryGeneratedColumn({ name: 'Id' })
  id: number;

  @Column({ name: 'IdAsignacion', type: 'int' })
  idAsignacion: number;

  @Column({ name: 'IdModulo', type: 'int' })
  idModulo: number;

  @Column({ name: 'Puntuacion', type: 'int', nullable: true })
  puntuacion: number | null;

  @Column({ name: 'Estado', type: 'nvarchar', length: 20, default: 'Pendiente' })
  estado: string; // 'Pendiente' | 'Aprobado' | 'No aprobado'

  @Column({ name: 'Intentos', type: 'int', default: 0 })
  intentos: number;

  @Column({ name: 'CreadoEn', type: 'datetime' })
  creadoEn: Date;
}
```

`cap-intento.entity.ts`:
```typescript
import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'tCapIntento', schema: 'dbo' })
export class CapIntento {
  @PrimaryGeneratedColumn({ name: 'Id' })
  id: number;

  @Column({ name: 'IdAsignacionDetalle', type: 'int' })
  idAsignacionDetalle: number;

  @Column({ name: 'IdEvaluacion', type: 'int' })
  idEvaluacion: number;

  @Column({ name: 'Puntaje', type: 'int' })
  puntaje: number;

  @Column({ name: 'Aprobado', type: 'bit' })
  aprobado: boolean;

  @Column({ name: 'TomadoEn', type: 'datetime' })
  tomadoEn: Date;
}
```

`cap-intento-detalle.entity.ts`:
```typescript
import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'tCapIntentoDetalle', schema: 'dbo' })
export class CapIntentoDetalle {
  @PrimaryGeneratedColumn({ name: 'Id' })
  id: number;

  @Column({ name: 'IdIntento', type: 'int' })
  idIntento: number;

  @Column({ name: 'IdPregunta', type: 'int' })
  idPregunta: number;

  @Column({ name: 'IdRespuestaElegida', type: 'int', nullable: true })
  idRespuestaElegida: number | null;

  @Column({ name: 'Correcta', type: 'bit' })
  correcta: boolean;

  @Column({ name: 'Puntos', type: 'float', default: 0 })
  puntos: number;
}
```

`cap-examen-token.entity.ts`:
```typescript
import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity({ name: 'tCapExamenToken', schema: 'dbo' })
export class CapExamenToken {
  @PrimaryColumn({ name: 'Token', type: 'nvarchar', length: 64 })
  token: string;

  @Column({ name: 'IdAsignacionDetalle', type: 'int' })
  idAsignacionDetalle: number;

  @Column({ name: 'IdEvaluacion', type: 'int' })
  idEvaluacion: number;

  @Column({ name: 'ExpiraEn', type: 'datetime' })
  expiraEn: Date;

  @Column({ name: 'UsadoEn', type: 'datetime', nullable: true })
  usadoEn: Date | null;

  @Column({ name: 'CreadoEn', type: 'datetime' })
  creadoEn: Date;
}
```

`cap-bono.entity.ts`:
```typescript
import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'tCapBono', schema: 'dbo' })
export class CapBono {
  @PrimaryGeneratedColumn({ name: 'Id' })
  id: number;

  @Column({ name: 'CapacitadorId', type: 'int' })
  capacitadorId: number;

  @Column({ name: 'EmpleadoId', type: 'int' })
  empleadoId: number;

  @Column({ name: 'IdModulo', type: 'int' })
  idModulo: number;

  @Column({ name: 'Intentos', type: 'int' })
  intentos: number;

  @Column({ name: 'Monto', type: 'float' })
  monto: number;

  @Column({ name: 'Pagado', type: 'bit', default: false })
  pagado: boolean;

  @Column({ name: 'CreadoEn', type: 'datetime' })
  creadoEn: Date;
}
```

- [ ] **Step 3: Registrar las entidades en `capacitaciones.module.ts`**

Agregar los imports al inicio del archivo (junto a los del Plan 1):
```typescript
import { CapAsignacion } from '../models/entities/cap-asignacion.entity';
import { CapAsignacionDetalle } from '../models/entities/cap-asignacion-detalle.entity';
import { CapIntento } from '../models/entities/cap-intento.entity';
import { CapIntentoDetalle } from '../models/entities/cap-intento-detalle.entity';
import { CapExamenToken } from '../models/entities/cap-examen-token.entity';
import { CapBono } from '../models/entities/cap-bono.entity';
import { Empleado } from '../models/entities/empleado.entity';
```

Y agregar las 7 entidades al array de `TypeOrmModule.forFeature` (las del Plan 1 ya están; `Empleado` se necesita para resolver el puesto en la asignación primaria y para el resumen por empleado). El array debe quedar:
```typescript
    TypeOrmModule.forFeature([
      Pensum, PensumModulo, PensumTema, Evaluacion, Pregunta, Respuesta,
      CapAsignacion, CapAsignacionDetalle, CapIntento, CapIntentoDetalle, CapExamenToken, CapBono,
      Empleado,
    ]),
```

- [ ] **Step 4: Verificar build**

Run: `cd /home/plemus/WebstormProjects/Microservicios/apps/domains/global/recursos-humanos && npm run build`
Expected: build sin errores de TypeScript.

- [ ] **Step 5: Aplicar el SQL en la BD (manual)**

Ejecutar `sql/002-tablas-transaccionales.sql` contra `INTRA_ROTOTEC`. Si no hay acceso a la BD ahora, dejar el archivo creado y anotar que debe correrse antes del deploy; no bloquea el build ni los tests con mock.

- [ ] **Step 6: Commit**

```bash
cd /home/plemus/WebstormProjects/Microservicios
git add apps/domains/global/recursos-humanos/src/models/entities/cap-asignacion.entity.ts \
        apps/domains/global/recursos-humanos/src/models/entities/cap-asignacion-detalle.entity.ts \
        apps/domains/global/recursos-humanos/src/models/entities/cap-intento.entity.ts \
        apps/domains/global/recursos-humanos/src/models/entities/cap-intento-detalle.entity.ts \
        apps/domains/global/recursos-humanos/src/models/entities/cap-examen-token.entity.ts \
        apps/domains/global/recursos-humanos/src/models/entities/cap-bono.entity.ts \
        apps/domains/global/recursos-humanos/src/capacitaciones/sql/002-tablas-transaccionales.sql \
        apps/domains/global/recursos-humanos/src/capacitaciones/capacitaciones.module.ts
git commit -m "feat(capacitaciones): tablas transaccionales (SQL + 6 entidades) y registro en el módulo"
```

---

### Task 2: Lógica pura `lib/calificacion.ts` (TDD)

**Files:**
- Create: `$RH/src/capacitaciones/lib/calificacion.ts`
- Create: `$RH/src/capacitaciones/lib/calificacion.spec.ts`

**Interfaces:**
- Produces (todas PURAS, sin `Date.now` interno):
  - `calificarIntento(preguntas: PreguntaParaCalificar[], elegidas: RespuestaElegida[]): ResultadoCalificacion`
    - tipos: `PreguntaParaCalificar = { idPregunta: number; opciones: { idRespuesta: number; esCorrecta: boolean; puntos: number }[] }`; `RespuestaElegida = { idPregunta: number; idRespuesta: number | null }`; `ResultadoCalificacion = { puntaje: number; detalle: DetalleCalificado[] }`; `DetalleCalificado = { idPregunta: number; idRespuestaElegida: number | null; correcta: boolean; puntos: number }`.
  - `estadoModulo(puntuacion: number | null, porcentaje: number | null): EstadoModulo` donde `EstadoModulo = 'Pendiente' | 'Aprobado' | 'No aprobado'`.
  - `calcularLicencia(detalles: { estado: EstadoModulo; vigenciaMeses: number | null }[], ahora: Date): ResultadoLicencia` donde `ResultadoLicencia = { activa: boolean; venceLicencia: Date | null; fechaFinaliza: Date | null }`.
  - `montoBono(intentos: number, montos: { primerIntento: number; segundoIntento: number; tercerIntento: number }): number`.

- [ ] **Step 1: Escribir el spec que falla**

`lib/calificacion.spec.ts`:
```typescript
import {
  calificarIntento,
  estadoModulo,
  calcularLicencia,
  montoBono,
  PreguntaParaCalificar,
} from './calificacion';

describe('calificarIntento', () => {
  const preguntas: PreguntaParaCalificar[] = [
    {
      idPregunta: 1,
      opciones: [
        { idRespuesta: 11, esCorrecta: true, puntos: 5 },
        { idRespuesta: 12, esCorrecta: false, puntos: 5 },
      ],
    },
    {
      idPregunta: 2,
      opciones: [
        { idRespuesta: 21, esCorrecta: false, puntos: 5 },
        { idRespuesta: 22, esCorrecta: true, puntos: 5 },
      ],
    },
  ];

  it('suma puntos solo de las respuestas correctas', () => {
    const res = calificarIntento(preguntas, [
      { idPregunta: 1, idRespuesta: 11 },
      { idPregunta: 2, idRespuesta: 21 },
    ]);
    expect(res.puntaje).toBe(5);
    expect(res.detalle).toHaveLength(2);
    expect(res.detalle[0]).toEqual({ idPregunta: 1, idRespuestaElegida: 11, correcta: true, puntos: 5 });
    expect(res.detalle[1]).toEqual({ idPregunta: 2, idRespuestaElegida: 21, correcta: false, puntos: 0 });
  });

  it('trata pregunta sin respuesta elegida como incorrecta con 0 puntos', () => {
    const res = calificarIntento(preguntas, [{ idPregunta: 1, idRespuesta: 11 }]);
    expect(res.puntaje).toBe(5);
    expect(res.detalle).toHaveLength(2);
    expect(res.detalle[1]).toEqual({ idPregunta: 2, idRespuestaElegida: null, correcta: false, puntos: 0 });
  });

  it('una opción elegida inexistente cuenta como incorrecta', () => {
    const res = calificarIntento(preguntas, [{ idPregunta: 1, idRespuesta: 999 }]);
    expect(res.detalle[0]).toEqual({ idPregunta: 1, idRespuestaElegida: 999, correcta: false, puntos: 0 });
  });

  it('redondea el puntaje total', () => {
    const ps: PreguntaParaCalificar[] = [
      { idPregunta: 1, opciones: [{ idRespuesta: 1, esCorrecta: true, puntos: 2.4 }] },
      { idPregunta: 2, opciones: [{ idRespuesta: 2, esCorrecta: true, puntos: 2.4 }] },
    ];
    const res = calificarIntento(ps, [
      { idPregunta: 1, idRespuesta: 1 },
      { idPregunta: 2, idRespuesta: 2 },
    ]);
    expect(res.puntaje).toBe(5); // 4.8 -> 5
  });
});

describe('estadoModulo', () => {
  it('Pendiente si puntuacion es null', () => {
    expect(estadoModulo(null, 80)).toBe('Pendiente');
  });
  it('Aprobado si puntuacion >= porcentaje', () => {
    expect(estadoModulo(80, 80)).toBe('Aprobado');
    expect(estadoModulo(90, 80)).toBe('Aprobado');
  });
  it('No aprobado si puntuacion < porcentaje', () => {
    expect(estadoModulo(70, 80)).toBe('No aprobado');
  });
  it('porcentaje null se trata como 0 (cualquier puntuacion aprueba)', () => {
    expect(estadoModulo(0, null)).toBe('Aprobado');
  });
});

describe('calcularLicencia', () => {
  const ahora = new Date('2026-06-25T10:00:00');

  it('activa cuando todos los módulos están Aprobado, vence en MIN(vigencia) meses', () => {
    const res = calcularLicencia(
      [
        { estado: 'Aprobado', vigenciaMeses: 12 },
        { estado: 'Aprobado', vigenciaMeses: 6 },
      ],
      ahora,
    );
    expect(res.activa).toBe(true);
    expect(res.fechaFinaliza).toEqual(ahora);
    expect(res.venceLicencia).toEqual(new Date('2026-12-25T10:00:00')); // +6 meses (el mínimo)
  });

  it('inactiva si algún módulo no está Aprobado', () => {
    const res = calcularLicencia(
      [
        { estado: 'Aprobado', vigenciaMeses: 12 },
        { estado: 'No aprobado', vigenciaMeses: 6 },
      ],
      ahora,
    );
    expect(res).toEqual({ activa: false, venceLicencia: null, fechaFinaliza: null });
  });

  it('inactiva si no hay módulos', () => {
    const res = calcularLicencia([], ahora);
    expect(res).toEqual({ activa: false, venceLicencia: null, fechaFinaliza: null });
  });

  it('vigencia null se ignora; si todas son null no hay fecha de vencimiento', () => {
    const res = calcularLicencia(
      [
        { estado: 'Aprobado', vigenciaMeses: null },
        { estado: 'Aprobado', vigenciaMeses: null },
      ],
      ahora,
    );
    expect(res.activa).toBe(true);
    expect(res.venceLicencia).toBeNull();
  });
});

describe('montoBono', () => {
  const montos = { primerIntento: 100, segundoIntento: 60, tercerIntento: 30 };
  it('devuelve el monto según el número de intento', () => {
    expect(montoBono(1, montos)).toBe(100);
    expect(montoBono(2, montos)).toBe(60);
    expect(montoBono(3, montos)).toBe(30);
  });
  it('devuelve 0 para intentos fuera de 1..3', () => {
    expect(montoBono(0, montos)).toBe(0);
    expect(montoBono(4, montos)).toBe(0);
  });
});
```

- [ ] **Step 2: Correr el spec y ver que falla**

Run: `cd /home/plemus/WebstormProjects/Microservicios/apps/domains/global/recursos-humanos && npx jest src/capacitaciones/lib/calificacion.spec.ts`
Expected: FAIL ("Cannot find module './calificacion'").

- [ ] **Step 3: Implementar la lógica pura**

`lib/calificacion.ts`:
```typescript
// Lógica pura de calificación / estado / licencia / bono de capacitaciones.
// Reimplementa los triggers legacy. Sin efectos secundarios ni Date.now interno:
// `ahora` siempre llega por parámetro para mantener las funciones testeables.

export type EstadoModulo = 'Pendiente' | 'Aprobado' | 'No aprobado';

export interface OpcionPregunta {
  idRespuesta: number;
  esCorrecta: boolean;
  puntos: number;
}

export interface PreguntaParaCalificar {
  idPregunta: number;
  opciones: OpcionPregunta[];
}

export interface RespuestaElegida {
  idPregunta: number;
  idRespuesta: number | null;
}

export interface DetalleCalificado {
  idPregunta: number;
  idRespuestaElegida: number | null;
  correcta: boolean;
  puntos: number;
}

export interface ResultadoCalificacion {
  puntaje: number;
  detalle: DetalleCalificado[];
}

export function calificarIntento(
  preguntas: PreguntaParaCalificar[],
  elegidas: RespuestaElegida[],
): ResultadoCalificacion {
  const elegidaPorPregunta = new Map<number, number | null>();
  for (const e of elegidas) {
    elegidaPorPregunta.set(e.idPregunta, e.idRespuesta);
  }

  const detalle: DetalleCalificado[] = preguntas.map((p) => {
    const idElegida = elegidaPorPregunta.has(p.idPregunta)
      ? (elegidaPorPregunta.get(p.idPregunta) as number | null)
      : null;
    const opcion = idElegida == null ? undefined : p.opciones.find((o) => o.idRespuesta === idElegida);
    const correcta = opcion ? opcion.esCorrecta : false;
    const puntos = correcta ? (opcion as OpcionPregunta).puntos : 0;
    return { idPregunta: p.idPregunta, idRespuestaElegida: idElegida, correcta, puntos };
  });

  const puntaje = Math.round(detalle.reduce((acc, d) => acc + d.puntos, 0));
  return { puntaje, detalle };
}

export function estadoModulo(puntuacion: number | null, porcentaje: number | null): EstadoModulo {
  if (puntuacion == null) return 'Pendiente';
  const umbral = porcentaje ?? 0;
  return puntuacion >= umbral ? 'Aprobado' : 'No aprobado';
}

export interface DetalleLicencia {
  estado: EstadoModulo;
  vigenciaMeses: number | null;
}

export interface ResultadoLicencia {
  activa: boolean;
  venceLicencia: Date | null;
  fechaFinaliza: Date | null;
}

export function calcularLicencia(detalles: DetalleLicencia[], ahora: Date): ResultadoLicencia {
  const total = detalles.length;
  const aprobados = detalles.filter((d) => d.estado === 'Aprobado').length;
  const todosAprobados = total > 0 && aprobados === total;

  if (!todosAprobados) {
    return { activa: false, venceLicencia: null, fechaFinaliza: null };
  }

  const vigencias = detalles
    .map((d) => d.vigenciaMeses)
    .filter((v): v is number => v != null);

  let venceLicencia: Date | null = null;
  if (vigencias.length > 0) {
    const minMeses = Math.min(...vigencias);
    venceLicencia = new Date(ahora);
    venceLicencia.setMonth(venceLicencia.getMonth() + minMeses);
  }

  return { activa: true, venceLicencia, fechaFinaliza: new Date(ahora) };
}

export interface MontosBono {
  primerIntento: number;
  segundoIntento: number;
  tercerIntento: number;
}

export function montoBono(intentos: number, montos: MontosBono): number {
  switch (intentos) {
    case 1:
      return montos.primerIntento;
    case 2:
      return montos.segundoIntento;
    case 3:
      return montos.tercerIntento;
    default:
      return 0;
  }
}
```

- [ ] **Step 4: Correr el spec y ver que pasa**

Run: `cd /home/plemus/WebstormProjects/Microservicios/apps/domains/global/recursos-humanos && npx jest src/capacitaciones/lib/calificacion.spec.ts`
Expected: PASS (todos los `describe`).

- [ ] **Step 5: Commit**

```bash
cd /home/plemus/WebstormProjects/Microservicios
git add apps/domains/global/recursos-humanos/src/capacitaciones/lib/calificacion.ts \
        apps/domains/global/recursos-humanos/src/capacitaciones/lib/calificacion.spec.ts
git commit -m "feat(capacitaciones): lógica pura de calificación/estado/licencia/bono + specs"
```

---

### Task 3: DTOs transaccionales

**Files:**
- Create: `$RH/src/capacitaciones/dto/asignacion.dto.ts`
- Create: `$RH/src/capacitaciones/dto/examen.dto.ts`

**Interfaces:**
- Produces: `CrearAsignacionPrimariaDto` (`{ empleadoIds: number[] }`), `CrearAsignacionSecundariaDto` (`{ empleadoId: number; idPensum: number }`), `GenerarExamenDto` (`{ idAsignacionDetalle: number; horasVigencia?: number }`), `EnviarRespuestasDto` (`{ respuestas: RespuestaItemDto[] }`), `RespuestaItemDto` (`{ idPregunta: number; idRespuesta: number | null }`).

- [ ] **Step 1: Crear los DTOs**

`dto/asignacion.dto.ts`:
```typescript
import { ArrayMinSize, IsArray, IsInt } from 'class-validator';

export class CrearAsignacionPrimariaDto {
  @IsArray()
  @ArrayMinSize(1)
  @IsInt({ each: true })
  empleadoIds: number[];
}

export class CrearAsignacionSecundariaDto {
  @IsInt()
  empleadoId: number;

  @IsInt()
  idPensum: number;
}
```

`dto/examen.dto.ts`:
```typescript
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsInt,
  IsOptional,
  Min,
  ValidateNested,
} from 'class-validator';

export class GenerarExamenDto {
  @IsInt()
  idAsignacionDetalle: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  horasVigencia?: number; // default 72 si no se envía
}

export class RespuestaItemDto {
  @IsInt()
  idPregunta: number;

  @IsOptional()
  @IsInt()
  idRespuesta?: number | null; // null/omitido = pregunta sin responder
}

export class EnviarRespuestasDto {
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => RespuestaItemDto)
  respuestas: RespuestaItemDto[];
}
```

- [ ] **Step 2: Verificar build**

Run: `cd /home/plemus/WebstormProjects/Microservicios/apps/domains/global/recursos-humanos && npm run build`
Expected: sin errores. (Nota: `class-transformer` ya es dependencia del MS por el `ValidationPipe` con `transform`; si el build se queja del import de `Type`, confirmar que está en `package.json` — debería estarlo.)

- [ ] **Step 3: Commit**

```bash
cd /home/plemus/WebstormProjects/Microservicios
git add apps/domains/global/recursos-humanos/src/capacitaciones/dto/asignacion.dto.ts \
        apps/domains/global/recursos-humanos/src/capacitaciones/dto/examen.dto.ts
git commit -m "feat(capacitaciones): DTOs de asignación y examen"
```

---

### Task 4: `AsignacionesService` — primaria (por puesto) y secundaria (TDD)

**Files:**
- Create: `$RH/src/capacitaciones/asignaciones.service.ts`
- Create: `$RH/src/capacitaciones/asignaciones.service.spec.ts`

**Interfaces:**
- Consumes: entidades `CapAsignacion`, `CapAsignacionDetalle`, `Pensum`, `PensumModulo`, `Empleado`; DTOs `CrearAsignacionPrimariaDto`, `CrearAsignacionSecundariaDto`.
- Produces (`AsignacionesService`):
  - `crearPrimaria(dto: CrearAsignacionPrimariaDto): Promise<{ creadas: number; omitidas: { empleadoId: number; motivo: string }[] }>` — para cada empleado: resuelve su `idPuesto`, busca el `Pensum` cuyo `idPuesto` coincida; si no hay empleado / no tiene puesto / no hay pensum para el puesto, lo omite con motivo; si ya existe una asignación (empleadoId, idPensum), lo omite; si no, crea el header `tipo='primaria'` + explota los módulos del pensum a `tCapAsignacionDetalle` (`estado='Pendiente'`, `intentos=0`).
  - `crearSecundaria(dto: CrearAsignacionSecundariaDto): Promise<CapAsignacion>` — valida que el empleado y el pensum existan; rechaza duplicado (empleadoId, idPensum) con `BadRequestException`; crea header `tipo='secundaria'` + explota módulos.

- [ ] **Step 1: Escribir el spec que falla**

`asignaciones.service.spec.ts`:
```typescript
import { BadRequestException } from '@nestjs/common';
import { AsignacionesService } from './asignaciones.service';

function makeService() {
  const asignacionRepo: any = { find: jest.fn(), findOne: jest.fn(), create: jest.fn(), save: jest.fn() };
  const detalleRepo: any = { find: jest.fn(), create: jest.fn(), save: jest.fn() };
  const pensumRepo: any = { findOne: jest.fn() };
  const moduloRepo: any = { find: jest.fn() };
  const empleadoRepo: any = { findOne: jest.fn() };
  const service = new AsignacionesService(asignacionRepo, detalleRepo, pensumRepo, moduloRepo, empleadoRepo);
  return { service, asignacionRepo, detalleRepo, pensumRepo, moduloRepo, empleadoRepo };
}

describe('AsignacionesService.crearPrimaria', () => {
  it('crea header + explota módulos para un empleado con pensum de su puesto', async () => {
    const { service, asignacionRepo, detalleRepo, pensumRepo, moduloRepo, empleadoRepo } = makeService();
    empleadoRepo.findOne.mockResolvedValue({ id: 7, idPuesto: 3 });
    pensumRepo.findOne.mockResolvedValue({ id: 1, idPuesto: 3 });
    asignacionRepo.findOne.mockResolvedValue(null); // no duplicado
    asignacionRepo.create.mockImplementation((d: any) => d);
    asignacionRepo.save.mockImplementation(async (e: any) => ({ id: 50, ...e }));
    moduloRepo.find.mockResolvedValue([{ id: 10 }, { id: 11 }]);
    detalleRepo.create.mockImplementation((d: any) => d);
    detalleRepo.save.mockImplementation(async (arr: any) => arr);

    const res = await service.crearPrimaria({ empleadoIds: [7] });

    expect(res.creadas).toBe(1);
    expect(res.omitidas).toHaveLength(0);
    expect(asignacionRepo.save).toHaveBeenCalledWith(expect.objectContaining({ empleadoId: 7, idPensum: 1, tipo: 'primaria' }));
    expect(detalleRepo.save).toHaveBeenCalledWith([
      expect.objectContaining({ idAsignacion: 50, idModulo: 10, estado: 'Pendiente', intentos: 0 }),
      expect.objectContaining({ idAsignacion: 50, idModulo: 11, estado: 'Pendiente', intentos: 0 }),
    ]);
  });

  it('omite empleado sin puesto', async () => {
    const { service, empleadoRepo } = makeService();
    empleadoRepo.findOne.mockResolvedValue({ id: 7, idPuesto: null });
    const res = await service.crearPrimaria({ empleadoIds: [7] });
    expect(res.creadas).toBe(0);
    expect(res.omitidas[0]).toEqual({ empleadoId: 7, motivo: 'El empleado no tiene puesto' });
  });

  it('omite empleado cuyo puesto no tiene pensum', async () => {
    const { service, empleadoRepo, pensumRepo } = makeService();
    empleadoRepo.findOne.mockResolvedValue({ id: 7, idPuesto: 3 });
    pensumRepo.findOne.mockResolvedValue(null);
    const res = await service.crearPrimaria({ empleadoIds: [7] });
    expect(res.creadas).toBe(0);
    expect(res.omitidas[0]).toEqual({ empleadoId: 7, motivo: 'No hay pensum para el puesto del empleado' });
  });

  it('omite si ya existe la asignación', async () => {
    const { service, empleadoRepo, pensumRepo, asignacionRepo } = makeService();
    empleadoRepo.findOne.mockResolvedValue({ id: 7, idPuesto: 3 });
    pensumRepo.findOne.mockResolvedValue({ id: 1, idPuesto: 3 });
    asignacionRepo.findOne.mockResolvedValue({ id: 99 });
    const res = await service.crearPrimaria({ empleadoIds: [7] });
    expect(res.creadas).toBe(0);
    expect(res.omitidas[0]).toEqual({ empleadoId: 7, motivo: 'Ya tiene asignado este pensum' });
  });
});

describe('AsignacionesService.crearSecundaria', () => {
  it('crea header secundaria + explota módulos', async () => {
    const { service, empleadoRepo, pensumRepo, asignacionRepo, detalleRepo, moduloRepo } = makeService();
    empleadoRepo.findOne.mockResolvedValue({ id: 7, idPuesto: 3 });
    pensumRepo.findOne.mockResolvedValue({ id: 2, idPuesto: 4 });
    asignacionRepo.findOne.mockResolvedValue(null);
    asignacionRepo.create.mockImplementation((d: any) => d);
    asignacionRepo.save.mockImplementation(async (e: any) => ({ id: 60, ...e }));
    moduloRepo.find.mockResolvedValue([{ id: 20 }]);
    detalleRepo.create.mockImplementation((d: any) => d);
    detalleRepo.save.mockResolvedValue([]);

    const res = await service.crearSecundaria({ empleadoId: 7, idPensum: 2 });

    expect(res.id).toBe(60);
    expect(asignacionRepo.save).toHaveBeenCalledWith(expect.objectContaining({ tipo: 'secundaria', empleadoId: 7, idPensum: 2 }));
    expect(detalleRepo.save).toHaveBeenCalled();
  });

  it('rechaza duplicado', async () => {
    const { service, empleadoRepo, pensumRepo, asignacionRepo } = makeService();
    empleadoRepo.findOne.mockResolvedValue({ id: 7 });
    pensumRepo.findOne.mockResolvedValue({ id: 2 });
    asignacionRepo.findOne.mockResolvedValue({ id: 99 });
    await expect(service.crearSecundaria({ empleadoId: 7, idPensum: 2 })).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rechaza empleado inexistente', async () => {
    const { service, empleadoRepo } = makeService();
    empleadoRepo.findOne.mockResolvedValue(null);
    await expect(service.crearSecundaria({ empleadoId: 999, idPensum: 2 })).rejects.toBeInstanceOf(BadRequestException);
  });
});
```

- [ ] **Step 2: Correr y ver fallar**

Run: `cd /home/plemus/WebstormProjects/Microservicios/apps/domains/global/recursos-humanos && npx jest src/capacitaciones/asignaciones.service.spec.ts`
Expected: FAIL ("Cannot find module './asignaciones.service'").

- [ ] **Step 3: Implementar `AsignacionesService`**

`asignaciones.service.ts`:
```typescript
import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CapAsignacion } from '../models/entities/cap-asignacion.entity';
import { CapAsignacionDetalle } from '../models/entities/cap-asignacion-detalle.entity';
import { Pensum } from '../models/entities/pensum.entity';
import { PensumModulo } from '../models/entities/pensum-modulo.entity';
import { Empleado } from '../models/entities/empleado.entity';
import {
  CrearAsignacionPrimariaDto,
  CrearAsignacionSecundariaDto,
} from './dto/asignacion.dto';

interface Omitida {
  empleadoId: number;
  motivo: string;
}

@Injectable()
export class AsignacionesService {
  constructor(
    @InjectRepository(CapAsignacion) private readonly asignacionRepo: Repository<CapAsignacion>,
    @InjectRepository(CapAsignacionDetalle) private readonly detalleRepo: Repository<CapAsignacionDetalle>,
    @InjectRepository(Pensum) private readonly pensumRepo: Repository<Pensum>,
    @InjectRepository(PensumModulo) private readonly moduloRepo: Repository<PensumModulo>,
    @InjectRepository(Empleado) private readonly empleadoRepo: Repository<Empleado>,
  ) {}

  public async crearPrimaria(
    dto: CrearAsignacionPrimariaDto,
  ): Promise<{ creadas: number; omitidas: Omitida[] }> {
    const omitidas: Omitida[] = [];
    let creadas = 0;

    for (const empleadoId of dto.empleadoIds) {
      const empleado = await this.empleadoRepo.findOne({ where: { id: empleadoId } });
      if (!empleado) {
        omitidas.push({ empleadoId, motivo: 'El empleado no existe' });
        continue;
      }
      if (empleado.idPuesto == null) {
        omitidas.push({ empleadoId, motivo: 'El empleado no tiene puesto' });
        continue;
      }
      const pensum = await this.pensumRepo.findOne({ where: { idPuesto: empleado.idPuesto } });
      if (!pensum) {
        omitidas.push({ empleadoId, motivo: 'No hay pensum para el puesto del empleado' });
        continue;
      }
      const existente = await this.asignacionRepo.findOne({
        where: { empleadoId, idPensum: pensum.id },
      });
      if (existente) {
        omitidas.push({ empleadoId, motivo: 'Ya tiene asignado este pensum' });
        continue;
      }

      await this.crearAsignacionConDetalles(empleadoId, pensum.id, 'primaria');
      creadas += 1;
    }

    return { creadas, omitidas };
  }

  public async crearSecundaria(dto: CrearAsignacionSecundariaDto): Promise<CapAsignacion> {
    const empleado = await this.empleadoRepo.findOne({ where: { id: dto.empleadoId } });
    if (!empleado) throw new BadRequestException('El empleado no existe');
    const pensum = await this.pensumRepo.findOne({ where: { id: dto.idPensum } });
    if (!pensum) throw new BadRequestException('El pensum no existe');
    const existente = await this.asignacionRepo.findOne({
      where: { empleadoId: dto.empleadoId, idPensum: dto.idPensum },
    });
    if (existente) throw new BadRequestException('El empleado ya tiene asignado este pensum');

    return await this.crearAsignacionConDetalles(dto.empleadoId, dto.idPensum, 'secundaria');
  }

  private async crearAsignacionConDetalles(
    empleadoId: number,
    idPensum: number,
    tipo: 'primaria' | 'secundaria',
  ): Promise<CapAsignacion> {
    const header = this.asignacionRepo.create({
      empleadoId,
      idPensum,
      tipo,
      fechaInicio: null,
      licenciaActiva: false,
      venceLicencia: null,
      fechaFinaliza: null,
      creadoEn: new Date(),
    });
    const guardado = await this.asignacionRepo.save(header);

    const modulos = await this.moduloRepo.find({ where: { idPensum } });
    const detalles = modulos.map((m) =>
      this.detalleRepo.create({
        idAsignacion: guardado.id,
        idModulo: m.id,
        puntuacion: null,
        estado: 'Pendiente',
        intentos: 0,
        creadoEn: new Date(),
      }),
    );
    if (detalles.length) await this.detalleRepo.save(detalles);

    return guardado;
  }
}
```

- [ ] **Step 4: Correr y ver pasar**

Run: `cd /home/plemus/WebstormProjects/Microservicios/apps/domains/global/recursos-humanos && npx jest src/capacitaciones/asignaciones.service.spec.ts`
Expected: PASS (todos).

- [ ] **Step 5: Commit**

```bash
cd /home/plemus/WebstormProjects/Microservicios
git add apps/domains/global/recursos-humanos/src/capacitaciones/asignaciones.service.ts \
        apps/domains/global/recursos-humanos/src/capacitaciones/asignaciones.service.spec.ts
git commit -m "feat(capacitaciones): AsignacionesService (primaria por puesto + secundaria)"
```

---

### Task 5: `EmpleadosCapService` (lista + detalle) + `AsignacionesController` + `EmpleadosCapController`

**Files:**
- Create: `$RH/src/capacitaciones/empleados-cap.service.ts`
- Create: `$RH/src/capacitaciones/empleados-cap.service.spec.ts`
- Create: `$RH/src/capacitaciones/asignaciones.controller.ts`
- Create: `$RH/src/capacitaciones/empleados-cap.controller.ts`
- Modify: `$RH/src/capacitaciones/capacitaciones.module.ts` (registrar providers + controllers)

**Interfaces:**
- Consumes: entidades `CapAsignacion`, `CapAsignacionDetalle`, `PensumModulo`, `Empleado`.
- Produces (`EmpleadosCapService`):
  - `listar(filtros: { puesto?: number; departamento?: number; estado?: string }): Promise<Array<{ empleadoId; nombre; idPuesto; idDepartamento; estaActivo; modulosTotal; modulosAprobados; licenciaActiva }>>` — un empleado puede tener varias asignaciones; el resumen agrega TODOS sus detalles y marca `licenciaActiva` si CUALQUIER asignación del empleado la tiene activa. El filtro `estado` filtra empleados por `estaActivo` (`'activo'`/`'inactivo'`).
  - `detalle(empleadoId: number): Promise<{ empleadoId; asignaciones: Array<{ id; idPensum; tipo; licenciaActiva; venceLicencia; fechaFinaliza; detalles: Array<{ id; idModulo; puntuacion; estado; intentos }> }> }>` — lanza `NotFoundException` si el empleado no existe.
- Produces controllers: rutas `POST /capacitaciones/asignaciones`, `POST /capacitaciones/asignaciones/secundaria`, `GET /capacitaciones/empleados`, `GET /capacitaciones/empleados/:empleadoId`.

- [ ] **Step 1: Escribir el spec que falla**

`empleados-cap.service.spec.ts`:
```typescript
import { NotFoundException } from '@nestjs/common';
import { EmpleadosCapService } from './empleados-cap.service';

function makeService() {
  const empleadoRepo: any = { find: jest.fn(), findOne: jest.fn() };
  const asignacionRepo: any = { find: jest.fn() };
  const detalleRepo: any = { find: jest.fn() };
  const service = new EmpleadosCapService(empleadoRepo, asignacionRepo, detalleRepo);
  return { service, empleadoRepo, asignacionRepo, detalleRepo };
}

describe('EmpleadosCapService.listar', () => {
  it('agrega total/aprobados y licencia por empleado', async () => {
    const { service, empleadoRepo, asignacionRepo, detalleRepo } = makeService();
    empleadoRepo.find.mockResolvedValue([
      { id: 7, nombre: 'Ana', apellido: 'Lopez', idPuesto: 3, idDepartamento: 1, estaActivo: true },
    ]);
    asignacionRepo.find.mockResolvedValue([
      { id: 50, empleadoId: 7, idPensum: 1, licenciaActiva: true },
    ]);
    detalleRepo.find.mockResolvedValue([
      { id: 1, idAsignacion: 50, estado: 'Aprobado' },
      { id: 2, idAsignacion: 50, estado: 'No aprobado' },
    ]);

    const res = await service.listar({});

    expect(res).toHaveLength(1);
    expect(res[0]).toEqual(
      expect.objectContaining({
        empleadoId: 7,
        nombre: 'Ana Lopez',
        modulosTotal: 2,
        modulosAprobados: 1,
        licenciaActiva: true,
      }),
    );
  });

  it('filtra por estado activo', async () => {
    const { service, empleadoRepo, asignacionRepo, detalleRepo } = makeService();
    empleadoRepo.find.mockResolvedValue([
      { id: 7, nombre: 'Ana', apellido: null, idPuesto: 3, idDepartamento: 1, estaActivo: true },
      { id: 8, nombre: 'Beto', apellido: null, idPuesto: 3, idDepartamento: 1, estaActivo: false },
    ]);
    asignacionRepo.find.mockResolvedValue([]);
    detalleRepo.find.mockResolvedValue([]);

    const res = await service.listar({ estado: 'activo' });

    expect(res).toHaveLength(1);
    expect(res[0].empleadoId).toBe(7);
  });
});

describe('EmpleadosCapService.detalle', () => {
  it('arma asignaciones con sus detalles', async () => {
    const { service, empleadoRepo, asignacionRepo, detalleRepo } = makeService();
    empleadoRepo.findOne.mockResolvedValue({ id: 7 });
    asignacionRepo.find.mockResolvedValue([
      { id: 50, idPensum: 1, tipo: 'primaria', licenciaActiva: false, venceLicencia: null, fechaFinaliza: null },
    ]);
    detalleRepo.find.mockResolvedValue([
      { id: 1, idAsignacion: 50, idModulo: 10, puntuacion: 90, estado: 'Aprobado', intentos: 1 },
    ]);

    const res = await service.detalle(7);

    expect(res.empleadoId).toBe(7);
    expect(res.asignaciones).toHaveLength(1);
    expect(res.asignaciones[0].detalles).toHaveLength(1);
    expect(res.asignaciones[0].detalles[0].estado).toBe('Aprobado');
  });

  it('lanza NotFound si el empleado no existe', async () => {
    const { service, empleadoRepo } = makeService();
    empleadoRepo.findOne.mockResolvedValue(null);
    await expect(service.detalle(999)).rejects.toBeInstanceOf(NotFoundException);
  });
});
```

- [ ] **Step 2: Correr y ver fallar**

Run: `cd /home/plemus/WebstormProjects/Microservicios/apps/domains/global/recursos-humanos && npx jest src/capacitaciones/empleados-cap.service.spec.ts`
Expected: FAIL ("Cannot find module './empleados-cap.service'").

- [ ] **Step 3: Implementar el service**

`empleados-cap.service.ts`:
```typescript
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsWhere, In, Repository } from 'typeorm';
import { CapAsignacion } from '../models/entities/cap-asignacion.entity';
import { CapAsignacionDetalle } from '../models/entities/cap-asignacion-detalle.entity';
import { Empleado } from '../models/entities/empleado.entity';

interface FiltrosLista {
  puesto?: number;
  departamento?: number;
  estado?: string; // 'activo' | 'inactivo'
}

@Injectable()
export class EmpleadosCapService {
  constructor(
    @InjectRepository(Empleado) private readonly empleadoRepo: Repository<Empleado>,
    @InjectRepository(CapAsignacion) private readonly asignacionRepo: Repository<CapAsignacion>,
    @InjectRepository(CapAsignacionDetalle) private readonly detalleRepo: Repository<CapAsignacionDetalle>,
  ) {}

  public async listar(filtros: FiltrosLista) {
    const where: FindOptionsWhere<Empleado> = {};
    if (filtros.puesto != null) where.idPuesto = filtros.puesto;
    if (filtros.departamento != null) where.idDepartamento = filtros.departamento;
    if (filtros.estado === 'activo') where.estaActivo = true;
    if (filtros.estado === 'inactivo') where.estaActivo = false;

    const empleados = await this.empleadoRepo.find({ where });
    const empleadoIds = empleados.map((e) => e.id);
    if (!empleadoIds.length) return [];

    const asignaciones = await this.asignacionRepo.find({ where: { empleadoId: In(empleadoIds) } });
    const asignacionIds = asignaciones.map((a) => a.id);
    const detalles = asignacionIds.length
      ? await this.detalleRepo.find({ where: { idAsignacion: In(asignacionIds) } })
      : [];

    const asignacionesPorEmpleado = new Map<number, CapAsignacion[]>();
    for (const a of asignaciones) {
      const arr = asignacionesPorEmpleado.get(a.empleadoId) ?? [];
      arr.push(a);
      asignacionesPorEmpleado.set(a.empleadoId, arr);
    }
    const detallesPorAsignacion = new Map<number, CapAsignacionDetalle[]>();
    for (const d of detalles) {
      const arr = detallesPorAsignacion.get(d.idAsignacion) ?? [];
      arr.push(d);
      detallesPorAsignacion.set(d.idAsignacion, arr);
    }

    return empleados.map((e) => {
      const asigs = asignacionesPorEmpleado.get(e.id) ?? [];
      let modulosTotal = 0;
      let modulosAprobados = 0;
      let licenciaActiva = false;
      for (const a of asigs) {
        if (a.licenciaActiva) licenciaActiva = true;
        const dets = detallesPorAsignacion.get(a.id) ?? [];
        modulosTotal += dets.length;
        modulosAprobados += dets.filter((d) => d.estado === 'Aprobado').length;
      }
      const nombre = [e.nombre, e.apellido].filter((p) => p != null && p !== '').join(' ');
      return {
        empleadoId: e.id,
        nombre,
        idPuesto: e.idPuesto,
        idDepartamento: e.idDepartamento,
        estaActivo: e.estaActivo,
        modulosTotal,
        modulosAprobados,
        licenciaActiva,
      };
    });
  }

  public async detalle(empleadoId: number) {
    const empleado = await this.empleadoRepo.findOne({ where: { id: empleadoId } });
    if (!empleado) throw new NotFoundException('Empleado no encontrado');

    const asignaciones = await this.asignacionRepo.find({ where: { empleadoId } });
    const asignacionIds = asignaciones.map((a) => a.id);
    const detalles = asignacionIds.length
      ? await this.detalleRepo.find({ where: { idAsignacion: In(asignacionIds) } })
      : [];

    const detallesPorAsignacion = new Map<number, CapAsignacionDetalle[]>();
    for (const d of detalles) {
      const arr = detallesPorAsignacion.get(d.idAsignacion) ?? [];
      arr.push(d);
      detallesPorAsignacion.set(d.idAsignacion, arr);
    }

    return {
      empleadoId,
      asignaciones: asignaciones.map((a) => ({
        id: a.id,
        idPensum: a.idPensum,
        tipo: a.tipo,
        licenciaActiva: a.licenciaActiva,
        venceLicencia: a.venceLicencia,
        fechaFinaliza: a.fechaFinaliza,
        detalles: (detallesPorAsignacion.get(a.id) ?? []).map((d) => ({
          id: d.id,
          idModulo: d.idModulo,
          puntuacion: d.puntuacion,
          estado: d.estado,
          intentos: d.intentos,
        })),
      })),
    };
  }
}
```

- [ ] **Step 4: Correr y ver pasar**

Run: `cd /home/plemus/WebstormProjects/Microservicios/apps/domains/global/recursos-humanos && npx jest src/capacitaciones/empleados-cap.service.spec.ts`
Expected: PASS (todos).

- [ ] **Step 5: Crear los controllers**

`asignaciones.controller.ts`:
```typescript
import { Body, Controller, Post } from '@nestjs/common';
import { AsignacionesService } from './asignaciones.service';
import {
  CrearAsignacionPrimariaDto,
  CrearAsignacionSecundariaDto,
} from './dto/asignacion.dto';

@Controller('capacitaciones/asignaciones')
export class AsignacionesController {
  constructor(private readonly service: AsignacionesService) {}

  @Post()
  public crearPrimaria(@Body() dto: CrearAsignacionPrimariaDto) {
    return this.service.crearPrimaria(dto);
  }

  @Post('secundaria')
  public crearSecundaria(@Body() dto: CrearAsignacionSecundariaDto) {
    return this.service.crearSecundaria(dto);
  }
}
```

`empleados-cap.controller.ts`:
```typescript
import { Controller, Get, Param, ParseIntPipe, Query } from '@nestjs/common';
import { EmpleadosCapService } from './empleados-cap.service';

@Controller('capacitaciones/empleados')
export class EmpleadosCapController {
  constructor(private readonly service: EmpleadosCapService) {}

  @Get()
  public listar(
    @Query('puesto') puesto?: string,
    @Query('departamento') departamento?: string,
    @Query('estado') estado?: string,
  ) {
    return this.service.listar({
      puesto: puesto != null ? Number(puesto) : undefined,
      departamento: departamento != null ? Number(departamento) : undefined,
      estado,
    });
  }

  @Get(':empleadoId')
  public detalle(@Param('empleadoId', ParseIntPipe) empleadoId: number) {
    return this.service.detalle(empleadoId);
  }
}
```

- [ ] **Step 6: Registrar en `capacitaciones.module.ts`**

Agregar imports:
```typescript
import { AsignacionesService } from './asignaciones.service';
import { AsignacionesController } from './asignaciones.controller';
import { EmpleadosCapService } from './empleados-cap.service';
import { EmpleadosCapController } from './empleados-cap.controller';
```
Y agregar a los arrays del `@Module` (conservando los del Plan 1):
```typescript
  controllers: [PensumsController, EvaluacionesController, AsignacionesController, EmpleadosCapController],
  providers: [PensumsService, EvaluacionesService, AsignacionesService, EmpleadosCapService],
```

- [ ] **Step 7: Verificar build + suite**

Run: `cd /home/plemus/WebstormProjects/Microservicios/apps/domains/global/recursos-humanos && npm run build`
Expected: sin errores.
Run: `cd /home/plemus/WebstormProjects/Microservicios/apps/domains/global/recursos-humanos && npx jest src/capacitaciones`
Expected: PASS (lib + asignaciones + empleados-cap + las del Plan 1).

- [ ] **Step 8: Commit**

```bash
cd /home/plemus/WebstormProjects/Microservicios
git add apps/domains/global/recursos-humanos/src/capacitaciones/empleados-cap.service.ts \
        apps/domains/global/recursos-humanos/src/capacitaciones/empleados-cap.service.spec.ts \
        apps/domains/global/recursos-humanos/src/capacitaciones/asignaciones.controller.ts \
        apps/domains/global/recursos-humanos/src/capacitaciones/empleados-cap.controller.ts \
        apps/domains/global/recursos-humanos/src/capacitaciones/capacitaciones.module.ts
git commit -m "feat(capacitaciones): EmpleadosCapService (lista/detalle) + controllers de asignación y empleados"
```

---

### Task 6: `ExamenService` — token, examen sin correctas, y calificación orquestada (TDD)

**Files:**
- Create: `$RH/src/capacitaciones/examen.service.ts`
- Create: `$RH/src/capacitaciones/examen.service.spec.ts`

**Interfaces:**
- Consumes: entidades `CapExamenToken`, `CapAsignacionDetalle`, `CapAsignacion`, `CapIntento`, `CapIntentoDetalle`, `CapBono`, `Evaluacion`, `Pregunta`, `Respuesta`, `PensumModulo`; funciones puras de `lib/calificacion.ts`; DTO `EnviarRespuestasDto`.
- Produces (`ExamenService`):
  - `generarToken(idAsignacionDetalle: number, horasVigencia: number): Promise<{ token: string; url: string }>` — valida que el detalle exista; resuelve la evaluación del módulo del detalle; crea `tCapExamenToken` con `token = crypto.randomUUID()`, `expiraEn = ahora + horasVigencia`. `url = '/examen/' + token`. Lanza `BadRequestException` si el detalle no existe o el módulo no tiene evaluación.
  - `obtenerPorToken(token: string): Promise<{ idEvaluacion; nombre; preguntas: Array<{ idPregunta; pregunta; puntos; opciones: Array<{ idRespuesta; respuesta }> }> }>` — valida token existente, no usado, no expirado (`NotFoundException` / `BadRequestException`); devuelve preguntas + opciones **SIN** el flag `respuestaCorrecta`.
  - `calificar(token: string, dto: EnviarRespuestasDto): Promise<{ puntaje; aprobado; estado }>` — valida token; corrige server-side con `calificarIntento`; persiste `CapIntento` + `CapIntentoDetalle[]`; actualiza el `CapAsignacionDetalle` (`puntuacion`, `estado` vía `estadoModulo`, `intentos += 1`); recalcula la licencia del header (`calcularLicencia` sobre TODOS los detalles del header + vigencia de cada módulo); calcula el bono al capacitador si aplica; marca el token usado. Devuelve el resultado.
- El bono usa `crypto`/`randomUUID` solo en `generarToken`. Para `tBonosPorIntento`, leer con raw query: `this.intentoRepo.query('SELECT TOP 1 PrimerIntento, SegundoIntento, TercerIntento FROM dbo.tBonosPorIntento ORDER BY ...')` (usar el repo de `CapIntento` para `.query`). El plan usa `ORDER BY` sin columna específica: usar `SELECT TOP 1 ... FROM dbo.tBonosPorIntento` (config de fila única).

- [ ] **Step 1: Escribir el spec que falla**

`examen.service.spec.ts`:
```typescript
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ExamenService } from './examen.service';

function makeService() {
  const tokenRepo: any = { findOne: jest.fn(), create: jest.fn(), save: jest.fn() };
  const detalleRepo: any = { findOne: jest.fn(), find: jest.fn(), save: jest.fn() };
  const asignacionRepo: any = { findOne: jest.fn(), save: jest.fn() };
  const intentoRepo: any = { create: jest.fn(), save: jest.fn(), query: jest.fn() };
  const intentoDetRepo: any = { create: jest.fn(), save: jest.fn() };
  const bonoRepo: any = { findOne: jest.fn(), create: jest.fn(), save: jest.fn() };
  const evalRepo: any = { findOne: jest.fn() };
  const preguntaRepo: any = { find: jest.fn() };
  const respuestaRepo: any = { find: jest.fn() };
  const moduloRepo: any = { findOne: jest.fn(), find: jest.fn() };
  const service = new ExamenService(
    tokenRepo, detalleRepo, asignacionRepo, intentoRepo, intentoDetRepo, bonoRepo,
    evalRepo, preguntaRepo, respuestaRepo, moduloRepo,
  );
  return {
    service, tokenRepo, detalleRepo, asignacionRepo, intentoRepo, intentoDetRepo,
    bonoRepo, evalRepo, preguntaRepo, respuestaRepo, moduloRepo,
  };
}

describe('ExamenService.generarToken', () => {
  it('crea token con la evaluación del módulo del detalle', async () => {
    const { service, detalleRepo, moduloRepo, evalRepo, tokenRepo } = makeService();
    detalleRepo.findOne.mockResolvedValue({ id: 1, idModulo: 10 });
    moduloRepo.findOne.mockResolvedValue({ id: 10 });
    evalRepo.findOne.mockResolvedValue({ id: 50, idModulo: 10 });
    tokenRepo.create.mockImplementation((d: any) => d);
    tokenRepo.save.mockImplementation(async (e: any) => e);

    const res = await service.generarToken(1, 72);

    expect(res.token).toBeTruthy();
    expect(res.url).toBe('/examen/' + res.token);
    expect(tokenRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({ idAsignacionDetalle: 1, idEvaluacion: 50 }),
    );
  });

  it('falla si el detalle no existe', async () => {
    const { service, detalleRepo } = makeService();
    detalleRepo.findOne.mockResolvedValue(null);
    await expect(service.generarToken(999, 72)).rejects.toBeInstanceOf(BadRequestException);
  });
});

describe('ExamenService.obtenerPorToken', () => {
  it('devuelve preguntas SIN el flag de correcta', async () => {
    const { service, tokenRepo, evalRepo, preguntaRepo, respuestaRepo } = makeService();
    tokenRepo.findOne.mockResolvedValue({
      token: 't1', idEvaluacion: 50, idAsignacionDetalle: 1,
      usadoEn: null, expiraEn: new Date('2999-01-01'),
    });
    evalRepo.findOne.mockResolvedValue({ id: 50, nombre: 'Examen' });
    preguntaRepo.find.mockResolvedValue([{ id: 100, pregunta: '¿?', puntosPorRespuesta: 5 }]);
    respuestaRepo.find.mockResolvedValue([
      { id: 1000, idPregunta: 100, respuesta: 'A', respuestaCorrecta: true },
      { id: 1001, idPregunta: 100, respuesta: 'B', respuestaCorrecta: false },
    ]);

    const res = await service.obtenerPorToken('t1');

    expect(res.preguntas[0].opciones).toEqual([
      { idRespuesta: 1000, respuesta: 'A' },
      { idRespuesta: 1001, respuesta: 'B' },
    ]);
    expect(JSON.stringify(res)).not.toContain('respuestaCorrecta');
  });

  it('falla si el token no existe', async () => {
    const { service, tokenRepo } = makeService();
    tokenRepo.findOne.mockResolvedValue(null);
    await expect(service.obtenerPorToken('x')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('falla si el token ya fue usado', async () => {
    const { service, tokenRepo } = makeService();
    tokenRepo.findOne.mockResolvedValue({ token: 't1', usadoEn: new Date(), expiraEn: new Date('2999-01-01') });
    await expect(service.obtenerPorToken('t1')).rejects.toBeInstanceOf(BadRequestException);
  });

  it('falla si el token expiró', async () => {
    const { service, tokenRepo } = makeService();
    tokenRepo.findOne.mockResolvedValue({ token: 't1', usadoEn: null, expiraEn: new Date('2000-01-01') });
    await expect(service.obtenerPorToken('t1')).rejects.toBeInstanceOf(BadRequestException);
  });
});

describe('ExamenService.calificar (integración con repos mock)', () => {
  function escenarioAprobado() {
    const ctx = makeService();
    const {
      tokenRepo, detalleRepo, asignacionRepo, intentoRepo, intentoDetRepo,
      bonoRepo, evalRepo, preguntaRepo, respuestaRepo, moduloRepo,
    } = ctx;

    tokenRepo.findOne.mockResolvedValue({
      token: 't1', idEvaluacion: 50, idAsignacionDetalle: 1,
      usadoEn: null, expiraEn: new Date('2999-01-01'),
    });
    tokenRepo.save.mockImplementation(async (e: any) => e);
    // detalle que se está calificando
    detalleRepo.findOne.mockResolvedValue({ id: 1, idAsignacion: 70, idModulo: 10, puntuacion: null, estado: 'Pendiente', intentos: 0 });
    detalleRepo.save.mockImplementation(async (e: any) => e);
    // header + todos los detalles del header (un solo módulo) -> al aprobar, licencia activa
    asignacionRepo.findOne.mockResolvedValue({ id: 70, empleadoId: 7, licenciaActiva: false, venceLicencia: null, fechaFinaliza: null });
    asignacionRepo.save.mockImplementation(async (e: any) => e);
    detalleRepo.find.mockResolvedValue([{ id: 1, idAsignacion: 70, idModulo: 10, estado: 'Pendiente', puntuacion: null }]);
    // módulo: 80% aprobación, vigencia 12m, paga bono, capacitador 3
    moduloRepo.findOne.mockImplementation(async (opts: any) => {
      const id = opts.where.id;
      return { id, porcentajeAprobacion: 80, vigencia: 12, bono: true, capacitador: 3 };
    });
    moduloRepo.find.mockResolvedValue([{ id: 10, porcentajeAprobacion: 80, vigencia: 12, bono: true, capacitador: 3 }]);
    // evaluación con 1 pregunta de 100 pts, opción 1000 correcta
    preguntaRepo.find.mockResolvedValue([{ id: 100, pregunta: '¿?', puntosPorRespuesta: 100 }]);
    respuestaRepo.find.mockResolvedValue([
      { id: 1000, idPregunta: 100, respuesta: 'A', respuestaCorrecta: true },
      { id: 1001, idPregunta: 100, respuesta: 'B', respuestaCorrecta: false },
    ]);
    intentoRepo.create.mockImplementation((d: any) => d);
    intentoRepo.save.mockImplementation(async (e: any) => ({ id: 900, ...e }));
    intentoRepo.query.mockResolvedValue([{ PrimerIntento: 100, SegundoIntento: 60, TercerIntento: 30 }]);
    intentoDetRepo.create.mockImplementation((d: any) => d);
    intentoDetRepo.save.mockResolvedValue([]);
    bonoRepo.findOne.mockResolvedValue(null); // sin bono pagado previo
    bonoRepo.create.mockImplementation((d: any) => d);
    bonoRepo.save.mockImplementation(async (e: any) => e);

    return ctx;
  }

  it('aprueba: guarda intento, actualiza detalle, activa licencia e inserta bono', async () => {
    const ctx = escenarioAprobado();
    const { service, detalleRepo, asignacionRepo, intentoRepo, bonoRepo } = ctx;

    const res = await service.calificar('t1', { respuestas: [{ idPregunta: 100, idRespuesta: 1000 }] });

    expect(res).toEqual({ puntaje: 100, aprobado: true, estado: 'Aprobado' });
    // intento guardado
    expect(intentoRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({ idAsignacionDetalle: 1, idEvaluacion: 50, puntaje: 100, aprobado: true }),
    );
    // detalle actualizado (puntuacion/estado/intentos)
    expect(detalleRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({ id: 1, puntuacion: 100, estado: 'Aprobado', intentos: 1 }),
    );
    // licencia activada en el header
    expect(asignacionRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({ id: 70, licenciaActiva: true }),
    );
    // bono insertado con dedup chequeado
    expect(bonoRepo.findOne).toHaveBeenCalled();
    expect(bonoRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({ capacitadorId: 3, empleadoId: 7, idModulo: 10, intentos: 1, monto: 100 }),
    );
  });

  it('no inserta bono si ya hay uno pagado para (empleado, módulo)', async () => {
    const ctx = escenarioAprobado();
    const { service, bonoRepo } = ctx;
    bonoRepo.findOne.mockResolvedValue({ id: 5, pagado: true });

    await service.calificar('t1', { respuestas: [{ idPregunta: 100, idRespuesta: 1000 }] });

    expect(bonoRepo.save).not.toHaveBeenCalled();
  });

  it('reprueba: estado No aprobado, sin bono, licencia inactiva', async () => {
    const ctx = escenarioAprobado();
    const { service, asignacionRepo, bonoRepo } = ctx;

    const res = await service.calificar('t1', { respuestas: [{ idPregunta: 100, idRespuesta: 1001 }] });

    expect(res).toEqual({ puntaje: 0, aprobado: false, estado: 'No aprobado' });
    expect(bonoRepo.save).not.toHaveBeenCalled();
    expect(asignacionRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({ licenciaActiva: false }),
    );
  });
});
```

- [ ] **Step 2: Correr y ver fallar**

Run: `cd /home/plemus/WebstormProjects/Microservicios/apps/domains/global/recursos-humanos && npx jest src/capacitaciones/examen.service.spec.ts`
Expected: FAIL ("Cannot find module './examen.service'").

- [ ] **Step 3: Implementar `ExamenService`**

`examen.service.ts`:
```typescript
import { randomUUID } from 'crypto';
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { CapExamenToken } from '../models/entities/cap-examen-token.entity';
import { CapAsignacionDetalle } from '../models/entities/cap-asignacion-detalle.entity';
import { CapAsignacion } from '../models/entities/cap-asignacion.entity';
import { CapIntento } from '../models/entities/cap-intento.entity';
import { CapIntentoDetalle } from '../models/entities/cap-intento-detalle.entity';
import { CapBono } from '../models/entities/cap-bono.entity';
import { Evaluacion } from '../models/entities/evaluacion.entity';
import { Pregunta } from '../models/entities/pregunta.entity';
import { Respuesta } from '../models/entities/respuesta.entity';
import { PensumModulo } from '../models/entities/pensum-modulo.entity';
import { EnviarRespuestasDto } from './dto/examen.dto';
import {
  calcularLicencia,
  calificarIntento,
  estadoModulo,
  montoBono,
  EstadoModulo,
  PreguntaParaCalificar,
} from './lib/calificacion';

@Injectable()
export class ExamenService {
  constructor(
    @InjectRepository(CapExamenToken) private readonly tokenRepo: Repository<CapExamenToken>,
    @InjectRepository(CapAsignacionDetalle) private readonly detalleRepo: Repository<CapAsignacionDetalle>,
    @InjectRepository(CapAsignacion) private readonly asignacionRepo: Repository<CapAsignacion>,
    @InjectRepository(CapIntento) private readonly intentoRepo: Repository<CapIntento>,
    @InjectRepository(CapIntentoDetalle) private readonly intentoDetRepo: Repository<CapIntentoDetalle>,
    @InjectRepository(CapBono) private readonly bonoRepo: Repository<CapBono>,
    @InjectRepository(Evaluacion) private readonly evalRepo: Repository<Evaluacion>,
    @InjectRepository(Pregunta) private readonly preguntaRepo: Repository<Pregunta>,
    @InjectRepository(Respuesta) private readonly respuestaRepo: Repository<Respuesta>,
    @InjectRepository(PensumModulo) private readonly moduloRepo: Repository<PensumModulo>,
  ) {}

  public async generarToken(
    idAsignacionDetalle: number,
    horasVigencia: number,
  ): Promise<{ token: string; url: string }> {
    const detalle = await this.detalleRepo.findOne({ where: { id: idAsignacionDetalle } });
    if (!detalle) throw new BadRequestException('El detalle de asignación no existe');
    const evaluacion = await this.evalRepo.findOne({ where: { idModulo: detalle.idModulo } });
    if (!evaluacion) throw new BadRequestException('El módulo no tiene evaluación');

    const ahora = new Date();
    const expiraEn = new Date(ahora.getTime() + horasVigencia * 60 * 60 * 1000);
    const token = randomUUID();

    const fila = this.tokenRepo.create({
      token,
      idAsignacionDetalle,
      idEvaluacion: evaluacion.id,
      expiraEn,
      usadoEn: null,
      creadoEn: ahora,
    });
    await this.tokenRepo.save(fila);

    return { token, url: '/examen/' + token };
  }

  public async obtenerPorToken(token: string) {
    const fila = await this.validarToken(token);
    const evaluacion = await this.evalRepo.findOne({ where: { id: fila.idEvaluacion } });
    if (!evaluacion) throw new NotFoundException('Evaluación no encontrada');

    const preguntas = await this.preguntaRepo.find({ where: { idEvaluacion: evaluacion.id } });
    const opciones = await this.cargarOpciones(preguntas);

    return {
      idEvaluacion: evaluacion.id,
      nombre: evaluacion.nombre,
      preguntas: preguntas.map((p) => ({
        idPregunta: p.id,
        pregunta: p.pregunta,
        puntos: p.puntosPorRespuesta,
        // SIN respuestaCorrecta — integridad del examen público.
        opciones: (opciones.get(p.id) ?? []).map((r) => ({
          idRespuesta: r.id,
          respuesta: r.respuesta,
        })),
      })),
    };
  }

  public async calificar(
    token: string,
    dto: EnviarRespuestasDto,
  ): Promise<{ puntaje: number; aprobado: boolean; estado: EstadoModulo }> {
    const fila = await this.validarToken(token);
    const ahora = new Date();

    const detalle = await this.detalleRepo.findOne({ where: { id: fila.idAsignacionDetalle } });
    if (!detalle) throw new BadRequestException('El detalle de asignación no existe');
    const modulo = await this.moduloRepo.findOne({ where: { id: detalle.idModulo } });
    if (!modulo) throw new BadRequestException('El módulo no existe');

    // ── Corrección server-side ──
    const preguntas = await this.preguntaRepo.find({ where: { idEvaluacion: fila.idEvaluacion } });
    const opciones = await this.cargarOpciones(preguntas);
    const paraCalificar: PreguntaParaCalificar[] = preguntas.map((p) => ({
      idPregunta: p.id,
      opciones: (opciones.get(p.id) ?? []).map((r) => ({
        idRespuesta: r.id,
        esCorrecta: r.respuestaCorrecta,
        puntos: p.puntosPorRespuesta ?? 0,
      })),
    }));
    const elegidas = dto.respuestas.map((r) => ({
      idPregunta: r.idPregunta,
      idRespuesta: r.idRespuesta ?? null,
    }));
    const { puntaje, detalle: detalleCalif } = calificarIntento(paraCalificar, elegidas);

    const estado = estadoModulo(puntaje, modulo.porcentajeAprobacion);
    const aprobado = estado === 'Aprobado';

    // ── Persistir intento + su detalle ──
    const intento = this.intentoRepo.create({
      idAsignacionDetalle: detalle.id,
      idEvaluacion: fila.idEvaluacion,
      puntaje,
      aprobado,
      tomadoEn: ahora,
    });
    const intentoGuardado = await this.intentoRepo.save(intento);
    const intentoDetalles = detalleCalif.map((d) =>
      this.intentoDetRepo.create({
        idIntento: intentoGuardado.id,
        idPregunta: d.idPregunta,
        idRespuestaElegida: d.idRespuestaElegida,
        correcta: d.correcta,
        puntos: d.puntos,
      }),
    );
    if (intentoDetalles.length) await this.intentoDetRepo.save(intentoDetalles);

    // ── Actualizar el detalle del módulo (nota = último intento) ──
    const nuevosIntentos = detalle.intentos + 1;
    detalle.puntuacion = puntaje;
    detalle.estado = estado;
    detalle.intentos = nuevosIntentos;
    await this.detalleRepo.save(detalle);

    // ── Recalcular licencia del header sobre TODOS los detalles ──
    await this.recalcularLicencia(detalle.idAsignacion, ahora);

    // ── Bono al capacitador ──
    if (aprobado) {
      await this.intentarRegistrarBono(detalle.idAsignacion, modulo, nuevosIntentos);
    }

    // ── Marcar token usado ──
    fila.usadoEn = ahora;
    await this.tokenRepo.save(fila);

    return { puntaje, aprobado, estado };
  }

  private async validarToken(token: string): Promise<CapExamenToken> {
    const fila = await this.tokenRepo.findOne({ where: { token } });
    if (!fila) throw new NotFoundException('Token no encontrado');
    if (fila.usadoEn) throw new BadRequestException('El examen ya fue enviado');
    if (fila.expiraEn.getTime() < Date.now()) throw new BadRequestException('El examen expiró');
    return fila;
  }

  private async cargarOpciones(preguntas: Pregunta[]): Promise<Map<number, Respuesta[]>> {
    const ids = preguntas.map((p) => p.id);
    const respuestas = ids.length
      ? await this.respuestaRepo.find({ where: { idPregunta: In(ids) } })
      : [];
    const mapa = new Map<number, Respuesta[]>();
    for (const r of respuestas) {
      const arr = mapa.get(r.idPregunta) ?? [];
      arr.push(r);
      mapa.set(r.idPregunta, arr);
    }
    return mapa;
  }

  private async recalcularLicencia(idAsignacion: number, ahora: Date): Promise<void> {
    const header = await this.asignacionRepo.findOne({ where: { id: idAsignacion } });
    if (!header) return;
    const detalles = await this.detalleRepo.find({ where: { idAsignacion } });
    const moduloIds = detalles.map((d) => d.idModulo);
    const modulos = moduloIds.length
      ? await this.moduloRepo.find({ where: { id: In(moduloIds) } })
      : [];
    const vigenciaPorModulo = new Map<number, number | null>();
    for (const m of modulos) vigenciaPorModulo.set(m.id, m.vigencia);

    const licencia = calcularLicencia(
      detalles.map((d) => ({
        estado: d.estado as EstadoModulo,
        vigenciaMeses: vigenciaPorModulo.get(d.idModulo) ?? null,
      })),
      ahora,
    );
    header.licenciaActiva = licencia.activa;
    header.venceLicencia = licencia.venceLicencia;
    header.fechaFinaliza = licencia.fechaFinaliza;
    await this.asignacionRepo.save(header);
  }

  private async intentarRegistrarBono(
    idAsignacion: number,
    modulo: PensumModulo,
    intentos: number,
  ): Promise<void> {
    if (!modulo.bono) return; // el módulo no es bono-elegible
    if (intentos > 3) return; // solo intentos 1..3
    if (modulo.capacitador == null) return; // sin capacitador no hay a quién pagar

    const header = await this.asignacionRepo.findOne({ where: { id: idAsignacion } });
    if (!header) return;

    // Dedup: no pagar dos veces el mismo (empleado, módulo) ya pagado.
    const yaPagado = await this.bonoRepo.findOne({
      where: { empleadoId: header.empleadoId, idModulo: modulo.id, pagado: true },
    });
    if (yaPagado) return;

    const config = await this.intentoRepo.query(
      'SELECT TOP 1 PrimerIntento, SegundoIntento, TercerIntento FROM dbo.tBonosPorIntento',
    );
    const row = Array.isArray(config) && config.length ? config[0] : null;
    if (!row) return;
    const monto = montoBono(intentos, {
      primerIntento: Number(row.PrimerIntento),
      segundoIntento: Number(row.SegundoIntento),
      tercerIntento: Number(row.TercerIntento),
    });
    if (monto <= 0) return;

    const bono = this.bonoRepo.create({
      capacitadorId: modulo.capacitador,
      empleadoId: header.empleadoId,
      idModulo: modulo.id,
      intentos,
      monto,
      pagado: false,
      creadoEn: new Date(),
    });
    await this.bonoRepo.save(bono);
  }
}
```

- [ ] **Step 4: Correr y ver pasar**

Run: `cd /home/plemus/WebstormProjects/Microservicios/apps/domains/global/recursos-humanos && npx jest src/capacitaciones/examen.service.spec.ts`
Expected: PASS (generarToken, obtenerPorToken, y los 3 tests de `calificar`).

- [ ] **Step 5: Commit**

```bash
cd /home/plemus/WebstormProjects/Microservicios
git add apps/domains/global/recursos-humanos/src/capacitaciones/examen.service.ts \
        apps/domains/global/recursos-humanos/src/capacitaciones/examen.service.spec.ts
git commit -m "feat(capacitaciones): ExamenService (token + corrección server-side + licencia + bono)"
```

---

### Task 7: `ExamenController` + registro + verificación final

**Files:**
- Create: `$RH/src/capacitaciones/examen.controller.ts`
- Modify: `$RH/src/capacitaciones/capacitaciones.module.ts`

**Interfaces:**
- Consumes: `ExamenService` (Task 6), DTOs `GenerarExamenDto`, `EnviarRespuestasDto`.
- Produces: rutas `POST /capacitaciones/examenes` (admin), `GET /capacitaciones/examen/:token` (público), `POST /capacitaciones/examen/:token` (público).

- [ ] **Step 1: Crear el controller**

`examen.controller.ts`:
```typescript
import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ExamenService } from './examen.service';
import { EnviarRespuestasDto, GenerarExamenDto } from './dto/examen.dto';

@Controller('capacitaciones')
export class ExamenController {
  constructor(private readonly service: ExamenService) {}

  // Admin: genera el token de examen para un detalle de asignación.
  @Post('examenes')
  public generar(@Body() dto: GenerarExamenDto) {
    return this.service.generarToken(dto.idAsignacionDetalle, dto.horasVigencia ?? 72);
  }

  // Público (sin auth): el empleado abre el examen por el token.
  @Get('examen/:token')
  public obtener(@Param('token') token: string) {
    return this.service.obtenerPorToken(token);
  }

  // Público (sin auth): el empleado envía sus respuestas.
  @Post('examen/:token')
  public enviar(@Param('token') token: string, @Body() dto: EnviarRespuestasDto) {
    return this.service.calificar(token, dto);
  }
}
```

- [ ] **Step 2: Registrar en `capacitaciones.module.ts`**

Agregar imports:
```typescript
import { ExamenService } from './examen.service';
import { ExamenController } from './examen.controller';
```
Y completar los arrays del `@Module` (conservando todo lo anterior):
```typescript
  controllers: [
    PensumsController, EvaluacionesController, AsignacionesController,
    EmpleadosCapController, ExamenController,
  ],
  providers: [
    PensumsService, EvaluacionesService, AsignacionesService,
    EmpleadosCapService, ExamenService,
  ],
```

- [ ] **Step 3: Verificar build + toda la suite del módulo**

Run: `cd /home/plemus/WebstormProjects/Microservicios/apps/domains/global/recursos-humanos && npm run build`
Expected: sin errores.
Run: `cd /home/plemus/WebstormProjects/Microservicios/apps/domains/global/recursos-humanos && npx jest src/capacitaciones`
Expected: PASS (calificacion.spec + asignaciones + empleados-cap + examen + las del Plan 1).

- [ ] **Step 4: Commit**

```bash
cd /home/plemus/WebstormProjects/Microservicios
git add apps/domains/global/recursos-humanos/src/capacitaciones/examen.controller.ts \
        apps/domains/global/recursos-humanos/src/capacitaciones/capacitaciones.module.ts
git commit -m "feat(capacitaciones): ExamenController (rutas públicas) + cierre del backend transaccional"
```

---

## Self-Review

**1. Spec coverage (Plan 2 = transaccional):**
- §4.2 6 tablas nuevas → Task 1 (SQL idempotente + 6 entidades, registradas en `forFeature`). ✓ (se ajusta al texto del prompt: licencia en el header `tCapAsignacion`, detalle solo con `puntuacion/estado/intentos`, según §4.3 "Ajuste al §4.2").
- §4.3 reglas del trigger:
  - Nota = `PuntajeTotal` del intento (sobrescribe) → `calificar` setea `detalle.puntuacion = puntaje`. ✓
  - Estado Pendiente/Aprobado/No aprobado vs `PorcentajeAprobacion` → `estadoModulo` (lib + spec). ✓
  - Licencia a nivel header, todos-aprobados, `VenceLicencia = now + MIN(Vigencia)`, apagar si deja de cumplirse → `calcularLicencia` (lib + spec) + `recalcularLicencia` en el service. ✓
  - Bono: flag `Bono`, aprobó, intentos ≤3, dedup por (empleado, módulo) pagado, monto de `tBonosPorIntento` por nº de intento, capacitador de `tPensumDetalle.Capacitador` → `montoBono` (lib) + `intentarRegistrarBono` (raw query, dedup, dedup test). ✓
- §5 endpoints: asignación primaria/secundaria, empleados lista/detalle, examenes/examen token GET/POST → Tasks 4-7. ✓
- §6 flujo examen tokenizado (token → GET sin correctas → POST corrige server-side, persiste, actualiza, marca usado) → Task 6 (`generarToken`/`obtenerPorToken`/`calificar`) + Task 7 controller. ✓
- Integridad: `RespuestaCorrecta` nunca se serializa al examen público → `obtenerPorToken` mapea solo `{idRespuesta, respuesta}`; spec verifica que el JSON no contiene `respuestaCorrecta`. ✓
- Fuera de alcance (declarado en Global Constraints): migración de vigentes, diploma DOCX, reasignación, frontend → NO incluidos. ✓

**2. Placeholder scan:** Sin "TODO"/"TBD"/"similar a". Todo el código de cada step está completo. Los pasos "aplicar SQL" (Task 1 Step 5) y el smoke manual están marcados como opcionales-si-hay-BD y no bloquean build/tests con mock. La lectura de `tBonosPorIntento` es raw query intencional (config legacy sin entidad) y está cubierta por mock en el spec (`intentoRepo.query`).

**3. Type consistency:**
- Entidades nuevas: PK `Id`, PascalCase, columnas EXACTAS al SQL del Step 1. `licenciaActiva/venceLicencia/fechaFinaliza` en el header `CapAsignacion` (no en el detalle), consistente con §4.3.
- `EstadoModulo` (`'Pendiente'|'Aprobado'|'No aprobado'`) compartido entre lib y service; `detalle.estado` se castea a `EstadoModulo` al pasarlo a `calcularLicencia`.
- `calificarIntento` produce `{puntaje, detalle[]}`; el service mapea `detalle[]` 1:1 a `CapIntentoDetalle` (campos `idRespuestaElegida/correcta/puntos`). Firmas del bloque Interfaces de cada task coinciden con la implementación y con los mocks de los specs.
- `PensumModulo.bono: boolean | null`, `porcentajeAprobacion/vigencia: number | null`, `capacitador: number | null` (entidades del Plan 1) — el service los trata con `?? null`/guardas null antes de usarlos.
- `EnviarRespuestasDto.respuestas[].idRespuesta` opcional → normalizado a `null` antes de `calificarIntento`.
```
