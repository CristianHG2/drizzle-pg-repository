import { describe, expect, it } from 'vitest';
import {
  foreignKey,
  pgTable,
  text,
  unique,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';
import { getConstraintIndex } from '../src';

const calendars = pgTable('holiday_calendars', {
  id: uuid('id').primaryKey(),
  name: text('name').notNull(),
});

const dates = pgTable(
  'holiday_dates',
  {
    id: uuid('id').primaryKey(),
    calendarId: uuid('calendar_id').notNull(),
    label: text('label').notNull(),
    slug: text('slug').notNull(),
  },
  (table) => [
    foreignKey({
      name: 'holiday_dates_calendar_id_fk',
      columns: [table.calendarId],
      foreignColumns: [calendars.id],
    }),
    unique('holiday_dates_label_unique').on(table.label),
    uniqueIndex('holiday_dates_slug_uidx').on(table.slug),
  ]
);

describe('getConstraintIndex', () => {
  it('extracts foreign keys with column, refTable, and refColumn', () => {
    const index = getConstraintIndex(dates);
    const entry = index.fkByName.get('holiday_dates_calendar_id_fk');

    expect(entry).toBeDefined();
    expect(entry?.columns).toEqual(['calendar_id']);
    expect(entry?.refTable).toBe('holiday_calendars');
    expect(entry?.refColumn).toBe('id');
    expect(entry?.refColumns).toEqual(['id']);
  });

  it('extracts unique constraints by name', () => {
    const index = getConstraintIndex(dates);
    const entry = index.uniqueByName.get('holiday_dates_label_unique');

    expect(entry).toBeDefined();
    expect(entry?.columns).toEqual(['label']);
  });

  it('extracts unique indexes by name', () => {
    const index = getConstraintIndex(dates);
    const entry = index.uniqueByName.get('holiday_dates_slug_uidx');

    expect(entry).toBeDefined();
    expect(entry?.columns).toEqual(['slug']);
  });

  it('returns no entries for tables without constraints', () => {
    const index = getConstraintIndex(calendars);
    expect(index.fkByName.size).toBe(0);
  });

  it('memoizes the index for the same table reference', () => {
    const first = getConstraintIndex(dates);
    const second = getConstraintIndex(dates);
    expect(first).toBe(second);
  });
});
