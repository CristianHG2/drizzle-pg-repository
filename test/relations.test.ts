import { describe, expect, it } from 'vitest';
import { getRelationsForResource } from '../src';

describe('getRelationsForResource', () => {
  it('invokes every `*For` factory with the id and strips the suffix', () => {
    const calls: Record<string, string> = {};
    const repository = {
      addressesFor: (id: string) => {
        calls.addresses = id;
        return { scope: 'addresses', id };
      },
      channelsFor: (id: string) => {
        calls.channels = id;
        return { scope: 'channels', id };
      },
    };

    const relations = getRelationsForResource(repository, 'contact-1');

    expect(relations.addresses).toEqual({ scope: 'addresses', id: 'contact-1' });
    expect(relations.channels).toEqual({ scope: 'channels', id: 'contact-1' });
    expect(calls).toEqual({ addresses: 'contact-1', channels: 'contact-1' });
  });

  it('ignores keys that do not end in `For`', () => {
    const repository = {
      addressesFor: (id: string) => ({ id }),
      helper: (id: string) => ({ id }),
    } as Record<`${string}For`, (id: string) => unknown>;

    const relations = getRelationsForResource(repository, 'x') as Record<
      string,
      unknown
    >;
    expect(relations.addresses).toEqual({ id: 'x' });
    expect(relations.helper).toBeUndefined();
  });
});
