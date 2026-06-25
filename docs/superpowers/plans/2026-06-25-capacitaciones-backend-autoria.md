# Capacitaciones — Plan 1: Backend Autoría (pensums + evaluaciones)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Crear el módulo NestJS `capacitaciones` en el MS `recursos-humanos` con el CRUD de autoría — pensums (capacitación → módulos → temas) y evaluaciones (preguntas + respuestas) — reusando las tablas legacy y agregando el FK real a puesto.

**Architecture:** Módulo NestJS estándar (entity TypeORM + service con repos inyectados + controller delgado + DTOs class-validator), clonando el patrón de `src/organizacion`. Reusa 6 tablas legacy de `INTRA_ROTOTEC` mapeadas como entidades; agrega la columna `id_puesto` a `tPensum`. Sin tablas transaccionales todavía (eso es Plan 2). `synchronize:false`, `autoLoadEntities:true`.

**Tech Stack:** NestJS + Fastify, TypeORM (MSSQL), class-validator, Jest (specs con repos mock, sin TestingModule).

## Global Constraints

- Ruta raíz del MS: `/home/plemus/WebstormProjects/Microservicios/apps/domains/global/recursos-humanos` (en este plan, `$RH`). Repo git: `/home/plemus/WebstormProjects/Microservicios`.
- Prefijo global `/rrhh` lo agrega `main.ts` — los `@Controller` NO lo repiten.
- Respuestas auto-envueltas por `GlobalResponseInterceptor` — NUNCA envolver `{ok,message,data}` a mano.
- TypeORM `synchronize:false`: las tablas NO se crean por la entidad. Tablas/columnas nuevas se crean por SQL idempotente a mano en `$RH/src/capacitaciones/sql/`.
- Entidades sobre tablas legacy: nombre de tabla y columnas EXACTOS, PK `ID` (mayúsculas) salvo `tPuestos` (PK `id`). Columnas nullable se tipan `T | null`.
- Capacitador = `int` (FK a `tEmpleados.id`); no se crea ABM de capacitadores en el MVP.
- Validación: `ValidationPipe` global con `whitelist:true, forbidNonWhitelisted:true` — todo campo del body debe estar en el DTO o la request se rechaza.
- Test runner: `cd $RH && npx jest <ruta-spec>`. Build: `cd $RH && npm run build`.
- Commits en el repo `Microservicios`.

---

## File Structure

```
$RH/src/
├── models/entities/
│   ├── pensum.entity.ts              (NUEVA — tabla tPensum, + col id_puesto)
│   ├── pensum-modulo.entity.ts       (NUEVA — tabla tPensumDetalle)
│   ├── pensum-tema.entity.ts         (NUEVA — tabla tModulosPensum)
│   ├── evaluacion.entity.ts          (NUEVA — tabla tEvaluaciones)
│   ├── pregunta.entity.ts            (NUEVA — tabla tEvaluacionesDetalle)
│   └── respuesta.entity.ts           (NUEVA — tabla tEvaluacionesDetalleRespuestas)
├── capacitaciones/
│   ├── capacitaciones.module.ts      (NUEVA)
│   ├── pensums.service.ts            (NUEVA — CRUD pensum/módulo/tema)
│   ├── pensums.service.spec.ts       (NUEVA)
│   ├── pensums.controller.ts         (NUEVA)
│   ├── evaluaciones.service.ts       (NUEVA — CRUD evaluación/pregunta/respuesta)
│   ├── evaluaciones.service.spec.ts  (NUEVA)
│   ├── evaluaciones.controller.ts    (NUEVA)
│   ├── dto/
│   │   ├── pensum.dto.ts             (NUEVA — Create/Update Pensum)
│   │   ├── modulo.dto.ts             (NUEVA — Create/Update Módulo)
│   │   ├── tema.dto.ts               (NUEVA — Create Tema)
│   │   ├── evaluacion.dto.ts         (NUEVA — Create/Update Evaluación)
│   │   ├── pregunta.dto.ts           (NUEVA — Create Pregunta)
│   │   └── respuesta.dto.ts          (NUEVA — Create Respuesta)
│   └── sql/
│       └── 001-alter-tPensum-add-id_puesto.sql   (NUEVA)
└── app.module.ts                     (MODIFICAR — registrar CapacitacionesModule)
```

Columnas legacy confirmadas (de `ApiRototec/src/services/LicenciasService.js`):
- `tPensum(ID, Nombre, Puesto)`
- `tPensumDetalle(ID, ID_Pensum, Modulo, Objetivo, DuracionHoras, Capacitador, TipoEvaluacion, Instrumentos, PorcentajeAprobacion, Vigencia, Bono)`
- `tModulosPensum(ID, ID_Detalle, Tema, Modalidad, Recursos)`
- `tEvaluaciones(ID, NombreEvaluacion, Id_Capacitacion, Id_Modulo)`
- `tEvaluacionesDetalle(ID, Id_Evaluacion, Pregunta, PuntosPorRespuesta, Id_Tema)`
- `tEvaluacionesDetalleRespuestas(ID, Id_Pregunta, Respuesta, RespuestaCorrecta)`

---

### Task 1: Entidades + scaffold del módulo + SQL `id_puesto`

**Files:**
- Create: `$RH/src/models/entities/pensum.entity.ts`
- Create: `$RH/src/models/entities/pensum-modulo.entity.ts`
- Create: `$RH/src/models/entities/pensum-tema.entity.ts`
- Create: `$RH/src/models/entities/evaluacion.entity.ts`
- Create: `$RH/src/models/entities/pregunta.entity.ts`
- Create: `$RH/src/models/entities/respuesta.entity.ts`
- Create: `$RH/src/capacitaciones/capacitaciones.module.ts`
- Create: `$RH/src/capacitaciones/sql/001-alter-tPensum-add-id_puesto.sql`
- Modify: `$RH/src/app.module.ts` (agregar `CapacitacionesModule` al array `imports`)

**Interfaces:**
- Produces: entidades `Pensum`, `PensumModulo`, `PensumTema`, `Evaluacion`, `Pregunta`, `Respuesta` (importables desde `../models/entities/*`); `CapacitacionesModule`.

- [ ] **Step 1: Crear las 6 entidades**

`pensum.entity.ts`:
```typescript
import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'tPensum', schema: 'dbo' })
export class Pensum {
  @PrimaryGeneratedColumn({ name: 'ID' })
  id: number;

  @Column({ name: 'Nombre', type: 'nvarchar', length: 255 })
  nombre: string;

  @Column({ name: 'Puesto', type: 'nvarchar', length: 255, nullable: true })
  puesto: string | null;

  // NUEVA columna (creada por sql/001) — FK real al puesto, reemplaza el match por string.
  @Column({ name: 'id_puesto', type: 'int', nullable: true })
  idPuesto: number | null;
}
```

`pensum-modulo.entity.ts`:
```typescript
import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'tPensumDetalle', schema: 'dbo' })
export class PensumModulo {
  @PrimaryGeneratedColumn({ name: 'ID' })
  id: number;

  @Column({ name: 'ID_Pensum', type: 'int' })
  idPensum: number;

  @Column({ name: 'Modulo', type: 'nvarchar', length: 255 })
  modulo: string;

  @Column({ name: 'Objetivo', type: 'nvarchar', length: 'MAX', nullable: true })
  objetivo: string | null;

  @Column({ name: 'DuracionHoras', type: 'float', nullable: true })
  duracionHoras: number | null;

  @Column({ name: 'Capacitador', type: 'int', nullable: true })
  capacitador: number | null;

  @Column({ name: 'TipoEvaluacion', type: 'nvarchar', length: 100, nullable: true })
  tipoEvaluacion: string | null;

  @Column({ name: 'Instrumentos', type: 'nvarchar', length: 'MAX', nullable: true })
  instrumentos: string | null;

  @Column({ name: 'PorcentajeAprobacion', type: 'int', nullable: true })
  porcentajeAprobacion: number | null;

  @Column({ name: 'Vigencia', type: 'int', nullable: true })
  vigencia: number | null; // meses de vigencia de la licencia

  @Column({ name: 'Bono', type: 'float', nullable: true })
  bono: number | null;
}
```

`pensum-tema.entity.ts`:
```typescript
import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'tModulosPensum', schema: 'dbo' })
export class PensumTema {
  @PrimaryGeneratedColumn({ name: 'ID' })
  id: number;

  @Column({ name: 'ID_Detalle', type: 'int' })
  idDetalle: number; // FK -> tPensumDetalle.ID

  @Column({ name: 'Tema', type: 'nvarchar', length: 'MAX', nullable: true })
  tema: string | null;

  @Column({ name: 'Modalidad', type: 'nvarchar', length: 255, nullable: true })
  modalidad: string | null;

  @Column({ name: 'Recursos', type: 'nvarchar', length: 'MAX', nullable: true })
  recursos: string | null;
}
```

`evaluacion.entity.ts`:
```typescript
import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'tEvaluaciones', schema: 'dbo' })
export class Evaluacion {
  @PrimaryGeneratedColumn({ name: 'ID' })
  id: number;

  @Column({ name: 'NombreEvaluacion', type: 'nvarchar', length: 255, nullable: true })
  nombre: string | null;

  @Column({ name: 'Id_Capacitacion', type: 'int', nullable: true })
  idCapacitacion: number | null; // tPensum.ID

  @Column({ name: 'Id_Modulo', type: 'int', nullable: true })
  idModulo: number | null; // tPensumDetalle.ID
}
```

`pregunta.entity.ts`:
```typescript
import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'tEvaluacionesDetalle', schema: 'dbo' })
export class Pregunta {
  @PrimaryGeneratedColumn({ name: 'ID' })
  id: number;

  @Column({ name: 'Id_Evaluacion', type: 'int' })
  idEvaluacion: number;

  @Column({ name: 'Pregunta', type: 'nvarchar', length: 'MAX' })
  pregunta: string;

  @Column({ name: 'PuntosPorRespuesta', type: 'float', nullable: true })
  puntosPorRespuesta: number | null;

  @Column({ name: 'Id_Tema', type: 'int', nullable: true })
  idTema: number | null;
}
```

`respuesta.entity.ts`:
```typescript
import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'tEvaluacionesDetalleRespuestas', schema: 'dbo' })
export class Respuesta {
  @PrimaryGeneratedColumn({ name: 'ID' })
  id: number;

  @Column({ name: 'Id_Pregunta', type: 'int' })
  idPregunta: number;

  @Column({ name: 'Respuesta', type: 'nvarchar', length: 'MAX' })
  respuesta: string;

  @Column({ name: 'RespuestaCorrecta', type: 'bit', default: false })
  respuestaCorrecta: boolean;
}
```

- [ ] **Step 2: Crear el SQL idempotente de `id_puesto`**

`sql/001-alter-tPensum-add-id_puesto.sql`:
```sql
-- Agrega el FK real a puesto en tPensum (reemplaza el match por string Puesto).
-- Idempotente: solo agrega la columna si no existe.
IF NOT EXISTS (
  SELECT 1 FROM sys.columns
  WHERE object_id = OBJECT_ID('dbo.tPensum') AND name = 'id_puesto'
)
BEGIN
  ALTER TABLE dbo.tPensum ADD id_puesto INT NULL;
END
GO
```

- [ ] **Step 3: Crear el módulo (sin providers aún; se llenan en tareas siguientes)**

`capacitaciones.module.ts`:
```typescript
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Pensum } from '../models/entities/pensum.entity';
import { PensumModulo } from '../models/entities/pensum-modulo.entity';
import { PensumTema } from '../models/entities/pensum-tema.entity';
import { Evaluacion } from '../models/entities/evaluacion.entity';
import { Pregunta } from '../models/entities/pregunta.entity';
import { Respuesta } from '../models/entities/respuesta.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Pensum, PensumModulo, PensumTema, Evaluacion, Pregunta, Respuesta]),
  ],
  controllers: [],
  providers: [],
})
export class CapacitacionesModule {}
```

- [ ] **Step 4: Registrar el módulo en `app.module.ts`**

Agregar el import al inicio:
```typescript
import { CapacitacionesModule } from './capacitaciones/capacitaciones.module';
```
Y agregar `CapacitacionesModule` al array `imports` (junto a los demás módulos, p.ej. después de `MarcajesModule`).

- [ ] **Step 5: Verificar build**

Run: `cd /home/plemus/WebstormProjects/Microservicios/apps/domains/global/recursos-humanos && npm run build`
Expected: build sin errores de TypeScript.

- [ ] **Step 6: Aplicar el SQL en la BD (manual)**

Ejecutar `sql/001-alter-tPensum-add-id_puesto.sql` contra `INTRA_ROTOTEC`. (Si no hay acceso a la BD en este momento, dejar el archivo creado y anotar que debe correrse antes del deploy; no bloquea el build ni los tests con mock.)

- [ ] **Step 7: Commit**

```bash
cd /home/plemus/WebstormProjects/Microservicios
git add apps/domains/global/recursos-humanos/src/models/entities/pensum.entity.ts \
        apps/domains/global/recursos-humanos/src/models/entities/pensum-modulo.entity.ts \
        apps/domains/global/recursos-humanos/src/models/entities/pensum-tema.entity.ts \
        apps/domains/global/recursos-humanos/src/models/entities/evaluacion.entity.ts \
        apps/domains/global/recursos-humanos/src/models/entities/pregunta.entity.ts \
        apps/domains/global/recursos-humanos/src/models/entities/respuesta.entity.ts \
        apps/domains/global/recursos-humanos/src/capacitaciones/capacitaciones.module.ts \
        apps/domains/global/recursos-humanos/src/capacitaciones/sql/001-alter-tPensum-add-id_puesto.sql \
        apps/domains/global/recursos-humanos/src/app.module.ts
git commit -m "feat(capacitaciones): entidades de autoría + scaffold del módulo"
```

---

### Task 2: DTOs de autoría

**Files:**
- Create: `$RH/src/capacitaciones/dto/pensum.dto.ts`
- Create: `$RH/src/capacitaciones/dto/modulo.dto.ts`
- Create: `$RH/src/capacitaciones/dto/tema.dto.ts`
- Create: `$RH/src/capacitaciones/dto/evaluacion.dto.ts`
- Create: `$RH/src/capacitaciones/dto/pregunta.dto.ts`
- Create: `$RH/src/capacitaciones/dto/respuesta.dto.ts`

**Interfaces:**
- Produces: `CreatePensumDto`, `UpdatePensumDto`, `CreateModuloDto`, `UpdateModuloDto`, `CreateTemaDto`, `CreateEvaluacionDto`, `UpdateEvaluacionDto`, `CreatePreguntaDto`, `CreateRespuestaDto`.

- [ ] **Step 1: Crear los DTOs**

`pensum.dto.ts`:
```typescript
import { IsInt, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class CreatePensumDto {
  @IsString() @MinLength(1) @MaxLength(255)
  nombre: string;

  @IsOptional() @IsString() @MaxLength(255)
  puesto?: string;

  @IsOptional() @IsInt()
  idPuesto?: number;
}

export class UpdatePensumDto {
  @IsOptional() @IsString() @MinLength(1) @MaxLength(255)
  nombre?: string;

  @IsOptional() @IsString() @MaxLength(255)
  puesto?: string;

  @IsOptional() @IsInt()
  idPuesto?: number;
}
```

`modulo.dto.ts`:
```typescript
import { IsInt, IsNumber, IsOptional, IsString, MaxLength, Min, Max } from 'class-validator';

export class CreateModuloDto {
  @IsString() @MaxLength(255)
  modulo: string;

  @IsOptional() @IsString()
  objetivo?: string;

  @IsOptional() @IsNumber()
  duracionHoras?: number;

  @IsOptional() @IsInt()
  capacitador?: number; // tEmpleados.id

  @IsOptional() @IsString() @MaxLength(100)
  tipoEvaluacion?: string;

  @IsOptional() @IsString()
  instrumentos?: string;

  @IsOptional() @IsInt() @Min(0) @Max(100)
  porcentajeAprobacion?: number;

  @IsOptional() @IsInt() @Min(0)
  vigencia?: number; // meses

  @IsOptional() @IsNumber()
  bono?: number;
}

export class UpdateModuloDto {
  @IsOptional() @IsString() @MaxLength(255)
  modulo?: string;

  @IsOptional() @IsString()
  objetivo?: string;

  @IsOptional() @IsNumber()
  duracionHoras?: number;

  @IsOptional() @IsInt()
  capacitador?: number;

  @IsOptional() @IsString() @MaxLength(100)
  tipoEvaluacion?: string;

  @IsOptional() @IsString()
  instrumentos?: string;

  @IsOptional() @IsInt() @Min(0) @Max(100)
  porcentajeAprobacion?: number;

  @IsOptional() @IsInt() @Min(0)
  vigencia?: number;

  @IsOptional() @IsNumber()
  bono?: number;
}
```

`tema.dto.ts`:
```typescript
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateTemaDto {
  @IsString()
  tema: string;

  @IsOptional() @IsString() @MaxLength(255)
  modalidad?: string;

  @IsOptional() @IsString()
  recursos?: string;
}
```

`evaluacion.dto.ts`:
```typescript
import { IsInt, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateEvaluacionDto {
  @IsInt()
  idModulo: number; // tPensumDetalle.ID

  @IsOptional() @IsString() @MaxLength(255)
  nombre?: string;
}

export class UpdateEvaluacionDto {
  @IsOptional() @IsString() @MaxLength(255)
  nombre?: string;
}
```

`pregunta.dto.ts`:
```typescript
import { IsInt, IsNumber, IsOptional, IsString } from 'class-validator';

export class CreatePreguntaDto {
  @IsString()
  pregunta: string;

  @IsOptional() @IsNumber()
  puntosPorRespuesta?: number;

  @IsOptional() @IsInt()
  idTema?: number;
}
```

`respuesta.dto.ts`:
```typescript
import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class CreateRespuestaDto {
  @IsString()
  respuesta: string;

  @IsOptional() @IsBoolean()
  respuestaCorrecta?: boolean;
}
```

- [ ] **Step 2: Verificar build**

Run: `cd /home/plemus/WebstormProjects/Microservicios/apps/domains/global/recursos-humanos && npm run build`
Expected: sin errores.

- [ ] **Step 3: Commit**

```bash
cd /home/plemus/WebstormProjects/Microservicios
git add apps/domains/global/recursos-humanos/src/capacitaciones/dto
git commit -m "feat(capacitaciones): DTOs de autoría (pensum/módulo/tema/evaluación/pregunta/respuesta)"
```

---

### Task 3: `PensumsService` — lectura (lista + árbol)

**Files:**
- Create: `$RH/src/capacitaciones/pensums.service.ts`
- Create: `$RH/src/capacitaciones/pensums.service.spec.ts`

**Interfaces:**
- Consumes: entidades `Pensum`, `PensumModulo`, `PensumTema` (Task 1).
- Produces: `PensumsService.listar(): Promise<Pensum[]>`; `PensumsService.obtenerArbol(idPensum: number): Promise<{ id; nombre; puesto; idPuesto; modulos: Array<{ id; modulo; objetivo; duracionHoras; capacitador; tipoEvaluacion; instrumentos; porcentajeAprobacion; vigencia; bono; temas: Array<{ id; tema; modalidad; recursos }> }> }>`. Lanza `NotFoundException` si el pensum no existe.

- [ ] **Step 1: Escribir el spec que falla**

`pensums.service.spec.ts`:
```typescript
import { NotFoundException } from '@nestjs/common';
import { PensumsService } from './pensums.service';

function makeService() {
  const pensumRepo: any = { find: jest.fn(), findOne: jest.fn(), create: jest.fn(), save: jest.fn(), remove: jest.fn(), count: jest.fn() };
  const moduloRepo: any = { find: jest.fn(), findOne: jest.fn(), create: jest.fn(), save: jest.fn(), remove: jest.fn(), count: jest.fn() };
  const temaRepo: any = { find: jest.fn(), findOne: jest.fn(), create: jest.fn(), save: jest.fn(), remove: jest.fn() };
  const service = new PensumsService(pensumRepo, moduloRepo, temaRepo);
  return { service, pensumRepo, moduloRepo, temaRepo };
}

describe('PensumsService — lectura', () => {
  it('listar devuelve todos los pensums', async () => {
    const { service, pensumRepo } = makeService();
    const filas = [{ id: 1, nombre: 'Op. PVC', puesto: 'Operario', idPuesto: 5 }];
    pensumRepo.find.mockResolvedValue(filas);

    const res = await service.listar();

    expect(res).toBe(filas);
    expect(pensumRepo.find).toHaveBeenCalledTimes(1);
  });

  it('obtenerArbol arma pensum -> modulos -> temas', async () => {
    const { service, pensumRepo, moduloRepo, temaRepo } = makeService();
    pensumRepo.findOne.mockResolvedValue({ id: 1, nombre: 'Op. PVC', puesto: 'Operario', idPuesto: 5 });
    moduloRepo.find.mockResolvedValue([{ id: 10, idPensum: 1, modulo: 'Seguridad', porcentajeAprobacion: 80, vigencia: 12, bono: 0, objetivo: null, duracionHoras: 2, capacitador: 3, tipoEvaluacion: 'Test', instrumentos: null }]);
    temaRepo.find.mockResolvedValue([{ id: 100, idDetalle: 10, tema: 'EPP', modalidad: 'Presencial', recursos: null }]);

    const arbol = await service.obtenerArbol(1);

    expect(arbol.id).toBe(1);
    expect(arbol.modulos).toHaveLength(1);
    expect(arbol.modulos[0].id).toBe(10);
    expect(arbol.modulos[0].temas).toHaveLength(1);
    expect(arbol.modulos[0].temas[0].tema).toBe('EPP');
  });

  it('obtenerArbol lanza NotFoundException si no existe', async () => {
    const { service, pensumRepo } = makeService();
    pensumRepo.findOne.mockResolvedValue(null);
    await expect(service.obtenerArbol(999)).rejects.toBeInstanceOf(NotFoundException);
  });
});
```

- [ ] **Step 2: Correr el spec y ver que falla**

Run: `cd /home/plemus/WebstormProjects/Microservicios/apps/domains/global/recursos-humanos && npx jest src/capacitaciones/pensums.service.spec.ts`
Expected: FAIL ("Cannot find module './pensums.service'").

- [ ] **Step 3: Implementar `PensumsService` (solo lectura por ahora)**

`pensums.service.ts`:
```typescript
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Pensum } from '../models/entities/pensum.entity';
import { PensumModulo } from '../models/entities/pensum-modulo.entity';
import { PensumTema } from '../models/entities/pensum-tema.entity';

@Injectable()
export class PensumsService {
  constructor(
    @InjectRepository(Pensum) private readonly pensumRepo: Repository<Pensum>,
    @InjectRepository(PensumModulo) private readonly moduloRepo: Repository<PensumModulo>,
    @InjectRepository(PensumTema) private readonly temaRepo: Repository<PensumTema>,
  ) {}

  public async listar(): Promise<Pensum[]> {
    return await this.pensumRepo.find();
  }

  public async obtenerArbol(idPensum: number) {
    const pensum = await this.pensumRepo.findOne({ where: { id: idPensum } });
    if (!pensum) throw new NotFoundException('Pensum no encontrado');

    const modulos = await this.moduloRepo.find({ where: { idPensum } });
    const moduloIds = modulos.map((m) => m.id);
    const temas = moduloIds.length
      ? await this.temaRepo.find({ where: { idDetalle: In(moduloIds) } })
      : [];

    const temasPorModulo = new Map<number, PensumTema[]>();
    for (const t of temas) {
      const arr = temasPorModulo.get(t.idDetalle) ?? [];
      arr.push(t);
      temasPorModulo.set(t.idDetalle, arr);
    }

    return {
      id: pensum.id,
      nombre: pensum.nombre,
      puesto: pensum.puesto,
      idPuesto: pensum.idPuesto,
      modulos: modulos.map((m) => ({
        id: m.id,
        modulo: m.modulo,
        objetivo: m.objetivo,
        duracionHoras: m.duracionHoras,
        capacitador: m.capacitador,
        tipoEvaluacion: m.tipoEvaluacion,
        instrumentos: m.instrumentos,
        porcentajeAprobacion: m.porcentajeAprobacion,
        vigencia: m.vigencia,
        bono: m.bono,
        temas: (temasPorModulo.get(m.id) ?? []).map((t) => ({
          id: t.id,
          tema: t.tema,
          modalidad: t.modalidad,
          recursos: t.recursos,
        })),
      })),
    };
  }
}
```

- [ ] **Step 4: Correr el spec y ver que pasa**

Run: `cd /home/plemus/WebstormProjects/Microservicios/apps/domains/global/recursos-humanos && npx jest src/capacitaciones/pensums.service.spec.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
cd /home/plemus/WebstormProjects/Microservicios
git add apps/domains/global/recursos-humanos/src/capacitaciones/pensums.service.ts \
        apps/domains/global/recursos-humanos/src/capacitaciones/pensums.service.spec.ts
git commit -m "feat(capacitaciones): PensumsService lectura (lista + árbol)"
```

---

### Task 4: `PensumsService` — CRUD de pensum, módulo y tema

**Files:**
- Modify: `$RH/src/capacitaciones/pensums.service.ts`
- Modify: `$RH/src/capacitaciones/pensums.service.spec.ts`

**Interfaces:**
- Consumes: DTOs de Task 2 (`CreatePensumDto`, `UpdatePensumDto`, `CreateModuloDto`, `UpdateModuloDto`, `CreateTemaDto`).
- Produces (nuevos métodos en `PensumsService`):
  - `crearPensum(dto: CreatePensumDto): Promise<Pensum>`
  - `actualizarPensum(id: number, dto: UpdatePensumDto): Promise<Pensum>`
  - `eliminarPensum(id: number): Promise<{ id: number }>` (borra módulos y temas en cascada)
  - `crearModulo(idPensum: number, dto: CreateModuloDto): Promise<PensumModulo>`
  - `actualizarModulo(id: number, dto: UpdateModuloDto): Promise<PensumModulo>`
  - `eliminarModulo(id: number): Promise<{ id: number }>` (borra sus temas)
  - `crearTema(idModulo: number, dto: CreateTemaDto): Promise<PensumTema>`
  - `eliminarTema(id: number): Promise<{ id: number }>`

- [ ] **Step 1: Agregar specs que fallan**

Agregar a `pensums.service.spec.ts`:
```typescript
import { BadRequestException } from '@nestjs/common';

describe('PensumsService — CRUD', () => {
  it('crearPensum guarda nombre/puesto/idPuesto', async () => {
    const { service, pensumRepo } = makeService();
    pensumRepo.create.mockImplementation((d: any) => d);
    pensumRepo.save.mockImplementation(async (e: any) => ({ id: 1, ...e }));

    const res = await service.crearPensum({ nombre: 'Op. PVC', puesto: 'Operario', idPuesto: 5 });

    expect(pensumRepo.create).toHaveBeenCalledWith({ nombre: 'Op. PVC', puesto: 'Operario', idPuesto: 5 });
    expect(res.id).toBe(1);
  });

  it('eliminarPensum borra temas, módulos y el pensum', async () => {
    const { service, pensumRepo, moduloRepo, temaRepo } = makeService();
    pensumRepo.findOne.mockResolvedValue({ id: 1 });
    moduloRepo.find.mockResolvedValue([{ id: 10 }, { id: 11 }]);
    temaRepo.find.mockResolvedValue([{ id: 100 }]);

    const res = await service.eliminarPensum(1);

    expect(temaRepo.remove).toHaveBeenCalled();
    expect(moduloRepo.remove).toHaveBeenCalled();
    expect(pensumRepo.remove).toHaveBeenCalled();
    expect(res).toEqual({ id: 1 });
  });

  it('crearModulo valida que el pensum exista', async () => {
    const { service, pensumRepo } = makeService();
    pensumRepo.findOne.mockResolvedValue(null);
    await expect(service.crearModulo(999, { modulo: 'X' } as any)).rejects.toBeInstanceOf(BadRequestException);
  });

  it('crearTema valida que el módulo exista', async () => {
    const { service, moduloRepo } = makeService();
    moduloRepo.findOne.mockResolvedValue(null);
    await expect(service.crearTema(999, { tema: 'X' } as any)).rejects.toBeInstanceOf(BadRequestException);
  });
});
```

- [ ] **Step 2: Correr y ver fallar**

Run: `cd /home/plemus/WebstormProjects/Microservicios/apps/domains/global/recursos-humanos && npx jest src/capacitaciones/pensums.service.spec.ts`
Expected: FAIL (métodos no existen).

- [ ] **Step 3: Implementar los métodos CRUD**

Agregar imports al inicio de `pensums.service.ts`:
```typescript
import { BadRequestException } from '@nestjs/common';
import { CreatePensumDto, UpdatePensumDto } from './dto/pensum.dto';
import { CreateModuloDto, UpdateModuloDto } from './dto/modulo.dto';
import { CreateTemaDto } from './dto/tema.dto';
```
(combinar el import de `@nestjs/common` con el `Injectable, NotFoundException` ya existente: `import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';`)

Agregar estos métodos dentro de la clase `PensumsService`:
```typescript
  // ── Pensum ──
  public async crearPensum(dto: CreatePensumDto): Promise<Pensum> {
    const pensum = this.pensumRepo.create({
      nombre: dto.nombre.trim(),
      puesto: dto.puesto?.trim() ?? null,
      idPuesto: dto.idPuesto ?? null,
    });
    return await this.pensumRepo.save(pensum);
  }

  public async actualizarPensum(id: number, dto: UpdatePensumDto): Promise<Pensum> {
    const pensum = await this.pensumRepo.findOne({ where: { id } });
    if (!pensum) throw new NotFoundException('Pensum no encontrado');
    if (dto.nombre !== undefined) pensum.nombre = dto.nombre.trim();
    if (dto.puesto !== undefined) pensum.puesto = dto.puesto?.trim() ?? null;
    if (dto.idPuesto !== undefined) pensum.idPuesto = dto.idPuesto;
    return await this.pensumRepo.save(pensum);
  }

  public async eliminarPensum(id: number): Promise<{ id: number }> {
    const pensum = await this.pensumRepo.findOne({ where: { id } });
    if (!pensum) throw new NotFoundException('Pensum no encontrado');
    const modulos = await this.moduloRepo.find({ where: { idPensum: id } });
    const moduloIds = modulos.map((m) => m.id);
    if (moduloIds.length) {
      const temas = await this.temaRepo.find({ where: { idDetalle: In(moduloIds) } });
      if (temas.length) await this.temaRepo.remove(temas);
      await this.moduloRepo.remove(modulos);
    }
    await this.pensumRepo.remove(pensum);
    return { id };
  }

  // ── Módulo ──
  public async crearModulo(idPensum: number, dto: CreateModuloDto): Promise<PensumModulo> {
    const pensum = await this.pensumRepo.findOne({ where: { id: idPensum } });
    if (!pensum) throw new BadRequestException('El pensum indicado no existe');
    const modulo = this.moduloRepo.create({
      idPensum,
      modulo: dto.modulo.trim(),
      objetivo: dto.objetivo ?? null,
      duracionHoras: dto.duracionHoras ?? null,
      capacitador: dto.capacitador ?? null,
      tipoEvaluacion: dto.tipoEvaluacion ?? null,
      instrumentos: dto.instrumentos ?? null,
      porcentajeAprobacion: dto.porcentajeAprobacion ?? null,
      vigencia: dto.vigencia ?? null,
      bono: dto.bono ?? null,
    });
    return await this.moduloRepo.save(modulo);
  }

  public async actualizarModulo(id: number, dto: UpdateModuloDto): Promise<PensumModulo> {
    const modulo = await this.moduloRepo.findOne({ where: { id } });
    if (!modulo) throw new NotFoundException('Módulo no encontrado');
    if (dto.modulo !== undefined) modulo.modulo = dto.modulo.trim();
    if (dto.objetivo !== undefined) modulo.objetivo = dto.objetivo;
    if (dto.duracionHoras !== undefined) modulo.duracionHoras = dto.duracionHoras;
    if (dto.capacitador !== undefined) modulo.capacitador = dto.capacitador;
    if (dto.tipoEvaluacion !== undefined) modulo.tipoEvaluacion = dto.tipoEvaluacion;
    if (dto.instrumentos !== undefined) modulo.instrumentos = dto.instrumentos;
    if (dto.porcentajeAprobacion !== undefined) modulo.porcentajeAprobacion = dto.porcentajeAprobacion;
    if (dto.vigencia !== undefined) modulo.vigencia = dto.vigencia;
    if (dto.bono !== undefined) modulo.bono = dto.bono;
    return await this.moduloRepo.save(modulo);
  }

  public async eliminarModulo(id: number): Promise<{ id: number }> {
    const modulo = await this.moduloRepo.findOne({ where: { id } });
    if (!modulo) throw new NotFoundException('Módulo no encontrado');
    const temas = await this.temaRepo.find({ where: { idDetalle: id } });
    if (temas.length) await this.temaRepo.remove(temas);
    await this.moduloRepo.remove(modulo);
    return { id };
  }

  // ── Tema ──
  public async crearTema(idModulo: number, dto: CreateTemaDto): Promise<PensumTema> {
    const modulo = await this.moduloRepo.findOne({ where: { id: idModulo } });
    if (!modulo) throw new BadRequestException('El módulo indicado no existe');
    const tema = this.temaRepo.create({
      idDetalle: idModulo,
      tema: dto.tema,
      modalidad: dto.modalidad ?? null,
      recursos: dto.recursos ?? null,
    });
    return await this.temaRepo.save(tema);
  }

  public async eliminarTema(id: number): Promise<{ id: number }> {
    const tema = await this.temaRepo.findOne({ where: { id } });
    if (!tema) throw new NotFoundException('Tema no encontrado');
    await this.temaRepo.remove(tema);
    return { id };
  }
```

- [ ] **Step 4: Correr y ver pasar**

Run: `cd /home/plemus/WebstormProjects/Microservicios/apps/domains/global/recursos-humanos && npx jest src/capacitaciones/pensums.service.spec.ts`
Expected: PASS (todos).

- [ ] **Step 5: Commit**

```bash
cd /home/plemus/WebstormProjects/Microservicios
git add apps/domains/global/recursos-humanos/src/capacitaciones/pensums.service.ts \
        apps/domains/global/recursos-humanos/src/capacitaciones/pensums.service.spec.ts
git commit -m "feat(capacitaciones): CRUD de pensum/módulo/tema en PensumsService"
```

---

### Task 5: `PensumsController` + registrar en el módulo

**Files:**
- Create: `$RH/src/capacitaciones/pensums.controller.ts`
- Modify: `$RH/src/capacitaciones/capacitaciones.module.ts` (agregar controller + provider)

**Interfaces:**
- Consumes: `PensumsService` (Tasks 3-4) y todos sus DTOs.
- Produces: rutas REST bajo `/rrhh/capacitaciones/...` (el prefijo `/rrhh` lo agrega el bootstrap).

- [ ] **Step 1: Crear el controller**

`pensums.controller.ts`:
```typescript
import { Body, Controller, Delete, Get, Param, ParseIntPipe, Post, Put } from '@nestjs/common';
import { PensumsService } from './pensums.service';
import { CreatePensumDto, UpdatePensumDto } from './dto/pensum.dto';
import { CreateModuloDto, UpdateModuloDto } from './dto/modulo.dto';
import { CreateTemaDto } from './dto/tema.dto';

@Controller('capacitaciones/pensums')
export class PensumsController {
  constructor(private readonly service: PensumsService) {}

  @Get()
  public listar() {
    return this.service.listar();
  }

  @Get(':id')
  public obtenerArbol(@Param('id', ParseIntPipe) id: number) {
    return this.service.obtenerArbol(id);
  }

  @Post()
  public crear(@Body() dto: CreatePensumDto) {
    return this.service.crearPensum(dto);
  }

  @Put(':id')
  public actualizar(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdatePensumDto) {
    return this.service.actualizarPensum(id, dto);
  }

  @Delete(':id')
  public eliminar(@Param('id', ParseIntPipe) id: number) {
    return this.service.eliminarPensum(id);
  }

  // ── Módulos ──
  @Post(':id/modulos')
  public crearModulo(@Param('id', ParseIntPipe) id: number, @Body() dto: CreateModuloDto) {
    return this.service.crearModulo(id, dto);
  }

  @Put('modulos/:id')
  public actualizarModulo(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateModuloDto) {
    return this.service.actualizarModulo(id, dto);
  }

  @Delete('modulos/:id')
  public eliminarModulo(@Param('id', ParseIntPipe) id: number) {
    return this.service.eliminarModulo(id);
  }

  // ── Temas ──
  @Post('modulos/:id/temas')
  public crearTema(@Param('id', ParseIntPipe) id: number, @Body() dto: CreateTemaDto) {
    return this.service.crearTema(id, dto);
  }

  @Delete('temas/:id')
  public eliminarTema(@Param('id', ParseIntPipe) id: number) {
    return this.service.eliminarTema(id);
  }
}
```

- [ ] **Step 2: Registrar controller y provider en `capacitaciones.module.ts`**

```typescript
import { PensumsController } from './pensums.controller';
import { PensumsService } from './pensums.service';
```
Y en el `@Module`:
```typescript
  controllers: [PensumsController],
  providers: [PensumsService],
```

- [ ] **Step 3: Verificar build**

Run: `cd /home/plemus/WebstormProjects/Microservicios/apps/domains/global/recursos-humanos && npm run build`
Expected: sin errores.

- [ ] **Step 4: Smoke test de rutas (manual, opcional si hay BD)**

Levantar el MS (`npm run start:dev`) y `GET http://localhost:4007/rrhh/capacitaciones/pensums` → respuesta `{ok:true,data:[...]}`. Si no hay BD disponible, basta con que el build pase y las rutas queden mapeadas (verificable en el log de arranque de Nest).

- [ ] **Step 5: Commit**

```bash
cd /home/plemus/WebstormProjects/Microservicios
git add apps/domains/global/recursos-humanos/src/capacitaciones/pensums.controller.ts \
        apps/domains/global/recursos-humanos/src/capacitaciones/capacitaciones.module.ts
git commit -m "feat(capacitaciones): PensumsController + registro en el módulo"
```

---

### Task 6: `EvaluacionesService` — CRUD de evaluación, pregunta y respuesta

**Files:**
- Create: `$RH/src/capacitaciones/evaluaciones.service.ts`
- Create: `$RH/src/capacitaciones/evaluaciones.service.spec.ts`

**Interfaces:**
- Consumes: entidades `Evaluacion`, `Pregunta`, `Respuesta` (Task 1), entidad `PensumModulo` (para validar el módulo), DTOs `CreateEvaluacionDto`, `UpdateEvaluacionDto`, `CreatePreguntaDto`, `CreateRespuestaDto` (Task 2).
- Produces (`EvaluacionesService`):
  - `obtenerDeModulo(idModulo: number): Promise<{ evaluacion: Evaluacion; preguntas: Array<Pregunta & { respuestas: Respuesta[] }> } | null>`
  - `crearEvaluacion(dto: CreateEvaluacionDto): Promise<Evaluacion>` (resuelve `idCapacitacion` desde el módulo)
  - `actualizarEvaluacion(id: number, dto: UpdateEvaluacionDto): Promise<Evaluacion>`
  - `eliminarEvaluacion(id: number): Promise<{ id: number }>` (borra preguntas y respuestas)
  - `crearPregunta(idEvaluacion: number, dto: CreatePreguntaDto): Promise<Pregunta>`
  - `eliminarPregunta(id: number): Promise<{ id: number }>` (borra sus respuestas)
  - `crearRespuesta(idPregunta: number, dto: CreateRespuestaDto): Promise<Respuesta>`
  - `eliminarRespuesta(id: number): Promise<{ id: number }>`

- [ ] **Step 1: Escribir el spec que falla**

`evaluaciones.service.spec.ts`:
```typescript
import { BadRequestException } from '@nestjs/common';
import { EvaluacionesService } from './evaluaciones.service';

function makeService() {
  const evalRepo: any = { find: jest.fn(), findOne: jest.fn(), create: jest.fn(), save: jest.fn(), remove: jest.fn() };
  const preguntaRepo: any = { find: jest.fn(), findOne: jest.fn(), create: jest.fn(), save: jest.fn(), remove: jest.fn() };
  const respuestaRepo: any = { find: jest.fn(), findOne: jest.fn(), create: jest.fn(), save: jest.fn(), remove: jest.fn() };
  const moduloRepo: any = { findOne: jest.fn() };
  const service = new EvaluacionesService(evalRepo, preguntaRepo, respuestaRepo, moduloRepo);
  return { service, evalRepo, preguntaRepo, respuestaRepo, moduloRepo };
}

describe('EvaluacionesService', () => {
  it('crearEvaluacion resuelve idCapacitacion desde el módulo', async () => {
    const { service, moduloRepo, evalRepo } = makeService();
    moduloRepo.findOne.mockResolvedValue({ id: 10, idPensum: 1 });
    evalRepo.create.mockImplementation((d: any) => d);
    evalRepo.save.mockImplementation(async (e: any) => ({ id: 50, ...e }));

    const res = await service.crearEvaluacion({ idModulo: 10, nombre: 'Examen Seguridad' });

    expect(evalRepo.create).toHaveBeenCalledWith({ idModulo: 10, idCapacitacion: 1, nombre: 'Examen Seguridad' });
    expect(res.id).toBe(50);
  });

  it('crearEvaluacion falla si el módulo no existe', async () => {
    const { service, moduloRepo } = makeService();
    moduloRepo.findOne.mockResolvedValue(null);
    await expect(service.crearEvaluacion({ idModulo: 999 } as any)).rejects.toBeInstanceOf(BadRequestException);
  });

  it('eliminarPregunta borra sus respuestas', async () => {
    const { service, preguntaRepo, respuestaRepo } = makeService();
    preguntaRepo.findOne.mockResolvedValue({ id: 70 });
    respuestaRepo.find.mockResolvedValue([{ id: 700 }, { id: 701 }]);

    const res = await service.eliminarPregunta(70);

    expect(respuestaRepo.remove).toHaveBeenCalled();
    expect(preguntaRepo.remove).toHaveBeenCalled();
    expect(res).toEqual({ id: 70 });
  });

  it('crearRespuesta valida que la pregunta exista', async () => {
    const { service, preguntaRepo } = makeService();
    preguntaRepo.findOne.mockResolvedValue(null);
    await expect(service.crearRespuesta(999, { respuesta: 'X' } as any)).rejects.toBeInstanceOf(BadRequestException);
  });
});
```

- [ ] **Step 2: Correr y ver fallar**

Run: `cd /home/plemus/WebstormProjects/Microservicios/apps/domains/global/recursos-humanos && npx jest src/capacitaciones/evaluaciones.service.spec.ts`
Expected: FAIL ("Cannot find module './evaluaciones.service'").

- [ ] **Step 3: Implementar `EvaluacionesService`**

`evaluaciones.service.ts`:
```typescript
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Evaluacion } from '../models/entities/evaluacion.entity';
import { Pregunta } from '../models/entities/pregunta.entity';
import { Respuesta } from '../models/entities/respuesta.entity';
import { PensumModulo } from '../models/entities/pensum-modulo.entity';
import { CreateEvaluacionDto, UpdateEvaluacionDto } from './dto/evaluacion.dto';
import { CreatePreguntaDto } from './dto/pregunta.dto';
import { CreateRespuestaDto } from './dto/respuesta.dto';

@Injectable()
export class EvaluacionesService {
  constructor(
    @InjectRepository(Evaluacion) private readonly evalRepo: Repository<Evaluacion>,
    @InjectRepository(Pregunta) private readonly preguntaRepo: Repository<Pregunta>,
    @InjectRepository(Respuesta) private readonly respuestaRepo: Repository<Respuesta>,
    @InjectRepository(PensumModulo) private readonly moduloRepo: Repository<PensumModulo>,
  ) {}

  public async obtenerDeModulo(idModulo: number) {
    const evaluacion = await this.evalRepo.findOne({ where: { idModulo } });
    if (!evaluacion) return null;
    const preguntas = await this.preguntaRepo.find({ where: { idEvaluacion: evaluacion.id } });
    const preguntaIds = preguntas.map((p) => p.id);
    const respuestas = preguntaIds.length
      ? await this.respuestaRepo.find({ where: { idPregunta: In(preguntaIds) } })
      : [];
    const respPorPregunta = new Map<number, Respuesta[]>();
    for (const r of respuestas) {
      const arr = respPorPregunta.get(r.idPregunta) ?? [];
      arr.push(r);
      respPorPregunta.set(r.idPregunta, arr);
    }
    return {
      evaluacion,
      preguntas: preguntas.map((p) => ({ ...p, respuestas: respPorPregunta.get(p.id) ?? [] })),
    };
  }

  public async crearEvaluacion(dto: CreateEvaluacionDto): Promise<Evaluacion> {
    const modulo = await this.moduloRepo.findOne({ where: { id: dto.idModulo } });
    if (!modulo) throw new BadRequestException('El módulo indicado no existe');
    const evaluacion = this.evalRepo.create({
      idModulo: dto.idModulo,
      idCapacitacion: modulo.idPensum,
      nombre: dto.nombre ?? null,
    });
    return await this.evalRepo.save(evaluacion);
  }

  public async actualizarEvaluacion(id: number, dto: UpdateEvaluacionDto): Promise<Evaluacion> {
    const evaluacion = await this.evalRepo.findOne({ where: { id } });
    if (!evaluacion) throw new NotFoundException('Evaluación no encontrada');
    if (dto.nombre !== undefined) evaluacion.nombre = dto.nombre;
    return await this.evalRepo.save(evaluacion);
  }

  public async eliminarEvaluacion(id: number): Promise<{ id: number }> {
    const evaluacion = await this.evalRepo.findOne({ where: { id } });
    if (!evaluacion) throw new NotFoundException('Evaluación no encontrada');
    const preguntas = await this.preguntaRepo.find({ where: { idEvaluacion: id } });
    const preguntaIds = preguntas.map((p) => p.id);
    if (preguntaIds.length) {
      const respuestas = await this.respuestaRepo.find({ where: { idPregunta: In(preguntaIds) } });
      if (respuestas.length) await this.respuestaRepo.remove(respuestas);
      await this.preguntaRepo.remove(preguntas);
    }
    await this.evalRepo.remove(evaluacion);
    return { id };
  }

  public async crearPregunta(idEvaluacion: number, dto: CreatePreguntaDto): Promise<Pregunta> {
    const evaluacion = await this.evalRepo.findOne({ where: { id: idEvaluacion } });
    if (!evaluacion) throw new BadRequestException('La evaluación indicada no existe');
    const pregunta = this.preguntaRepo.create({
      idEvaluacion,
      pregunta: dto.pregunta,
      puntosPorRespuesta: dto.puntosPorRespuesta ?? null,
      idTema: dto.idTema ?? null,
    });
    return await this.preguntaRepo.save(pregunta);
  }

  public async eliminarPregunta(id: number): Promise<{ id: number }> {
    const pregunta = await this.preguntaRepo.findOne({ where: { id } });
    if (!pregunta) throw new NotFoundException('Pregunta no encontrada');
    const respuestas = await this.respuestaRepo.find({ where: { idPregunta: id } });
    if (respuestas.length) await this.respuestaRepo.remove(respuestas);
    await this.preguntaRepo.remove(pregunta);
    return { id };
  }

  public async crearRespuesta(idPregunta: number, dto: CreateRespuestaDto): Promise<Respuesta> {
    const pregunta = await this.preguntaRepo.findOne({ where: { id: idPregunta } });
    if (!pregunta) throw new BadRequestException('La pregunta indicada no existe');
    const respuesta = this.respuestaRepo.create({
      idPregunta,
      respuesta: dto.respuesta,
      respuestaCorrecta: dto.respuestaCorrecta ?? false,
    });
    return await this.respuestaRepo.save(respuesta);
  }

  public async eliminarRespuesta(id: number): Promise<{ id: number }> {
    const respuesta = await this.respuestaRepo.findOne({ where: { id } });
    if (!respuesta) throw new NotFoundException('Respuesta no encontrada');
    await this.respuestaRepo.remove(respuesta);
    return { id };
  }
}
```

- [ ] **Step 4: Correr y ver pasar**

Run: `cd /home/plemus/WebstormProjects/Microservicios/apps/domains/global/recursos-humanos && npx jest src/capacitaciones/evaluaciones.service.spec.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
cd /home/plemus/WebstormProjects/Microservicios
git add apps/domains/global/recursos-humanos/src/capacitaciones/evaluaciones.service.ts \
        apps/domains/global/recursos-humanos/src/capacitaciones/evaluaciones.service.spec.ts
git commit -m "feat(capacitaciones): EvaluacionesService CRUD (evaluación/pregunta/respuesta)"
```

---

### Task 7: `EvaluacionesController` + registro + verificación final

**Files:**
- Create: `$RH/src/capacitaciones/evaluaciones.controller.ts`
- Modify: `$RH/src/capacitaciones/capacitaciones.module.ts`

**Interfaces:**
- Consumes: `EvaluacionesService` (Task 6) y sus DTOs.
- Produces: rutas bajo `/rrhh/capacitaciones/...`.

- [ ] **Step 1: Crear el controller**

`evaluaciones.controller.ts`:
```typescript
import { Body, Controller, Delete, Get, Param, ParseIntPipe, Post, Put } from '@nestjs/common';
import { EvaluacionesService } from './evaluaciones.service';
import { CreateEvaluacionDto, UpdateEvaluacionDto } from './dto/evaluacion.dto';
import { CreatePreguntaDto } from './dto/pregunta.dto';
import { CreateRespuestaDto } from './dto/respuesta.dto';

@Controller('capacitaciones')
export class EvaluacionesController {
  constructor(private readonly service: EvaluacionesService) {}

  @Get('modulos/:id/evaluacion')
  public obtenerDeModulo(@Param('id', ParseIntPipe) id: number) {
    return this.service.obtenerDeModulo(id);
  }

  @Post('evaluaciones')
  public crear(@Body() dto: CreateEvaluacionDto) {
    return this.service.crearEvaluacion(dto);
  }

  @Put('evaluaciones/:id')
  public actualizar(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateEvaluacionDto) {
    return this.service.actualizarEvaluacion(id, dto);
  }

  @Delete('evaluaciones/:id')
  public eliminar(@Param('id', ParseIntPipe) id: number) {
    return this.service.eliminarEvaluacion(id);
  }

  @Post('evaluaciones/:id/preguntas')
  public crearPregunta(@Param('id', ParseIntPipe) id: number, @Body() dto: CreatePreguntaDto) {
    return this.service.crearPregunta(id, dto);
  }

  @Delete('preguntas/:id')
  public eliminarPregunta(@Param('id', ParseIntPipe) id: number) {
    return this.service.eliminarPregunta(id);
  }

  @Post('preguntas/:id/respuestas')
  public crearRespuesta(@Param('id', ParseIntPipe) id: number, @Body() dto: CreateRespuestaDto) {
    return this.service.crearRespuesta(id, dto);
  }

  @Delete('respuestas/:id')
  public eliminarRespuesta(@Param('id', ParseIntPipe) id: number) {
    return this.service.eliminarRespuesta(id);
  }
}
```

- [ ] **Step 2: Registrar en `capacitaciones.module.ts`**

Agregar imports y completar el `@Module`:
```typescript
import { EvaluacionesController } from './evaluaciones.controller';
import { EvaluacionesService } from './evaluaciones.service';
```
```typescript
  controllers: [PensumsController, EvaluacionesController],
  providers: [PensumsService, EvaluacionesService],
```

- [ ] **Step 3: Verificar build + toda la suite del módulo**

Run: `cd /home/plemus/WebstormProjects/Microservicios/apps/domains/global/recursos-humanos && npm run build`
Expected: sin errores.
Run: `cd /home/plemus/WebstormProjects/Microservicios/apps/domains/global/recursos-humanos && npx jest src/capacitaciones`
Expected: PASS (pensums.service.spec + evaluaciones.service.spec).

- [ ] **Step 4: Commit**

```bash
cd /home/plemus/WebstormProjects/Microservicios
git add apps/domains/global/recursos-humanos/src/capacitaciones/evaluaciones.controller.ts \
        apps/domains/global/recursos-humanos/src/capacitaciones/capacitaciones.module.ts
git commit -m "feat(capacitaciones): EvaluacionesController + cierre del módulo de autoría"
```

---

## Self-Review

**1. Spec coverage (Plan 1 = autoría):**
- Reusar tablas de autoría con `id_puesto` nuevo → Task 1 (entidades + SQL). ✓
- CRUD pensums (capacitación → módulos → temas) → Tasks 3-5. ✓
- CRUD evaluaciones (preguntas/respuestas) → Tasks 6-7. ✓
- `RespuestaCorrecta` nunca se filtra al examen público → fuera de alcance de este plan (el endpoint de examen es Plan 2); aquí se gestiona solo desde rutas admin. ✓
- Asignación / examen / calificación / licencias / bono → **Plan 2** (no en este plan). Documentado.

**2. Placeholder scan:** Sin "TBD"/"TODO". Los pasos de "smoke test manual" y "aplicar SQL" están marcados como opcionales-si-hay-BD y no bloquean build/tests con mock. La regla del trigger NO aparece aquí (es de Plan 2).

**3. Type consistency:** `idPensum`/`idDetalle`/`idEvaluacion`/`idPregunta`/`idModulo` consistentes entre entidades, service y specs. PK `ID` en entidades legacy. `crearEvaluacion` usa `modulo.idPensum` → `idCapacitacion` (consistente con la entidad `Evaluacion.idCapacitacion`). Firmas de métodos del bloque Interfaces coinciden con la implementación.
