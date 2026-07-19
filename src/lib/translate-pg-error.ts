import {
  CheckConstraintViolationError,
  ForeignKeyViolationError,
  NotNullViolationError,
  PG_CHECK_VIOLATION,
  PG_FK_VIOLATION,
  PG_NOT_NULL_VIOLATION,
  PG_UNIQUE_VIOLATION,
  UniqueConstraintViolationError,
} from '../errors';
import type { ConstraintIndex } from '../types';

type PgErrorShape = Readonly<{
  code: string;
  constraint?: string;
  detail?: string;
  column?: string;
  table?: string;
}>;

const isPgErrorShape = (err: unknown): err is PgErrorShape => {
  if (err === null || typeof err !== 'object') {
    return false;
  }
  const candidate = err as { code?: unknown };
  return typeof candidate.code === 'string';
};

export const isPgConstraintError = (err: unknown): boolean => {
  if (!isPgErrorShape(err)) {
    return false;
  }
  return err.code.startsWith('23');
};

export const translatePgError = (
  err: unknown,
  index: ConstraintIndex
): never => {
  if (!isPgErrorShape(err)) {
    throw err;
  }

  if (err.code === PG_FK_VIOLATION) {
    const fk =
      err.constraint !== undefined
        ? index.fkByName.get(err.constraint)
        : undefined;
    throw new ForeignKeyViolationError({
      constraintName: err.constraint,
      columns: fk?.columns,
      column: fk?.columns[0],
      refTable: fk?.refTable,
      refColumn: fk?.refColumn,
      detail: err.detail,
    });
  }

  if (err.code === PG_UNIQUE_VIOLATION) {
    const unique =
      err.constraint !== undefined
        ? index.uniqueByName.get(err.constraint)
        : undefined;
    throw new UniqueConstraintViolationError({
      constraintName: err.constraint,
      columns: unique?.columns,
      detail: err.detail,
    });
  }

  if (err.code === PG_NOT_NULL_VIOLATION) {
    throw new NotNullViolationError({
      column: err.column,
      table: err.table,
    });
  }

  if (err.code === PG_CHECK_VIOLATION) {
    throw new CheckConstraintViolationError({
      constraintName: err.constraint,
      table: err.table,
    });
  }

  throw err;
};
