# Testing your scoping

Constraint scoping is a security boundary — it is what stops one tenant from reading another's rows. A boundary that isn't tested rots. The `drizzle-pg-repository/testing` entry point ships `assertConstraintIsolation`, a [Vitest](https://vitest.dev) helper that proves a repository cannot reach across its scope.

It lives in a separate module so `vitest` never enters your production bundle; it is declared as an optional peer dependency.

## The idea

You describe, per repository:

- a **`seed`** that inserts two rows in two different scopes (an "inside" row and an "outside" row) and returns their ids and constraints;
- a **`factory`** that builds the repository from a scope;
- a list of **`cases`**, each invoking one method against the *outside* row from an *inside*-scoped repository.

The helper then asserts the boundary holds:

- `kind: 'read'` — the call must **not** return the outside row (it returns `null`, `[]`, or rows whose ids never equal the outside id);
- `kind: 'write'` — the call must **throw** (the row is invisible, so the write finds nothing).

## Example

```ts
// contacts.isolation.test.ts
import { createBaseRepository } from 'drizzle-pg-repository';
import { assertConstraintIsolation } from 'drizzle-pg-repository/testing';
import { db } from './db';
import { contacts, organizations } from './schema';

const base = createBaseRepository(db);

type ContactConstraints = { organizationId: string };
const factory = (c: ContactConstraints) => base('contacts', contacts, c);

assertConstraintIsolation<ContactConstraints, ReturnType<typeof factory>>({
  name: 'contacts scoped by organizationId',
  factory,
  seed: async () => {
    const inside = await base('organizations', organizations).create({ name: 'inside' });
    const outside = await base('organizations', organizations).create({ name: 'outside' });
    const insideContact = await factory({ organizationId: inside.id }).create({
      email: 'inside@b.com', name: 'Inside',
    });
    const outsideContact = await factory({ organizationId: outside.id }).create({
      email: 'outside@b.com', name: 'Outside',
    });
    return {
      insideConstraints: { organizationId: inside.id },
      outsideConstraints: { organizationId: outside.id },
      insideId: insideContact.id,
      outsideId: outsideContact.id,
    };
  },
  cases: [
    { name: 'find',       kind: 'read',  invoke: (r, ids) => r.find(ids.outside) },
    { name: 'findOrFail', kind: 'write', invoke: (r, ids) => r.findOrFail(ids.outside) },
    { name: 'update',     kind: 'write', invoke: (r, ids) => r.update(ids.outside, { name: 'x' }) },
    { name: 'delete',     kind: 'write', invoke: (r, ids) => r.delete(ids.outside) },
  ],
});
```

`assertConstraintIsolation` calls Vitest's `describe`/`it` for you, so just call it at the top level of a test file. Add a `case` for every method your repository exposes — including custom ones — so new scoped methods can't ship without an isolation check.

## Options reference

```ts
assertConstraintIsolation<TConstraints, TRepo>({
  name: string;                              // describe() label
  factory: (c: TConstraints) => TRepo;       // builds the inside-scoped repo
  seed: () => Promise<{
    insideConstraints: TConstraints;
    outsideConstraints: TConstraints;
    insideId: string;
    outsideId: string;
  }>;
  cases: Array<{
    name: string;
    kind: 'read' | 'write';
    invoke: (repo: TRepo, ids: { inside: string; outside: string }) => Promise<unknown>;
  }>;
});
```

`seed` runs once per case (inside each `it`), so keep it deterministic and make sure your test database is migrated and clean beforehand.
