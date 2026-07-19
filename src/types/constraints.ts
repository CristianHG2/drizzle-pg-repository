export type ForeignKeyEntry = Readonly<{
  columns: string[];
  refTable: string;
  refColumn: string;
  refColumns: string[];
}>;

export type UniqueEntry = Readonly<{
  columns: string[];
}>;

export type ConstraintIndex = Readonly<{
  fkByName: Map<string, ForeignKeyEntry>;
  uniqueByName: Map<string, UniqueEntry>;
}>;

export type SeedResult<TConstraints> = Readonly<{
  insideConstraints: TConstraints;
  outsideConstraints: TConstraints;
  insideId: string;
  outsideId: string;
}>;

export type IsolationCase<TRepo> = Readonly<{
  name: string;
  /* `invoke` is called with the repo (constructed from `insideConstraints`)
     and the pre-seeded ids. Pass `outside` to assertions that should not see
     foreign rows; pass `inside` to assert the in-scope happy path. */
  invoke: (
    repo: TRepo,
    ids: Readonly<{ inside: string; outside: string }>
  ) => Promise<unknown>;
  /* `read` — invoking should not return the outside row (or return null/[]).
     `write` — invoking should throw a not-found / RecordNotFoundError. */
  kind: 'read' | 'write';
}>;

export type AssertConstraintIsolationOptions<TConstraints, TRepo> = Readonly<{
  name: string;
  factory: (constraints: TConstraints) => TRepo;
  /* Seed runs once per `describe`; it must produce two rows, one per
     constraints-scope. The fixture is shared across cases — keep it
     deterministic. */
  seed: () => Promise<SeedResult<TConstraints>>;
  cases: ReadonlyArray<IsolationCase<TRepo>>;
}>;