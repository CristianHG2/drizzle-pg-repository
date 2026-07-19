# Typed errors

The toolkit raises typed error classes instead of letting raw Postgres errors or `null` returns escape. There are two families: **not-found / integrity** errors from the repository logic, and **constraint-violation** errors translated from Postgres `SQLSTATE` class-23 codes.

All are plain `Error` subclasses with a stable `name`, so `instanceof` checks and `err.name` switches both work, and unrecognized errors always bubble up unchanged.

## Not-found & integrity errors

| Class | Thrown when |
|---|---|
| `RecordNotFoundError` | `findOrFail` / `findFirstOrFail` / `update` / `delete` address a row that is missing or outside the scope |
| `UnableToCreateRecordError` | an `insert` returns no row |
| `RepositoryIntegrityError` | a by-`id` operation matches more than one row (data corruption guard) |

`recordNotFoundIfNull(value, message)` is a helper for custom queries: it returns the value when present and throws `RecordNotFoundError` otherwise. It treats only `null`/`undefined` as missing, so `0`, `''`, and `false` pass through.

```ts
import { recordNotFoundIfNull } from 'drizzle-pg-repository';

const [row] = await db.update(contacts).set(patch).where(cond).returning();
return recordNotFoundIfNull(row, `contacts.archive: no row for ${id}`);
```

## Constraint-violation errors

When a write hits a Postgres constraint, the driver error is translated to one of these, with metadata resolved from your schema so the offending columns are named — not just the raw constraint string.

| Class | PG code | Key fields |
|---|---|---|
| `ForeignKeyViolationError` | `23503` | `constraintName`, `column`, `columns`, `refTable`, `refColumn`, `detail` |
| `UniqueConstraintViolationError` | `23505` | `constraintName`, `columns`, `detail` |
| `NotNullViolationError` | `23502` | `column`, `table` |
| `CheckConstraintViolationError` | `23514` | `constraintName`, `table` |

The raw codes are exported too (`PG_FK_VIOLATION`, `PG_UNIQUE_VIOLATION`, `PG_NOT_NULL_VIOLATION`, `PG_CHECK_VIOLATION`) for your own matching.

Translation happens automatically inside `create`, `createMany`, `update`, and `delete`. The toolkit unwraps nested `cause` chains to find the underlying PG error, so it works even when your driver wraps errors.

## Translating at the edge

These are **infrastructure** errors. The call site that understands what a violation *means* should catch the specific class and re-throw a domain error; everything else should keep bubbling to a 500. Never catch `unknown` and remap by string — that masks genuine integrity bugs.

```ts
import { RecordNotFoundError } from 'drizzle-pg-repository';

try {
  return await contactsRepository(scope).findOrFail(input.id);
} catch (err) {
  if (err instanceof RecordNotFoundError) {
    throw new ContactNotFoundError(input.id); // your domain error
  }
  throw err; // integrity errors and everything else propagate
}
```

## `translatePgError` / `getConstraintIndex`

If you run raw SQL outside the repository methods and want the same translation, do it yourself:

```ts
import { translatePgError, getConstraintIndex, isPgConstraintError } from 'drizzle-pg-repository';

try {
  await db.execute(rawStatement);
} catch (err) {
  if (isPgConstraintError(err)) {
    translatePgError(err, getConstraintIndex(contacts)); // always throws
  }
  throw err;
}
```

`getConstraintIndex(table)` reads the table's foreign keys, unique constraints, and unique indexes from Drizzle metadata (memoized per table) so `translatePgError` can map a constraint name back to its columns and referenced table.

Next: [Testing your scoping](testing.md).
