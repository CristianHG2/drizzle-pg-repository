import { PGlite } from '@electric-sql/pglite';
import { drizzle } from 'drizzle-orm/pglite';
import { sql } from 'drizzle-orm';
import { relations, schema } from './schema';

export type TestDb = ReturnType<typeof createTestDb>['db'];

export function createTestDb() {
  const client = new PGlite();
  const db = drizzle({ client, schema, relations });
  return { client, db };
}

/* pglite has no migration runner wired here — create the tables directly so
 * the real PG constraints (FK, unique, not-null, check) are enforced. */
export async function migrate(db: TestDb): Promise<void> {
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS organizations (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      name text NOT NULL
    );
  `);
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS contacts (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      organization_id uuid NOT NULL,
      email text NOT NULL,
      name text NOT NULL,
      "archivedAt" timestamptz,
      CONSTRAINT contacts_organization_id_fk FOREIGN KEY (organization_id) REFERENCES organizations (id),
      CONSTRAINT contacts_org_email_unique UNIQUE (organization_id, email),
      CONSTRAINT contacts_name_not_empty CHECK (char_length(name) > 0)
    );
  `);
}
