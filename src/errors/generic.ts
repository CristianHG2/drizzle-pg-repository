export class RecordNotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'RecordNotFoundError';
  }
}

export const recordNotFoundError = (message: string) =>
  new RecordNotFoundError(message);

export const recordNotFoundIfNull = <T>(
  value: T | null | undefined,
  message: string
): T => {
  if (value === null || value === undefined) {
    throw new RecordNotFoundError(message);
  }
  return value;
};

export class UnableToCreateRecordError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'UnableToCreateRecordError';
  }
}

export const unableToCreateRecordError = (message: string) =>
  new UnableToCreateRecordError(message);

export class RepositoryIntegrityError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'RepositoryIntegrityError';
  }
}

export const repositoryIntegrityError = (message: string) =>
  new RepositoryIntegrityError(message);