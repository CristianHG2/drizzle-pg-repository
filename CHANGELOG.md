# Changelog

All notable changes to this project are documented here. The format is based on
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and the project adheres
to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] — Unreleased

Initial extraction from an internal CRM API into a standalone, portable package.

### Added

- `createBaseRepository(db)` — factory that binds the repository methods to a
  Drizzle Postgres instance via dependency injection, fully typed against the
  instance's schema and relations.
- Constraint-scoped CRUD surface: `find`, `findOrFail`, `findFirst`,
  `findFirstOrFail`, `findMany`, `paginate`, `create`, `createMany`, `update`,
  `delete`, `deleteAll`.
- Typed constraint-violation errors (`ForeignKeyViolationError`,
  `UniqueConstraintViolationError`, `NotNullViolationError`,
  `CheckConstraintViolationError`) plus `RecordNotFoundError`,
  `UnableToCreateRecordError`, `RepositoryIntegrityError`.
- `translatePgError` / `getConstraintIndex` for translating raw Postgres errors
  outside the repository methods.
- `constraintsWhere` and `archivedSql` scoping helpers, and
  `getRelationsForResource`.
- `drizzle-pg-repository/testing` entry point with `assertConstraintIsolation`,
  isolated from the core so `vitest` stays out of production bundles.
- Dual ESM/CJS builds with type declarations.

### Changed from the internal version

- Decoupled from the app's `@/db` singleton — the database is now injected.
- `delete` normalizes the driver result shape, supporting both `rowCount`
  (node-postgres) and `affectedRows` (pglite and others).
- `archivedSql` accepts a configurable column name (default `archivedAt`).
