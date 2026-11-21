import type { DocumentReference, Firestore } from '@google-cloud/firestore';
import { createSeedIssues } from '../../src/domain/seed.js';
import type { CivicIssue } from '../../src/domain/types.js';
import {
  applyAdminTransition,
  buildIssueRecord,
  formatIssueId,
} from '../../src/domain/workflow.js';
import {
  newestFirst,
  SEQUENCE_START,
  toTransition,
  type IssueStore,
  type StoreOptions,
} from './issues.js';

const ISSUES = 'issues';
const IMAGES = 'issue_images';
const OWNERS = 'issue_owners';
/** A citizen's own history is short; this caps one "My reports" read. */
const MINE_LIMIT = 50;
const META = 'meta';
const SEQUENCE_DOC = 'sequence';
/** The dashboard shows the most recent complaints; older ones stay queryable by id. */
const LIST_LIMIT = 200;

interface SequenceDoc {
  readonly value: number;
}

interface ImageDoc {
  readonly dataUrl: string;
}

interface OwnerDoc {
  readonly uid: string;
}

const sequenceRefIn = (db: Firestore): DocumentReference<SequenceDoc> =>
  db.collection(META).doc(SEQUENCE_DOC) as DocumentReference<SequenceDoc>;

const issueRefIn = (db: Firestore, id: string): DocumentReference<CivicIssue> =>
  db.collection(ISSUES).doc(id) as DocumentReference<CivicIssue>;

/**
 * Returns a function that writes the demo records once, the first time the database
 * is used. Concurrent callers share one transaction; a failure lets the next call retry.
 *
 * @param db - Firestore client.
 * @param seed - Demo records to write into an empty database.
 * @returns Idempotent "make sure the database is seeded" function.
 */
function createSeeder(db: Firestore, seed: readonly CivicIssue[]): () => Promise<void> {
  const sequenceRef = sequenceRefIn(db);
  let seeded: Promise<void> | undefined;
  return () => {
    seeded ??= db
      .runTransaction(async (tx) => {
        if ((await tx.get(sequenceRef)).exists) return;
        for (const issue of seed) tx.set(issueRefIn(db, issue.id), issue);
        tx.set(sequenceRef, { value: SEQUENCE_START + seed.length });
      })
      .catch((error: unknown) => {
        seeded = undefined;
        throw error;
      });
    return seeded;
  };
}

/**
 * Creates an IssueStore backed by Google Cloud Firestore.
 *
 * Photos live in their own collection so listing the dashboard never downloads them.
 * Reference numbers come from a transactional counter, so two citizens submitting at
 * the same moment can never receive the same id. Demo records are written once, the
 * first time the database is used.
 *
 * @param db - Firestore client (Application Default Credentials on Cloud Run).
 * @param options - Optional seed records and clock.
 * @returns IssueStore persisted in Firestore.
 */
export function createFirestoreIssueStore(db: Firestore, options: StoreOptions = {}): IssueStore {
  const issues = db.collection(ISSUES);
  const images = db.collection(IMAGES);
  const owners = db.collection(OWNERS);
  const sequenceRef = sequenceRefIn(db);
  const now = options.now ?? (() => new Date());
  const seed = options.seed ?? createSeedIssues();
  const issueRef = (id: string): DocumentReference<CivicIssue> => issueRefIn(db, id);

  const ensureSeeded = createSeeder(db, seed);

  return {
    async list() {
      await ensureSeeded();
      const snapshot = await issues.orderBy('createdAt', 'desc').limit(LIST_LIMIT).get();
      return snapshot.docs.map((doc) => doc.data() as CivicIssue);
    },

    async getById(id) {
      await ensureSeeded();
      return (await issueRef(id).get()).data();
    },

    async getImage(id) {
      const snapshot = await images.doc(id).get();
      return (snapshot.data() as ImageDoc | undefined)?.dataUrl;
    },

    async listByReporter(uid) {
      const owned = await owners.where('uid', '==', uid).limit(MINE_LIMIT).get();
      if (owned.empty) return [];
      const snapshots = await db.getAll(...owned.docs.map((doc) => issueRef(doc.id)));
      return newestFirst(
        snapshots.flatMap((doc) => (doc.exists ? [doc.data() as CivicIssue] : [])),
      );
    },

    async create(input, triage, reporterUid) {
      await ensureSeeded();
      return db.runTransaction(async (tx) => {
        const current = (await tx.get(sequenceRef)).data()?.value ?? SEQUENCE_START;
        const sequence = current + 1;
        const nowIso = now().toISOString();
        const issue = buildIssueRecord({ id: formatIssueId(sequence), input, triage, nowIso });
        tx.set(sequenceRef, { value: sequence });
        tx.set(issueRef(issue.id), issue);
        if (input.imageDataUrl) tx.set(images.doc(issue.id), { dataUrl: input.imageDataUrl });
        if (reporterUid) tx.set(owners.doc(issue.id), { uid: reporterUid } satisfies OwnerDoc);
        return issue;
      });
    },

    async update(id, input) {
      await ensureSeeded();
      return db.runTransaction(async (tx) => {
        const current = (await tx.get(issueRef(id))).data();
        if (!current) return undefined;
        const updated = applyAdminTransition(current, toTransition(input, now().toISOString()));
        tx.set(issueRef(id), updated);
        return updated;
      });
    },
  };
}
