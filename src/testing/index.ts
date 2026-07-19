import { describe, expect, it } from 'vitest';
import { AssertConstraintIsolationOptions } from '../types';

export type {
  AssertConstraintIsolationOptions,
  IsolationCase,
  SeedResult,
} from '../types';

/* Runs each case against the inside-scoped repo, targeting the outside row,
   and asserts that the constraint blocks the cross-scope access. Reads must
   not return the outside row; writes must throw. */
export const assertConstraintIsolation = <TConstraints, TRepo>(
  opts: AssertConstraintIsolationOptions<TConstraints, TRepo>
): void => {
  describe(`constraint isolation: ${opts.name}`, () => {
    for (const c of opts.cases) {
      it(`${c.kind}: ${c.name} cannot reach a row outside its constraints`, async () => {
        const fixture = await opts.seed();
        const repo = opts.factory(fixture.insideConstraints);

        if (c.kind === 'write') {
          await expect(
            c.invoke(repo, {
              inside: fixture.insideId,
              outside: fixture.outsideId,
            })
          ).rejects.toBeDefined();
          return;
        }

        const result = await c.invoke(repo, {
          inside: fixture.insideId,
          outside: fixture.outsideId,
        });
        if (result === null || result === undefined) {
          return;
        }
        if (Array.isArray(result)) {
          for (const row of result as Array<Record<string, unknown>>) {
            expect(row.id).not.toBe(fixture.outsideId);
          }
          return;
        }
        const row = result as Record<string, unknown>;
        expect(row.id).not.toBe(fixture.outsideId);
      });
    }
  });
};
