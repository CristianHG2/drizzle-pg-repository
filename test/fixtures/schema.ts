import { defineRelations } from 'drizzle-orm/relations';
import { sql } from 'drizzle-orm';
import {
  check,
  foreignKey,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from 'drizzle-orm/pg-core';

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
    archivedAt: timestamp('archivedAt', { withTimezone: true }),
  },
  (table) => [
    foreignKey({
      name: 'contacts_organization_id_fk',
      columns: [table.organizationId],
      foreignColumns: [organizations.id],
    }),
    unique('contacts_org_email_unique').on(table.organizationId, table.email),
    check('contacts_name_not_empty', sql`char_length(${table.name}) > 0`),
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
  organizations: {
    contacts: r.many.contacts(),
  },
}));
