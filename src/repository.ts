import { PgTable } from 'drizzle-orm/pg-core';
import { and, eq, InferSelectModel, SQL } from 'drizzle-orm';
import {
  BaseRepositoryMethods,
  ConstraintsType,
  RelationalDatabase,
  RelationName,
} from './types';
import {
  recordNotFoundError,
  repositoryIntegrityError,
  unableToCreateRecordError,
} from './errors';
import { getConstraintIndex, isPgConstraintError, translatePgError } from './lib';

const unwrapPgError = (err: unknown): unknown => {
  let candidate: unknown = err;
  while (
    candidate !== null &&
    typeof candidate === 'object' &&
    !isPgConstraintError(candidate) &&
    'cause' in candidate &&
    (candidate as { cause?: unknown }).cause !== candidate
  ) {
    candidate = (candidate as { cause?: unknown }).cause;
  }
  return candidate;
};

const runWithPgTranslation = async <T>(
  table: PgTable,
  fn: () => Promise<T>
): Promise<T> => {
  try {
    return await fn();
  } catch (err) {
    const unwrapped = unwrapPgError(err);
    if (isPgConstraintError(unwrapped)) {
      translatePgError(unwrapped, getConstraintIndex(table));
    }
    throw err;
  }
};

/* The `baseRepositoryMethods` factory, bound to a specific Drizzle database
 * instance. The `TDb` type is inferred from the `db` you pass, so the returned
 * methods are fully typed against your schema and relations. */
export type BaseRepositoryFactory<TDb extends RelationalDatabase> = <
  TRelationName extends RelationName<TDb>,
  TTable extends PgTable,
  TConstraints extends ConstraintsType<TTable> | undefined = {}
>(
  tableName: TRelationName,
  table: TTable,
  constraints?: TConstraints
) => BaseRepositoryMethods<TDb, TRelationName, TTable, TConstraints>;

/* Create the `baseRepositoryMethods` factory bound to `db`.
 *
 * Call once at your composition root:
 *
 *   import { db } from './db';
 *   export const baseRepositoryMethods = createBaseRepository(db);
 *
 * Every table passed to the returned factory must expose a string `id`
 * primary-key column and must be registered in the database's `relations`
 * (so it appears under `db.query`). */
export function createBaseRepository<TDb extends RelationalDatabase>(
  db: TDb
): BaseRepositoryFactory<TDb> {
  return <
    TRelationName extends RelationName<TDb>,
    TTable extends PgTable,
    TConstraints extends ConstraintsType<TTable> | undefined = {}
  >(
    tableName: TRelationName,
    table: TTable,
    constraints?: TConstraints
  ): BaseRepositoryMethods<TDb, TRelationName, TTable, TConstraints> => {
    const constraintSql: SQL[] = Object.entries(constraints ?? {}).map(
      ([key, value]) => eq((table as any)[key], value)
    );

    return {
      constraints: {
        sql: constraintSql,
        values: constraints as ConstraintsType<TTable>,
      },

      find: async (id: string) => {
        const result = await db.query[tableName].findMany({
          where: {
            id,
            ...(constraints ?? {}),
          },
        } as any);

        if (result.length === 0) {
          return null;
        }

        if (result.length > 1) {
          throw repositoryIntegrityError(
            `More than one record found when getting for ${id}`
          );
        }

        return result[0] as any;
      },

      findOrFail: async (id: string) => {
        const result = await db.query[tableName].findFirst({
          where: {
            id,
            ...(constraints ?? {}),
          },
        } as any);

        if (!result) {
          throw recordNotFoundError(
            `${String(tableName).slice(0, -1)} with id ${id} not found`
          );
        }

        return result as InferSelectModel<TTable>;
      },

      findFirst: ((options?: any) => {
        const modifiedArgs = options ?? { where: {} };

        if (constraints) {
          modifiedArgs.where = {
            ...(modifiedArgs.where ?? {}),
            ...constraints,
          };
        }

        return db.query[tableName].findFirst(modifiedArgs as any) as any;
      }) as any,

      findFirstOrFail: ((options?: any) => {
        const modifiedArgs = options ?? { where: {} };

        if (constraints) {
          modifiedArgs.where = {
            ...(modifiedArgs.where ?? {}),
            ...constraints,
          };
        }

        return (
          db.query[tableName].findFirst(modifiedArgs as any) as Promise<any>
        ).then((record) => {
          if (record === null || typeof record === 'undefined') {
            throw recordNotFoundError(
              `${String(tableName).slice(0, -1)} with options ${JSON.stringify(
                options
              )} not found`
            );
          }

          return record;
        });
      }) as any,

      findMany: ((options?: any) => {
        const modifiedArgs = options ?? { where: {} };

        if (constraints) {
          modifiedArgs.where = {
            ...(modifiedArgs.where ?? {}),
            ...constraints,
          };
        }

        return db.query[tableName].findMany(modifiedArgs as any) as any;
      }) as any,

      paginate: (options: {
        page?: number;
        perPage: number;
        sql?: SQL;
        orderBy?: SQL[];
      }) => {
        const page = Math.max(options.page ?? 1, 1);
        let q = db
          .select()
          .from(table as any)
          .where(and(options.sql, ...constraintSql))
          .$dynamic();
        if (options.orderBy !== undefined && options.orderBy.length > 0) {
          q = q.orderBy(...options.orderBy);
        }
        return q
          .limit(options.perPage)
          .offset((page - 1) * options.perPage) as any;
      },

      create: (data: any) =>
        runWithPgTranslation(table, () =>
          db
            .insert(table)
            .values({
              ...data,
              ...constraints,
            } as any)
            .returning()
            .then((_res: unknown) => {
              const res = _res as Array<any>;

              if (!res[0]) {
                throw unableToCreateRecordError(
                  `Unable to create record in ${String(tableName)}`
                );
              }

              return res[0] as any;
            })
        ),

      createMany: (data: any[]) =>
        runWithPgTranslation(table, () =>
          db
            .insert(table)
            .values(
              data.map((item) => ({
                ...item,
                ...constraints,
              })) as any
            )
            .returning()
            .then((_res: unknown) => {
              const res = _res as Array<any>;

              if (res.length === 0) {
                throw unableToCreateRecordError(
                  `Unable to create records in ${String(tableName)}`
                );
              }

              return res as any;
            })
        ),

      deleteAll: async () => {
        const where =
          constraintSql.length > 0 ? and(...constraintSql) : undefined;

        if (where) {
          await db.delete(table).where(where);
        } else {
          await db.delete(table);
        }
      },

      delete: async (id: string) => {
        const sqlWhere = and(eq((table as any).id, id), ...constraintSql);

        const res = (await runWithPgTranslation(table, () =>
          db.delete(table).where(sqlWhere)
        )) as { rowCount?: number | null; affectedRows?: number | null };

        /* node-postgres reports `rowCount`; other pg drivers (e.g. pglite)
         * report `affectedRows`. Accept whichever the driver provides. */
        const affected = res.rowCount ?? res.affectedRows ?? null;

        if (affected === null) {
          throw new Error(`CRITICAL: Row count not set after executing query`);
        }

        if (affected === 0) {
          throw recordNotFoundError(
            `Unable to find ${String(tableName)} with id ${id} to delete`
          );
        }

        if (affected > 1) {
          throw repositoryIntegrityError(
            `CRITICAL: Multiple records deleted when trying to delete ${String(
              tableName
            )} with id ${id}`
          );
        }

        return { id };
      },

      update: async (id: string, data: any) => {
        const sqlWhere = and(eq((table as any).id, id), ...constraintSql);

        const res = (await runWithPgTranslation(table, () =>
          db
            .update(table)
            .set({
              ...data,
              ...constraints,
            })
            .where(sqlWhere)
            .returning()
        )) as unknown as Array<any>;

        if (!res || res.length === 0) {
          throw recordNotFoundError(
            `Unable to update ${String(tableName)} with id ${id}`
          );
        }

        if (res.length > 1) {
          throw repositoryIntegrityError(
            `Multiple records updated when trying to update ${String(
              tableName
            )} with id ${id}`
          );
        }

        return res[0] as any;
      },
    };
  };
}
