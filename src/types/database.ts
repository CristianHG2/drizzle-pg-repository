import { TablesRelationalConfig } from 'drizzle-orm/relations';

/* The structural shape this package needs from a Drizzle database instance.
 * Any relations-enabled `drizzle(...)` instance satisfies it — the concrete
 * type is inferred at the call site of `createBaseRepository(db)`, so the
 * generated repository methods stay fully typed against your real schema. */
export type RelationalQuery = Readonly<{
  findFirst: (...args: any[]) => any;
  findMany: (...args: any[]) => any;
}>;

export type RelationalDatabase = {
  query: Record<string, RelationalQuery>;
  _: { relations: TablesRelationalConfig };
  select: (...args: any[]) => any;
  insert: (...args: any[]) => any;
  update: (...args: any[]) => any;
  delete: (...args: any[]) => any;
};

/* Names of the relational query builders on a database — i.e. the tables that
 * were registered with `relations`. Used to key `BaseRepositoryMethods`. */
export type RelationName<TDb extends RelationalDatabase> = keyof TDb['query'] &
  string;
