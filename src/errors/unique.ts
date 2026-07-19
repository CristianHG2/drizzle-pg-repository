export type UniqueConstraintViolationFields = Readonly<{
  constraintName?: string;
  columns?: string[];
  detail?: string;
}>;

export class UniqueConstraintViolationError extends Error {
  readonly constraintName?: string;
  readonly columns?: string[];
  readonly detail?: string;

  constructor(fields: UniqueConstraintViolationFields) {
    const columnPart = fields.columns?.length
      ? fields.columns.join(', ')
      : fields.constraintName ?? 'unique constraint';
    super(`Unique constraint violated on ${columnPart}`);
    this.name = 'UniqueConstraintViolationError';
    this.constraintName = fields.constraintName;
    this.columns = fields.columns;
    this.detail = fields.detail;
  }
}

export const uniqueConstraintViolationError = (
  fields: UniqueConstraintViolationFields
) => new UniqueConstraintViolationError(fields);