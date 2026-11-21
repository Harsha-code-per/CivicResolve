import type { Firestore } from '@google-cloud/firestore';

type Data = Record<string, unknown>;

interface FakeRef {
  readonly path: string;
  get(): Promise<FakeSnapshot>;
}

interface FakeSnapshot {
  readonly exists: boolean;
  data(): Data | undefined;
}

/**
 * A tiny in-memory stand-in for the parts of Firestore the store uses:
 * doc get/set, ordered+limited queries, and transactions.
 */
export function createFakeFirestore(options: { failTransactions?: number } = {}) {
  const docs = new Map<string, Data>();
  let failuresLeft = options.failTransactions ?? 0;

  const snapshot = (path: string): FakeSnapshot => ({
    exists: docs.has(path),
    data: () => docs.get(path),
  });

  const ref = (path: string): FakeRef => ({
    path,
    get: () => Promise.resolve(snapshot(path)),
  });

  const collection = (name: string) => ({
    doc: (id: string) => ref(`${name}/${id}`),
    orderBy: (field: string, direction: 'asc' | 'desc') => ({
      limit: (count: number) => ({
        get: () => {
          const rows = [...docs.entries()]
            .filter(([path]) => path.startsWith(`${name}/`))
            .map(([, data]) => data)
            .sort((a, b) => String(a[field]).localeCompare(String(b[field])));
          if (direction === 'desc') rows.reverse();
          return Promise.resolve({
            docs: rows.slice(0, count).map((data) => ({ data: () => data })),
          });
        },
      }),
    }),
  });

  const db = {
    collection,
    async runTransaction<T>(fn: (tx: unknown) => Promise<T>): Promise<T> {
      if (failuresLeft > 0) {
        failuresLeft -= 1;
        throw new Error('transient firestore failure');
      }
      const writes: [string, Data][] = [];
      const tx = {
        get: (target: FakeRef) => target.get(),
        set: (target: FakeRef, data: Data) => {
          writes.push([target.path, data]);
        },
      };
      const result = await fn(tx);
      for (const [path, data] of writes) docs.set(path, data);
      return result;
    },
  };

  return { db: db as unknown as Firestore, docs };
}
