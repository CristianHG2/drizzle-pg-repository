# drizzle-pg-repository

A small, typed **repository toolkit for [Drizzle ORM](https://orm.drizzle.team) on PostgreSQL**. It wraps a Drizzle database instance and gives every table a consistent, constraint-scoped CRUD surface, turns raw Postgres constraint violations into typed error classes, and ships a test helper that proves your scoping actually isolates rows.

It is intentionally thin. There is no query DSL to learn, no schema of its own, and no runtime magic — you keep writing Drizzle, and this adds the repository conventions on top.

```ts
import { createBaseRepository } from 'drizzle-pg-repository';
import { db } from './db';
import { contacts } from './schema';

/* wire once at your composition root */
export const baseRepositoryMethods = createBaseRepository(db);

/* a repository scoped to a single organization */
const repo = baseRepositoryMethods('contacts', contacts, {
  organizationId: 'org_123',
});

await repo.create({ email: 'a@b.com', name: 'Ann' }); // organizationId is pinned
await repo.findOrFail(id); // throws RecordNotFoundError if missing or out of scope
await repo.update(id, { name: 'Annie' }); // cannot touch rows in another org
```

## Why

Hand-written repositories drift. One forgets the tenant filter on `delete`, another returns `undefined` instead of throwing, a third leaks a raw `23505` to the HTTP layer. This package standardizes those decisions:

- **Constraint scoping is enforced on every method** — `find`, `findOrFail`, `update`, `delete`, `deleteAll`, `paginate`, `create`, `createMany`. A repository built with `{ organizationId }` can never read or mutate a row belonging to a different organization. This is the multi-tenant safety net.
- **Constraint violations become typed errors** — `ForeignKeyViolationError`, `UniqueConstraintViolationError`, `NotNullViolationError`, `CheckConstraintViolationError`, each carrying the offending columns/constraint name, resolved from your schema metadata.
- **Missing rows throw, they don't return null** — `findOrFail`/`update`/`delete` throw `RecordNotFoundError` so call sites can translate to their own domain errors.
- **The types follow your schema** — the factory is generic over your Drizzle instance, so `findOrFail` returns your row type, `create` requires your insert columns (minus the pinned constraint columns), and an unregistered table name is a compile error.

## Install

```bash
npm install drizzle-pg-repository
# or: pnpm add drizzle-pg-repository
```

`drizzle-orm` (>= 1.0.0-beta.21, the relations-v2 API) is a **peer dependency**. Any Postgres driver works — `node-postgres`, `postgres.js`, `pglite`, etc.

## Requirements & conventions

This toolkit is opinionated in a few specific ways. Adopting it means adopting these:

1. **Postgres + Drizzle relations.** Every table you wrap must be registered in your `defineRelations(...)` config so it appears under `db.query`.
2. **A string `id` primary key.** `find`, `findOrFail`, `update`, and `delete` address rows by an `id` column.
3. **Constraint columns are equality filters.** A scope like `{ organizationId, status }` becomes `WHERE organization_id = ? AND status = ?` on reads and is pinned onto writes.

See [`docs/getting-started.md`](docs/getting-started.md) for the full setup.

## Documentation

| Topic | |
|---|---|
| [Getting started](docs/getting-started.md) | Wire the factory, define a schema, build your first repository |
| [The repository surface](docs/repository.md) | Every method, its scoping behavior, and return contract |
| [Constraint scoping](docs/constraints.md) | How `constraints` work, `constraintsWhere`, `archivedSql` |
| [Typed errors](docs/errors.md) | The error classes, PG code mapping, and translating at the edge |
| [Testing your scoping](docs/testing.md) | `assertConstraintIsolation` and the `/testing` entry point |

## Exports

```ts
/* core (no test dependencies) */
import {
  createBaseRepository,
  constraintsWhere,
  archivedSql,
  getConstraintIndex,
  translatePgError,
  getRelationsForResource,
  RecordNotFoundError,
  ForeignKeyViolationError,
  UniqueConstraintViolationError,
  NotNullViolationError,
  CheckConstraintViolationError,
  // ...plus types: BaseRepositoryMethods, ConstraintsType, Scope, etc.
} from 'drizzle-pg-repository';

/* test helper (pulls in vitest as an optional peer) */
import { assertConstraintIsolation } from 'drizzle-pg-repository/testing';
```

The `testing` entry point is a separate module so `vitest` never enters your production bundle.

## Development

```bash
pnpm install
pnpm test          # runtime tests (real Postgres via pglite)
pnpm test:types    # type-level tests (vitest --typecheck)
pnpm typecheck     # tsc --noEmit
pnpm build         # tsup → dist (ESM + CJS + d.ts)
```

## License

[MIT](LICENSE) © Cristian Herrera
