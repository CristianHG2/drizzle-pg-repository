export type ForeignKeyViolationFields = Readonly<{
  constraintName?: string;
  column?: string;
  columns?: string[];
  refTable?: string;
  refColumn?: string;
  detail?: string;
}>;

export class ForeignKeyViolationError extends Error {
  readonly constraintName?: string;
  readonly column?: string;
  readonly columns?: string[];
  readonly refTable?: string;
  readonly refColumn?: string;
  readonly detail?: string;

  constructor(fields: ForeignKeyViolationFields) {
    const message = `${fields.refTable ?? 'referenced row'} not found via ${
      fields.column ?? 'foreign key'
    }`;
    super(message);
    this.name = 'ForeignKeyViolationError';
    this.constraintName = fields.constraintName;
    this.column = fields.column;
    this.columns = fields.columns;
    this.refTable = fields.refTable;
    this.refColumn = fields.refColumn;
    this.detail = fields.detail;
  }
}

export const foreignKeyViolationError = (fields: ForeignKeyViolationFields) =>
  new ForeignKeyViolationError(fields);