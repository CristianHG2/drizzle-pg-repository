import { getTableConfig, PgTable } from 'drizzle-orm/pg-core';
import { ConstraintIndex, ForeignKeyEntry, UniqueEntry } from '../../types';

const cache = new WeakMap<PgTable, ConstraintIndex>();

export const getConstraintIndex = (table: PgTable): ConstraintIndex => {
  const cached = cache.get(table);
  if (cached !== undefined) {
    return cached;
  }

  const config = getTableConfig(table);
  const fkByName = new Map<string, ForeignKeyEntry>();
  const uniqueByName = new Map<string, UniqueEntry>();

  for (const fk of config.foreignKeys) {
    const ref = fk.reference();
    const columns = ref.columns.map((c) => c.name);
    const refColumns = ref.foreignColumns.map((c) => c.name);
    const refTableConfig = getTableConfig(ref.foreignTable);
    const entry: ForeignKeyEntry = {
      columns,
      refTable: refTableConfig.name,
      refColumn: refColumns[0] ?? '',
      refColumns,
    };
    fkByName.set(fk.getName(), entry);
  }

  for (const uc of config.uniqueConstraints) {
    const name = uc.getName();
    if (name === undefined) {
      continue;
    }
    uniqueByName.set(name, { columns: uc.columns.map((c) => c.name) });
  }

  for (const idx of config.indexes) {
    if (!idx.config.unique) {
      continue;
    }
    const name = idx.config.name;
    if (name === undefined) {
      continue;
    }
    const columns = idx.config.columns
      .map((c) => {
        if (c !== null && typeof c === 'object' && 'name' in c) {
          const value = (c as { name?: unknown }).name;
          return typeof value === 'string' ? value : undefined;
        }
        return undefined;
      })
      .filter((c): c is string => c !== undefined);
    uniqueByName.set(name, { columns });
  }

  const result: ConstraintIndex = { fkByName, uniqueByName };
  cache.set(table, result);
  return result;
};
