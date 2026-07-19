import { beforeAll, describe, expect, it } from 'vitest';
import { and, eq } from 'drizzle-orm';
import { archivedSql, createBaseRepository } from '../src';
import { createTestDb, migrate } from './fixtures/db';
import { contacts, organizations } from './fixtures/schema';

const { db } = createTestDb();
const base = createBaseRepository(db);

let orgId: string;

beforeAll(async () => {
  await migrate(db);
  const org = await base('organizations', organizations).create({
    name: 'Archived Co',
  });
  orgId = org.id;
  const repo = base('contacts', contacts, { organizationId: orgId });
  const live = await repo.create({ email: 'live@b.com', name: 'Live' });
  const gone = await repo.create({ email: 'gone@b.com', name: 'Gone' });
  await repo.update(gone.id, { archivedAt: new Date() });
  void live;
});

describe('archivedSql (against real Postgres)', () => {
  it('exclude returns only non-archived rows', async () => {
    const repo = base('contacts', contacts, { organizationId: orgId });
    const rows = await repo.paginate({
      perPage: 50,
      sql: and(eq(contacts.organizationId, orgId), archivedSql('exclude')),
    });
    expect(rows).toHaveLength(1);
    expect(rows[0]?.email).toBe('live@b.com');
  });

  it('only returns archived rows', async () => {
    const repo = base('contacts', contacts, { organizationId: orgId });
    const rows = await repo.paginate({
      perPage: 50,
      sql: and(eq(contacts.organizationId, orgId), archivedSql('only')),
    });
    expect(rows).toHaveLength(1);
    expect(rows[0]?.email).toBe('gone@b.com');
  });

  it('include applies no archival filter', async () => {
    const repo = base('contacts', contacts, { organizationId: orgId });
    const rows = await repo.paginate({ perPage: 50 });
    expect(rows).toHaveLength(2);
  });
});
