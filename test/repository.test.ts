import { beforeEach, describe, expect, it } from 'vitest';
import { sql } from 'drizzle-orm';
import {
  createBaseRepository,
  ForeignKeyViolationError,
  NotNullViolationError,
  RecordNotFoundError,
  UniqueConstraintViolationError,
} from '../src';
import { createTestDb, migrate } from './fixtures/db';
import { contacts, organizations } from './fixtures/schema';

const { db } = createTestDb();
const base = createBaseRepository(db);
const orgRepo = () => base('organizations', organizations);

const seedOrg = async (name = 'Acme') => {
  const org = await orgRepo().create({ name });
  return org.id;
};

beforeEach(async () => {
  await migrate(db);
  await db.execute(sql`TRUNCATE contacts, organizations CASCADE`);
});

describe('create', () => {
  it('inserts a row and returns it', async () => {
    const orgId = await seedOrg();
    const repo = base('contacts', contacts, { organizationId: orgId });

    const created = await repo.create({ email: 'a@b.com', name: 'Ann' });

    expect(created.id).toBeDefined();
    expect(created.email).toBe('a@b.com');
    expect(created.organizationId).toBe(orgId);
  });

  it('pins the constraint columns onto the inserted row', async () => {
    const orgId = await seedOrg();
    const repo = base('contacts', contacts, { organizationId: orgId });

    /* organizationId is supplied by the constraint, not the payload */
    const created = await repo.create({ email: 'x@y.com', name: 'Ex' });
    expect(created.organizationId).toBe(orgId);
  });

  it('translates a foreign-key violation', async () => {
    const missingOrg = '00000000-0000-0000-0000-0000000000ff';
    const repo = base('contacts', contacts, { organizationId: missingOrg });

    await expect(repo.create({ email: 'a@b.com', name: 'Ann' })).rejects.toBeInstanceOf(
      ForeignKeyViolationError
    );
  });

  it('translates a unique violation with the offending columns', async () => {
    const orgId = await seedOrg();
    const repo = base('contacts', contacts, { organizationId: orgId });
    await repo.create({ email: 'dup@b.com', name: 'First' });

    try {
      await repo.create({ email: 'dup@b.com', name: 'Second' });
      expect.fail('expected a unique violation');
    } catch (err) {
      expect(err).toBeInstanceOf(UniqueConstraintViolationError);
      const unique = err as UniqueConstraintViolationError;
      expect(unique.constraintName).toBe('contacts_org_email_unique');
      expect(unique.columns).toEqual(['organization_id', 'email']);
    }
  });

  it('translates a not-null violation', async () => {
    const orgId = await seedOrg();
    const repo = base('contacts', contacts, { organizationId: orgId });

    await expect(
      repo.create({ email: 'a@b.com', name: null as unknown as string })
    ).rejects.toBeInstanceOf(NotNullViolationError);
  });
});

describe('createMany', () => {
  it('inserts multiple rows with pinned constraints', async () => {
    const orgId = await seedOrg();
    const repo = base('contacts', contacts, { organizationId: orgId });

    const rows = await repo.createMany([
      { email: 'a@b.com', name: 'A' },
      { email: 'b@b.com', name: 'B' },
    ]);

    expect(rows).toHaveLength(2);
    expect(rows.every((r) => r.organizationId === orgId)).toBe(true);
  });
});

describe('find / findOrFail', () => {
  it('find returns null when the row is absent', async () => {
    const orgId = await seedOrg();
    const repo = base('contacts', contacts, { organizationId: orgId });
    expect(await repo.find('00000000-0000-0000-0000-0000000000aa')).toBeNull();
  });

  it('findOrFail throws RecordNotFoundError when absent', async () => {
    const orgId = await seedOrg();
    const repo = base('contacts', contacts, { organizationId: orgId });
    await expect(
      repo.findOrFail('00000000-0000-0000-0000-0000000000aa')
    ).rejects.toBeInstanceOf(RecordNotFoundError);
  });

  it('does not find a row belonging to another constraint scope', async () => {
    const insideOrg = await seedOrg('inside');
    const outsideOrg = await seedOrg('outside');
    const outside = await base('contacts', contacts, {
      organizationId: outsideOrg,
    }).create({ email: 'o@b.com', name: 'Out' });

    const insideRepo = base('contacts', contacts, {
      organizationId: insideOrg,
    });

    expect(await insideRepo.find(outside.id)).toBeNull();
    await expect(insideRepo.findOrFail(outside.id)).rejects.toBeInstanceOf(
      RecordNotFoundError
    );
  });
});

describe('update', () => {
  it('updates a row and returns the new state', async () => {
    const orgId = await seedOrg();
    const repo = base('contacts', contacts, { organizationId: orgId });
    const c = await repo.create({ email: 'a@b.com', name: 'Ann' });

    const updated = await repo.update(c.id, { name: 'Annie' });
    expect(updated.name).toBe('Annie');
  });

  it('throws RecordNotFoundError updating outside the scope', async () => {
    const insideOrg = await seedOrg('inside');
    const outsideOrg = await seedOrg('outside');
    const outside = await base('contacts', contacts, {
      organizationId: outsideOrg,
    }).create({ email: 'o@b.com', name: 'Out' });

    const insideRepo = base('contacts', contacts, {
      organizationId: insideOrg,
    });
    await expect(
      insideRepo.update(outside.id, { name: 'hijack' })
    ).rejects.toBeInstanceOf(RecordNotFoundError);
  });
});

describe('delete / deleteAll', () => {
  it('deletes a row and returns its id', async () => {
    const orgId = await seedOrg();
    const repo = base('contacts', contacts, { organizationId: orgId });
    const c = await repo.create({ email: 'a@b.com', name: 'Ann' });

    expect(await repo.delete(c.id)).toEqual({ id: c.id });
    expect(await repo.find(c.id)).toBeNull();
  });

  it('throws RecordNotFoundError deleting a missing row', async () => {
    const orgId = await seedOrg();
    const repo = base('contacts', contacts, { organizationId: orgId });
    await expect(
      repo.delete('00000000-0000-0000-0000-0000000000aa')
    ).rejects.toBeInstanceOf(RecordNotFoundError);
  });

  it('will not delete a row outside the constraint scope', async () => {
    const insideOrg = await seedOrg('inside');
    const outsideOrg = await seedOrg('outside');
    const outside = await base('contacts', contacts, {
      organizationId: outsideOrg,
    }).create({ email: 'o@b.com', name: 'Out' });

    const insideRepo = base('contacts', contacts, {
      organizationId: insideOrg,
    });
    await expect(insideRepo.delete(outside.id)).rejects.toBeInstanceOf(
      RecordNotFoundError
    );
    /* the outside row survives */
    expect(
      await base('contacts', contacts, { organizationId: outsideOrg }).find(
        outside.id
      )
    ).not.toBeNull();
  });

  it('deleteAll only clears rows within the scope', async () => {
    const insideOrg = await seedOrg('inside');
    const outsideOrg = await seedOrg('outside');
    const insideRepo = base('contacts', contacts, {
      organizationId: insideOrg,
    });
    const outsideRepo = base('contacts', contacts, {
      organizationId: outsideOrg,
    });
    await insideRepo.create({ email: 'i@b.com', name: 'In' });
    await outsideRepo.create({ email: 'o@b.com', name: 'Out' });

    await insideRepo.deleteAll();

    expect(await insideRepo.findMany({})).toHaveLength(0);
    expect(await outsideRepo.findMany({})).toHaveLength(1);
  });
});

describe('paginate', () => {
  it('clamps page to 1 and applies perPage', async () => {
    const orgId = await seedOrg();
    const repo = base('contacts', contacts, { organizationId: orgId });
    await repo.createMany([
      { email: '1@b.com', name: 'One' },
      { email: '2@b.com', name: 'Two' },
      { email: '3@b.com', name: 'Three' },
    ]);

    const firstPage = await repo.paginate({ page: 0, perPage: 2 });
    expect(firstPage).toHaveLength(2);
  });

  it('scopes results to the constraint', async () => {
    const insideOrg = await seedOrg('inside');
    const outsideOrg = await seedOrg('outside');
    await base('contacts', contacts, { organizationId: outsideOrg }).create({
      email: 'o@b.com',
      name: 'Out',
    });
    const insideRepo = base('contacts', contacts, {
      organizationId: insideOrg,
    });
    await insideRepo.create({ email: 'i@b.com', name: 'In' });

    const rows = await insideRepo.paginate({ perPage: 50 });
    expect(rows).toHaveLength(1);
    expect(rows[0]?.organizationId).toBe(insideOrg);
  });
});

describe('unscoped repository (no constraints)', () => {
  it('behaves like a plain repository', async () => {
    const repo = base('organizations', organizations);
    const org = await repo.create({ name: 'NoScope' });
    expect(await repo.findOrFail(org.id)).toMatchObject({ name: 'NoScope' });
  });
});
