import { describe, expect, it } from 'vitest';
import {
  CheckConstraintViolationError,
  ForeignKeyViolationError,
  NotNullViolationError,
  UniqueConstraintViolationError,
  translatePgError,
} from '../src';
import type { ConstraintIndex } from '../src';

const makeIndex = (): ConstraintIndex => ({
  fkByName: new Map([
    [
      'holiday_dates_calendar_id_fk',
      {
        columns: ['calendarId'],
        refTable: 'holiday_calendars',
        refColumn: 'id',
        refColumns: ['id'],
      },
    ],
  ]),
  uniqueByName: new Map([
    [
      'contacts_email_unique',
      {
        columns: ['email'],
      },
    ],
  ]),
});

describe('translatePgError', () => {
  it('translates 23503 foreign key violations with constraint lookup', () => {
    const err = {
      code: '23503',
      constraint: 'holiday_dates_calendar_id_fk',
      detail:
        'Key (calendarId)=(abc) is not present in table "holiday_calendars".',
    };

    try {
      translatePgError(err, makeIndex());
      expect.fail('expected to throw');
    } catch (caught) {
      expect(caught).toBeInstanceOf(ForeignKeyViolationError);
      const fk = caught as ForeignKeyViolationError;
      expect(fk.constraintName).toBe('holiday_dates_calendar_id_fk');
      expect(fk.column).toBe('calendarId');
      expect(fk.columns).toEqual(['calendarId']);
      expect(fk.refTable).toBe('holiday_calendars');
      expect(fk.refColumn).toBe('id');
      expect(fk.detail).toContain('Key (calendarId)');
    }
  });

  it('translates 23503 with unknown constraint name without resolved column', () => {
    const err = {
      code: '23503',
      constraint: 'unknown_fk',
      detail: 'detail text',
    };

    try {
      translatePgError(err, makeIndex());
      expect.fail('expected to throw');
    } catch (caught) {
      expect(caught).toBeInstanceOf(ForeignKeyViolationError);
      const fk = caught as ForeignKeyViolationError;
      expect(fk.constraintName).toBe('unknown_fk');
      expect(fk.column).toBeUndefined();
      expect(fk.refTable).toBeUndefined();
    }
  });

  it('translates 23505 unique violations with column lookup', () => {
    const err = {
      code: '23505',
      constraint: 'contacts_email_unique',
      detail: 'Key (email)=(x@y.com) already exists.',
    };

    try {
      translatePgError(err, makeIndex());
      expect.fail('expected to throw');
    } catch (caught) {
      expect(caught).toBeInstanceOf(UniqueConstraintViolationError);
      const ue = caught as UniqueConstraintViolationError;
      expect(ue.constraintName).toBe('contacts_email_unique');
      expect(ue.columns).toEqual(['email']);
      expect(ue.detail).toContain('already exists');
    }
  });

  it('translates 23502 not null violations with column metadata', () => {
    const err = { code: '23502', column: 'name', table: 'contacts' };

    try {
      translatePgError(err, makeIndex());
      expect.fail('expected to throw');
    } catch (caught) {
      expect(caught).toBeInstanceOf(NotNullViolationError);
      const nn = caught as NotNullViolationError;
      expect(nn.column).toBe('name');
      expect(nn.table).toBe('contacts');
    }
  });

  it('translates 23514 check constraint violations', () => {
    const err = {
      code: '23514',
      constraint: 'positive_amount',
      table: 'invoices',
    };

    try {
      translatePgError(err, makeIndex());
      expect.fail('expected to throw');
    } catch (caught) {
      expect(caught).toBeInstanceOf(CheckConstraintViolationError);
      const ce = caught as CheckConstraintViolationError;
      expect(ce.constraintName).toBe('positive_amount');
      expect(ce.table).toBe('invoices');
    }
  });

  it('rethrows unknown PG error codes as-is', () => {
    const err = { code: '42P01', message: 'undefined_table' };

    expect(() => translatePgError(err, makeIndex())).toThrow();
    try {
      translatePgError(err, makeIndex());
    } catch (caught) {
      expect(caught).toBe(err);
    }
  });

  it('rethrows non-pg-shaped errors as-is', () => {
    const err = new Error('boom');

    try {
      translatePgError(err, makeIndex());
      expect.fail('expected to throw');
    } catch (caught) {
      expect(caught).toBe(err);
    }
  });

  it('rethrows primitive throws as-is', () => {
    try {
      translatePgError('a string', makeIndex());
      expect.fail('expected to throw');
    } catch (caught) {
      expect(caught).toBe('a string');
    }
  });
});
