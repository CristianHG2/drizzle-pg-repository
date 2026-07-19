# The repository surface

`baseRepositoryMethods(tableName, table, constraints?)` returns an object with the methods below. Every method respects the `constraints` scope the repository was built with.

`tableName` is the key under `db.query` (the relation name); `table` is the Drizzle table object; `constraints` is an optional equality scope (see [Constraint scoping](constraints.md)).

## Reads

### `find(id): Promise<Row | null>`

Returns the row, or `null` when it does not exist **or falls outside the scope**. Throws `RepositoryIntegrityError` if more than one row matches (a corrupted-data guard).

### `findOrFail(id): Promise<Row>`

Like `find`, but throws `RecordNotFoundError` instead of returning `null`. Use this at call sites that will translate the miss into a domain error.

### `findFirst(options?) / findMany(options?)`

Thin pass-throughs to Drizzle's relational query builder (`db.query.<table>.findFirst/findMany`), with the scope merged into `where`. The full Drizzle query config — `columns`, `with`, `orderBy`, `limit`, nested filters — is available and fully typed.

```ts
await repo.findMany({
  where: { email: { like: '%@acme.com' } },
  with: { organization: true },
  orderBy: { name: 'asc' },
});
```

### `findFirstOrFail(options?)`

`findFirst` that throws `RecordNotFoundError` when nothing matches.

### `paginate({ page?, perPage, sql?, orderBy? }): Promise<Row[]>`

Offset pagination over `db.select().from(table)`. `page` is 1-based and clamped to a minimum of 1. `sql` is an extra `WHERE` fragment (combined with the scope via `AND`); `orderBy` is an array of order expressions. Returns the rows for the page.

```ts
import { and, eq } from 'drizzle-orm';
import { archivedSql } from 'drizzle-pg-repository';

await repo.paginate({
  page: 2,
  perPage: 25,
  sql: and(eq(contacts.organizationId, orgId), archivedSql('exclude')),
  orderBy: [desc(contacts.createdAt)],
});
```

## Writes

### `create(data): Promise<Row>`

Inserts one row and returns it. The scope's columns are pinned onto the values, so they are **omitted from the `data` type** — you cannot set them from the payload. Throws a [typed constraint error](errors.md) on violation, or `UnableToCreateRecordError` if the insert returns nothing.

### `createMany(data[]): Promise<Row[]>`

Inserts many rows (scope pinned onto each) and returns them.

### `update(id, data): Promise<Row>`

Updates the row addressed by `id` **within the scope** and returns the new state. Throws `RecordNotFoundError` if no in-scope row matches — so an attempt to update another tenant's row fails rather than silently doing nothing. The scope columns are re-pinned, so an update cannot move a row out of its scope.

> **Convention:** keep `update` for plain column patches. Model state transitions that carry meaning (archive, activate, verify) as their own named methods layered on top — see [Getting started §5](getting-started.md#5-extend-with-domain-methods).

### `delete(id): Promise<{ id }>`

Deletes the in-scope row and returns `{ id }`. Throws `RecordNotFoundError` if nothing was deleted (missing or out of scope) and `RepositoryIntegrityError` if more than one row was deleted. Driver result shape is normalized, so it works whether your driver reports `rowCount` (node-postgres) or `affectedRows` (pglite).

### `deleteAll(): Promise<void>`

Deletes **every row in the scope**. On an unscoped repository this truncates the table via `DELETE`, so use it deliberately.

## The `constraints` property

Every repository exposes the scope it was built with, for composing custom queries:

```ts
repo.constraints.values; // { organizationId: 'org_123' }  — the raw scope
repo.constraints.sql;    // SQL[] — equality clauses, ready to spread into and(...)
```

Next: [Constraint scoping](constraints.md).
