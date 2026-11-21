import { describe, expect, it } from 'vitest';
import { triageDeterministic } from '../../src/domain/priority.js';
import { createSeedIssues } from '../../src/domain/seed.js';
import { InvalidTransitionError } from '../../src/domain/workflow.js';
import { createFirestoreIssueStore } from '../../server/store/firestore.js';
import { createMemoryIssueStore, newestFirst, type IssueStore } from '../../server/store/issues.js';
import { createFakeFirestore } from './fake-firestore.js';

const input = {
  title: 'Overflowing garbage bin',
  description: 'Garbage bin overflowing onto the road for three days.',
  location: 'RS Puram',
};
const photo = { ...input, imageDataUrl: 'data:image/png;base64,iVBORw0KGgo=' };
const triage = triageDeterministic(input);
const clock = () => new Date('2026-11-21T06:00:00.000Z');

const stores: [string, () => IssueStore][] = [
  ['memory', () => createMemoryIssueStore({ now: clock })],
  ['firestore', () => createFirestoreIssueStore(createFakeFirestore().db, { now: clock })],
];

describe.each(stores)('%s issue store', (_name, makeStore) => {
  it('starts with the seed records', async () => {
    const store = makeStore();
    const issues = await store.list();
    expect(issues).toHaveLength(createSeedIssues().length);
    expect(await store.getById('CR-2026-1001')).toMatchObject({ id: 'CR-2026-1001' });
    expect(await store.getById('CR-2026-9999')).toBeUndefined();
  });

  it('creates sequential ids and keeps photos out of the issue record', async () => {
    const store = makeStore();
    const first = await store.create(photo, triage);
    const second = await store.create(input, triage);
    expect(first.id).toBe('CR-2026-1005');
    expect(second.id).toBe('CR-2026-1006');
    expect(first).toMatchObject({ hasImage: true, createdAt: '2026-11-21T06:00:00.000Z' });
    expect(first).not.toHaveProperty('imageDataUrl');
    expect(await store.getImage(first.id)).toBe(photo.imageDataUrl);
    expect(await store.getImage(second.id)).toBeUndefined();
    expect((await store.list()).map((issue) => issue.id)).toContain(first.id);
  });

  it("lists a reporter's own issues, newest first, without exposing the uid", async () => {
    const store = makeStore();
    expect(await store.listByReporter('citizen-1')).toEqual([]);
    const first = await store.create(input, triage, 'citizen-1');
    await store.create(input, triage, 'citizen-2');
    await store.create(input, triage);
    const mine = await store.listByReporter('citizen-1');
    expect(mine.map((issue) => issue.id)).toEqual([first.id]);
    expect(first).not.toHaveProperty('reporterUid');
  });

  it('applies admin transitions and rejects invalid ones', async () => {
    const store = makeStore();
    const updated = await store.update('CR-2026-1002', {
      status: 'resolved',
      note: 'Bin cleared.',
      priority: 'low',
      department: 'Public Health & Sanitation Cell',
    });
    expect(updated).toMatchObject({ status: 'resolved', priority: 'low', slaHours: 168 });
    expect(
      await store.update('CR-2026-9999', { status: 'resolved', note: 'Nope' }),
    ).toBeUndefined();
    await expect(
      store.update('CR-2026-1002', { status: 'reported', note: 'Rewind' }),
    ).rejects.toThrow(InvalidTransitionError);
  });
});

describe('firestore specifics', () => {
  it('seeds only once and retries seeding after a transient failure', async () => {
    const fake = createFakeFirestore({ failTransactions: 1 });
    const store = createFirestoreIssueStore(fake.db);
    await expect(store.list()).rejects.toThrow('transient');
    expect(await store.list()).toHaveLength(4);
    const again = createFirestoreIssueStore(fake.db, { seed: [] });
    expect(await again.list()).toHaveLength(4);
  });

  it('works with default options and falls back when the counter is missing', async () => {
    const fake = createFakeFirestore();
    const store = createFirestoreIssueStore(fake.db);
    await store.list();
    fake.docs.delete('meta/sequence');
    const created = await store.create(input, triage);
    expect(created.id).toBe('CR-2026-1001');
  });

  it('defaults the memory store clock and seed', async () => {
    const store = createMemoryIssueStore();
    const created = await store.create(input, triage);
    expect(Date.parse(created.createdAt)).toBeGreaterThan(0);
  });
});

describe('newestFirst and orphaned ownership', () => {
  it('sorts by creation time and skips owner rows whose issue is gone', async () => {
    const issues = createSeedIssues();
    expect(newestFirst(issues).map((issue) => issue.createdAt)).toEqual(
      issues
        .map((issue) => issue.createdAt)
        .sort()
        .reverse(),
    );
    const fake = createFakeFirestore();
    const store = createFirestoreIssueStore(fake.db, { now: clock });
    fake.docs.set('issue_owners/CR-2026-0001', { uid: 'ghost' });
    await store.list();
    expect(await store.listByReporter('ghost')).toEqual([]);
  });
});
