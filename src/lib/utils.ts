import { sql, SQL } from 'drizzle-orm';

/* Scope a list query by archival (soft-delete) state.
 *
 * `mode`:
 *   - `exclude` — only rows where the column IS NULL (the live rows)
 *   - `only`    — only rows where the column IS NOT NULL (the archived rows)
 *   - `include` — no filter (returns `undefined`)
 *
 * `column` is the soft-delete timestamp column name, defaulting to
 * `archivedAt`. The identifier is quoted, so mixed-case column names (the
 * common Drizzle default) are matched exactly. */
export function archivedSql(
  mode: 'exclude' | 'include' | 'only',
  column = 'archivedAt'
): SQL | undefined {
  const identifier = sql.identifier(column);
  if (mode === 'exclude') {
    return sql`${identifier} IS NULL`;
  }
  if (mode === 'only') {
    return sql`${identifier} IS NOT NULL`;
  }
  return undefined;
}
