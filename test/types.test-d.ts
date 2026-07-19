import { describe, expectTypeOf, it } from 'vitest';
import { InferSelectModel } from 'drizzle-orm';
import { createBaseRepository } from '../src';
import type { BaseRepositoryMethods } from '../src';
import type { TestDb } from './fixtures/db';
import { contacts, organizations } from './fixtures/schema';

declare const db: TestDb;
const base = createBaseRepository(db);

type Contact = InferSelectModel<typeof contacts>;

describe('createBaseRepository', () => {
  it('accepts a real relations-enabled drizzle instance', () => {
    expectTypeOf(base).toBeFunction();
  });

  it('rejects a table name that is not registered in the schema', () => {
    /* @ts-expect-error 'widgets' is not a relation on the test db */
    base('widgets', contacts);
  });
});

describe('unscoped repository', () => {
  const repo = base('contacts', contacts);

  it('findOrFail resolves to the full row type', () => {
    expectTypeOf(repo.findOrFail).returns.resolves.toEqualTypeOf<Contact>();
  });

  it('find resolves to the row or null', () => {
    expectTypeOf(repo.find).returns.resolves.toEqualTypeOf<Contact | null>();
  });

  it('create input exposes the table columns', () => {
    expectTypeOf(repo.create).parameter(0).toHaveProperty('organizationId');
    expectTypeOf(repo.create).parameter(0).toHaveProperty('email');
    expectTypeOf(repo.create).parameter(0).toHaveProperty('name');
  });

  it('update returns the row type', () => {
    expectTypeOf(repo.update).returns.resolves.toEqualTypeOf<Contact>();
  });

  it('delete resolves to the id envelope', () => {
    expectTypeOf(repo.delete).returns.resolves.toEqualTypeOf<{ id: string }>();
  });
});

describe('constraint-scoped repository', () => {
  const repo = base('contacts', contacts, { organizationId: '' });

  it('omits the pinned constraint column from create input', () => {
    expectTypeOf(repo.create).parameter(0).not.toHaveProperty('organizationId');
    expectTypeOf(repo.create).parameter(0).toHaveProperty('email');
    expectTypeOf(repo.create).parameter(0).toHaveProperty('name');
  });

  it('types constraint values against the table columns', () => {
    /* @ts-expect-error organizationId is a string column, not a number */
    base('contacts', contacts, { organizationId: 123 });

    /* @ts-expect-error notAColumn is not a column on contacts */
    base('contacts', contacts, { notAColumn: 'x' });
  });

  it('exposes the constraint sql/values envelope', () => {
    expectTypeOf(repo.constraints.sql).toBeArray();
  });
});

describe('BaseRepositoryMethods type', () => {
  it('is constructible for a given db, relation, and table', () => {
    expectTypeOf<
      BaseRepositoryMethods<TestDb, 'organizations', typeof organizations>
    >().toHaveProperty('findOrFail');
  });
});
