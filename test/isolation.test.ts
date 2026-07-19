import { createBaseRepository } from '../src';
import { assertConstraintIsolation } from '../src/testing';
import { createTestDb, migrate } from './fixtures/db';
import { contacts, organizations } from './fixtures/schema';

const { db } = createTestDb();
const base = createBaseRepository(db);

type ContactConstraints = { organizationId: string };

const factory = (constraints: ContactConstraints) =>
  base('contacts', contacts, constraints);

assertConstraintIsolation<ContactConstraints, ReturnType<typeof factory>>({
  name: 'contacts scoped by organizationId',
  factory,
  seed: async () => {
    await migrate(db);
    const inside = await base('organizations', organizations).create({
      name: 'inside',
    });
    const outside = await base('organizations', organizations).create({
      name: 'outside',
    });
    const outsideContact = await base('contacts', contacts, {
      organizationId: outside.id,
    }).create({ email: 'outside@b.com', name: 'Outside' });
    const insideContact = await base('contacts', contacts, {
      organizationId: inside.id,
    }).create({ email: 'inside@b.com', name: 'Inside' });

    return {
      insideConstraints: { organizationId: inside.id },
      outsideConstraints: { organizationId: outside.id },
      insideId: insideContact.id,
      outsideId: outsideContact.id,
    };
  },
  cases: [
    {
      name: 'find',
      kind: 'read',
      invoke: (repo, ids) => repo.find(ids.outside),
    },
    {
      name: 'findOrFail',
      kind: 'write',
      invoke: (repo, ids) => repo.findOrFail(ids.outside),
    },
    {
      name: 'update',
      kind: 'write',
      invoke: (repo, ids) => repo.update(ids.outside, { name: 'hijacked' }),
    },
    {
      name: 'delete',
      kind: 'write',
      invoke: (repo, ids) => repo.delete(ids.outside),
    },
  ],
});
