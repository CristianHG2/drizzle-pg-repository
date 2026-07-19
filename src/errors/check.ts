export type CheckConstraintViolationFields = Readonly<{
  constraintName?: string;
  table?: string;
}>;

export class CheckConstraintViolationError extends Error {
  readonly constraintName?: string;
  readonly table?: string;

  constructor(fields: CheckConstraintViolationFields) {
    super(
      `Check constraint ${fields.constraintName ?? 'unknown'} violated${
        fields.table !== undefined ? ` on ${fields.table}` : ''
      }`
    );
    this.name = 'CheckConstraintViolationError';
    this.constraintName = fields.constraintName;
    this.table = fields.table;
  }
}

export const checkConstraintViolationError = (
  fields: CheckConstraintViolationFields
) => new CheckConstraintViolationError(fields);