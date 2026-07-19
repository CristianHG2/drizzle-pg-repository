export type NotNullViolationFields = Readonly<{
  column?: string;
  table?: string;
}>;

export class NotNullViolationError extends Error {
  readonly column?: string;
  readonly table?: string;

  constructor(fields: NotNullViolationFields) {
    super(
      `Not null constraint violated on ${fields.column ?? 'column'}${
        fields.table !== undefined ? ` in ${fields.table}` : ''
      }`
    );
    this.name = 'NotNullViolationError';
    this.column = fields.column;
    this.table = fields.table;
  }
}

export const notNullViolationError = (fields: NotNullViolationFields) =>
  new NotNullViolationError(fields);