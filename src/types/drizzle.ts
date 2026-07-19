import {
  DBQueryConfigWithComment,
  KnownKeysOnly,
  SqlCommenterInput,
} from 'drizzle-orm';
import {
  PgBuildColumn,
  PgTable,
  PgTableWithColumns,
} from 'drizzle-orm/pg-core';
import {
  PgRelationalQueryHKT,
  PgRelationalQueryHKTBase,
} from 'drizzle-orm/pg-core/query-builders/query';
import {
  BuildQueryResult,
  TableRelationalConfig,
  TablesRelationalConfig,
} from 'drizzle-orm/relations';

export type PgRelationalQueryKind<
  T extends PgRelationalQueryHKTBase,
  TResult
> = (T & {
  result: TResult;
})['_type'];

export type FindFirstNonNullable<
  TSchema extends TablesRelationalConfig,
  TFields extends TableRelationalConfig,
  TBuilderHKT extends PgRelationalQueryHKTBase = PgRelationalQueryHKT
> = <TConfig extends DBQueryConfigWithComment<'one', TSchema, TFields>>(
  config?: KnownKeysOnly<
    TConfig,
    DBQueryConfigWithComment<'one', TSchema, TFields>
  > & {
    comment?: SqlCommenterInput;
  }
) => PgRelationalQueryKind<
  TBuilderHKT,
  BuildQueryResult<TSchema, TFields, TConfig>
>;

export type FindManyPaginate<
  TSchema extends TablesRelationalConfig,
  TFields extends TableRelationalConfig,
  TBuilderHKT extends PgRelationalQueryHKTBase = PgRelationalQueryHKT
> = <TConfig extends DBQueryConfigWithComment<'many', TSchema, TFields>>(
  config?: KnownKeysOnly<
    TConfig,
    DBQueryConfigWithComment<'many', TSchema, TFields>
  > & {
    comment?: SqlCommenterInput;
    page?: number;
    pageSize: number;
  }
) => PgRelationalQueryKind<
  TBuilderHKT,
  BuildQueryResult<TSchema, TFields, TConfig>[]
>;

export type PgTableColumns<TPgTable extends PgTable> =
  TPgTable extends PgTableWithColumns<infer TColumns>
    ? TColumns['columns']
    : never;

export type GetColumnDataType<TColumn> = TColumn extends PgBuildColumn<
  infer _,
  infer _,
  infer T
>
  ? T['data']
  : never;