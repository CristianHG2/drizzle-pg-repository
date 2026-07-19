# Constraint scoping

A repository's **constraints** are an equality scope that the toolkit enforces on every operation. They are the mechanism behind multi-tenant isolation, soft-partitioning by status, ownership scoping, and any other "this repository only sees a slice of the table" pattern.

## What a scope is

The third argument to `baseRepositoryMethods` is a partial map of columns to values:

```ts
const repo = baseRepositoryMethods('contacts', contacts, {
  organizationId: 'org_123',
});
```

The type of that map is `ConstraintsType<typeof contacts>` — a `Partial` over the table's columns, with each value typed to that column's data type. Passing a non-column key, or a value of the wrong type, is a compile error.

## How it is applied

| Operation | Effect of the scope |
|---|---|
| `find`, `findOrFail`, `findFirst`, `findMany`, `findFirstOrFail` | merged into the `where` filter |
| `paginate` | `AND`-ed into the `WHERE` clause |
| `create`, `createMany` | pinned onto the inserted values (and omitted from the input type) |
| `update` | scopes the `WHERE`, and re-pins the columns in `SET` |
| `delete`, `deleteAll` | scopes the `WHERE` |

Because writes both filter and pin, a scoped repository is a closed world: it cannot read, modify, or delete a row outside its scope, and it cannot create one either. A multi-column scope (`{ organizationId, region }`) becomes a conjunction of equalities.

Verify this holds for your repositories with [`assertConstraintIsolation`](testing.md).

## `constraintsWhere(table, constraints)`

When you write a custom query by hand and want the same scoping, build the `WHERE` fragment with `constraintsWhere`:

```ts
import { and, eq } from 'drizzle-orm';
import { constraintsWhere } from 'drizzle-pg-repository';

const where = and(
  eq(contacts.email, email),
  constraintsWhere(contacts, scope.constraints)
);
```

It returns `undefined` for an absent or empty scope, so it is safe to drop into an `and(...)` unconditionally. This is the helper to reach for inside custom `queries/` functions that take a `scope` argument.

## `archivedSql(mode, column?)`

A convenience for soft-delete filtering. It builds a `WHERE` fragment against a nullable timestamp column (default `archivedAt`):

```ts
import { archivedSql } from 'drizzle-pg-repository';

archivedSql('exclude'); // "archivedAt" IS NULL      — live rows only
archivedSql('only');    // "archivedAt" IS NOT NULL  — archived rows only
archivedSql('include'); // undefined                 — no filter

archivedSql('exclude', 'deleted_at'); // custom column
```

The column identifier is quoted, so mixed-case names (Drizzle's common default) match exactly. Combine it with your scope in `paginate` or a custom query:

```ts
await repo.paginate({
  perPage: 50,
  sql: and(eq(contacts.organizationId, orgId), archivedSql('exclude')),
});
```

Next: [Typed errors](errors.md).
