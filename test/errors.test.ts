import { describe, expect, it } from 'vitest';
import {
  CheckConstraintViolationError,
  ForeignKeyViolationError,
  NotNullViolationError,
  PG_CHECK_VIOLATION,
  PG_FK_VIOLATION,
  PG_NOT_NULL_VIOLATION,
  PG_UNIQUE_VIOLATION,
  RecordNotFoundError,
  recordNotFoundIfNull,
  RepositoryIntegrityError,
  UnableToCreateRecordError,
  UniqueConstraintViolationError,
} from '../src';

describe('error classes', () => {
  it('are instances of Error with a stable name', () => {
    const cases: Array<[Error, string]> = [
      [new RecordNotFoundError('x'), 'RecordNotFoundError'],
      [new UnableToCreateRecordError('x'), 'UnableToCreateRecordError'],
      [new RepositoryIntegrityError('x'), 'RepositoryIntegrityError'],
      [new ForeignKeyViolationError({}), 'ForeignKeyViolationError'],
      [new UniqueConstraintViolationError({}), 'UniqueConstraintViolationError'],
      [new NotNullViolationError({}), 'NotNullViolationError'],
      [new CheckConstraintViolationError({}), 'CheckConstraintViolationError'],
    ];
    for (const [err, name] of cases) {
      expect(err).toBeInstanceOf(Error);
      expect(err.name).toBe(name);
    }
  });

  it('ForeignKeyViolationError carries its metadata', () => {
    const err = new ForeignKeyViolationError({
      constraintName: 'fk',
      column: 'organization_id',
      columns: ['organization_id'],
      refTable: 'organizations',
      refColumn: 'id',
      detail: 'detail',
    });
    expect(err.refTable).toBe('organizations');
    expect(err.columns).toEqual(['organization_id']);
    expect(err.message).toContain('organizations');
  });

  it('UniqueConstraintViolationError describes the columns in its message', () => {
    const err = new UniqueConstraintViolationError({
      columns: ['organization_id', 'email'],
    });
    expect(err.message).toContain('organization_id, email');
  });

  it('exposes the PG SQLSTATE class-23 constants', () => {
    expect(PG_FK_VIOLATION).toBe('23503');
    expect(PG_UNIQUE_VIOLATION).toBe('23505');
    expect(PG_NOT_NULL_VIOLATION).toBe('23502');
    expect(PG_CHECK_VIOLATION).toBe('23514');
  });
});

describe('recordNotFoundIfNull', () => {
  it('returns the value when present', () => {
    expect(recordNotFoundIfNull(42, 'missing')).toBe(42);
    expect(recordNotFoundIfNull('', 'missing')).toBe('');
    expect(recordNotFoundIfNull(0, 'missing')).toBe(0);
  });

  it('throws RecordNotFoundError for null and undefined', () => {
    expect(() => recordNotFoundIfNull(null, 'missing')).toThrow(
      RecordNotFoundError
    );
    expect(() => recordNotFoundIfNull(undefined, 'missing')).toThrow(
      RecordNotFoundError
    );
  });
});
