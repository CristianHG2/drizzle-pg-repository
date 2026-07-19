import { describe, expect, it } from 'vitest';
import { pgTable, text, uuid } from 'drizzle-orm/pg-core';
import { archivedSql, constraintsWhere } from '../src';

const sample = pgTable('sample', {
  id: uuid('id').primaryKey(),
  tenantId: uuid('tenant_id').notNull(),
  label: text('label').notNull(),
});

describe('constraintsWhere', () => {
  it('returns undefined when constraints are undefined', () => {
    expect(constraintsWhere(sample, undefined)).toBeUndefined();
  });

  it('returns undefined when constraints are empty', () => {
    expect(constraintsWhere(sample, {})).toBeUndefined();
  });

  it('returns a SQL expression for a single-key constraint', () => {
    const where = constraintsWhere(sample, {
      tenantId: '00000000-0000-0000-0000-000000000001',
    });
    expect(where).toBeDefined();
    expect(typeof where).toBe('object');
  });

  it('returns a SQL expression for multiple constraints', () => {
    const where = constraintsWhere(sample, {
      tenantId: '00000000-0000-0000-0000-000000000001',
      label: 'foo',
    });
    expect(where).toBeDefined();
  });
});

describe('archivedSql', () => {
  it('returns undefined for include mode', () => {
    expect(archivedSql('include')).toBeUndefined();
  });

  it('returns a SQL expression for exclude mode', () => {
    expect(archivedSql('exclude')).toBeDefined();
  });

  it('returns a SQL expression for only mode', () => {
    expect(archivedSql('only')).toBeDefined();
  });

  it('accepts a custom column name', () => {
    expect(archivedSql('exclude', 'deleted_at')).toBeDefined();
  });
});
