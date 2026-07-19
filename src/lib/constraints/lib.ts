import { and, eq, SQL } from 'drizzle-orm';
import { PgTable } from 'drizzle-orm/pg-core';
import type { ConstraintsType } from '../../types';

export const constraintsWhere = <T extends PgTable>(
  table: T,
  constraints: ConstraintsType<T> | undefined
): SQL | undefined => {
  if (constraints === undefined) {
    return undefined;
  }

  const entries = Object.entries(constraints);
  if (entries.length === 0) {
    return undefined;
  }

  const clauses = entries.map(([key, value]) => eq((table as any)[key], value));
  return and(...clauses);
};
