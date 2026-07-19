import { InferInsertModel } from 'drizzle-orm';
import { PgTable } from 'drizzle-orm/pg-core';

export type EntityApi<TTable extends PgTable> = {
  update: (updates: Partial<InferInsertModel<TTable>>) => Promise<void>;
  delete: () => Promise<void>;
};