# Getting started

This walkthrough wires the toolkit into a fresh Drizzle + Postgres project.

## 1. Define a schema with relations

`drizzle-pg-repository` uses Drizzle's relational query API (`db.query.<table>`), so every table you intend to wrap must be part of your `defineRelations(...)` config. Each table needs a string `id` primary key.

```ts
// schema.ts
import { defineRelations } from 'drizzle-orm/relations';
import { pgTable, text, uuid, unique, foreignKey } from 'drizzle-orm/pg-core';

export const organizations = pgTable('organizations', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
});

export const contacts = pgTable(
  'contacts',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    organizationId: uuid('organization_id').notNull(),
    email: text('email').notNull(),
    name: text('name').notNull(),
  },
  (table) => [
    foreignKey({
      name: 'contacts_organization_id_fk',
      columns: [table.organizationId],
      foreignColumns: [organizations.id],
    }),
    unique('contacts_org_email_unique').on(table.organizationId, table.email),
  ]
);

export const schema = { organizations, contacts };

export const relations = defineRelations(schema, (r) => ({
  contacts: {
    organization: r.one.organizations({
      from: r.contacts.organizationId,
      to: r.organizations.id,
    }),
  },
  organizations: { contacts: r.many.contacts() },
}));
```

## 2. Create the database instance

Any Postgres driver works. With `node-postgres`:

```ts
// db.ts
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { relations, schema } from './schema';

export const db = drizzle({
  client: new Pool({ connectionString: process.env.DATABASE_URL }),
  schema,
  relations,
});

export type DbType = typeof db;
```

## 3. Bind the factory once

`createBaseRepository(db)` returns your `baseRepositoryMethods` factory, fully typed against the instance you pass. Do this at a single composition root and export the result.

```ts
// repository.ts
import { createBaseRepository } from 'drizzle-pg-repository';
import { db } from './db';

export const baseRepositoryMethods = createBaseRepository(db);
```

## 4. Build repositories

An **unscoped** repository operates on the whole table:

```ts
const organizationsRepo = baseRepositoryMethods('organizations', organizations);

const org = await organizationsRepo.create({ name: 'Acme' });
const same = await organizationsRepo.findOrFail(org.id);
```

A **scoped** repository pins one or more columns. Those columns are filtered on every read and pinned onto every write — the caller cannot escape the scope:

```ts
const contactsRepo = baseRepositoryMethods('contacts', contacts, {
  organizationId: org.id,
});

/* organizationId is supplied by the scope, not the payload */
const contact = await contactsRepo.create({ email: 'a@b.com', name: 'Ann' });

/* a row in another org is invisible: this throws RecordNotFoundError */
await contactsRepo.findOrFail(someOtherOrgsContactId);
```

Typically you expose scoped repositories through a small factory that binds the scope from request context:

```ts
export const contactsRepository = (scope: { organizationId: string }) =>
  baseRepositoryMethods('contacts', contacts, scope);
```

## 5. Extend with domain methods

`baseRepositoryMethods(...)` returns a plain object, so composing custom operations is just spreading:

```ts
export const contactsRepository = (scope: { organizationId: string }) => {
  const base = baseRepositoryMethods('contacts', contacts, scope);
  return {
    ...base,
    archive: (id: string) => base.update(id, { archivedAt: new Date() }),
  };
};
```

Next: [the repository surface](repository.md).
