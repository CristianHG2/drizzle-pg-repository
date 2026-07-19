import {
  PgAsyncRelationalQueryHKT,
  PgInsertValue,
  PgTable,
  PgUpdateSetSource,
} from 'drizzle-orm/pg-core';
import {
  FindFirstNonNullable,
  GetColumnDataType,
  PgTableColumns,
} from './drizzle';
import { InferSelectModel, SQL } from 'drizzle-orm';
import { RelationalDatabase, RelationName } from './database';

export type ConstraintsType<TPgTable extends PgTable> = {
  [K in keyof PgTableColumns<TPgTable>]?: GetColumnDataType<
    PgTableColumns<TPgTable>[K]
  >;
};

export type Scope<TConstraints> = Readonly<{
  constraints: TConstraints | undefined;
}>;

type PinnedKeys<T> = {
  [K in keyof T]-?: undefined extends T[K] ? never : K;
}[keyof T];

export type BaseRepositoryMethods<
  TDb extends RelationalDatabase,
  TRelationName extends RelationName<TDb>,
  TTable extends PgTable,
  TConstraints extends ConstraintsType<TTable> | undefined = {}
> = {
  constraints: {
    values: ConstraintsType<TTable>;
    sql: SQL[];
  };
  findOrFail: (id: string) => Promise<InferSelectModel<TTable>>;
  find: (id: string) => Promise<InferSelectModel<TTable> | null>;
  findMany: TDb['query'][TRelationName]['findMany'];
  findFirst: TDb['query'][TRelationName]['findFirst'];
  findFirstOrFail: FindFirstNonNullable<
    TDb['_']['relations'],
    TDb['_']['relations'][TRelationName],
    PgAsyncRelationalQueryHKT
  >;
  paginate: (options: {
    page?: number;
    perPage: number;
    sql?: SQL;
    orderBy?: SQL[];
  }) => Promise<InferSelectModel<TTable>[]>;
  create: (
    data: Omit<PgInsertValue<TTable>, PinnedKeys<TConstraints>>
  ) => Promise<InferSelectModel<TTable>>;
  createMany: (
    data: Omit<PgInsertValue<TTable>, PinnedKeys<TConstraints>>[]
  ) => Promise<InferSelectModel<TTable>[]>;
  delete: (id: string) => Promise<{ id: string }>;
  deleteAll: () => Promise<void>;
  update: (
    id: string,
    data: PgUpdateSetSource<TTable>
  ) => Promise<InferSelectModel<TTable>>;
};
