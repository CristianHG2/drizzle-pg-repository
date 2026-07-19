import { RelationsForResource } from '../types';

export function getRelationsForResource<
  T extends Record<`${string}For`, (id: string) => any>
>(repository: T, id: string): RelationsForResource<T> {
  const relationRepos = {} as RelationsForResource<T>;

  for (const key in repository) {
    if (key.endsWith('For') && typeof repository[key] === 'function') {
      const relationName = key.slice(0, -3); /* Remove 'For' suffix */
      relationRepos[relationName as keyof RelationsForResource<T>] =
        repository[key](id);
    }
  }

  return relationRepos;
}
