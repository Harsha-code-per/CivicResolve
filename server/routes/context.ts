import type { IncomingMessage, ServerResponse } from 'node:http';
import type { ZodType } from 'zod';
import { createIssueSchema, type CreateIssueInput } from '../../src/domain/schemas.js';
import type { CivicIssue } from '../../src/domain/types.js';
import type { AiTriageClient } from '../ai/triage.js';
import type { FirebaseWebConfig } from '../config.js';
import { HTTP_STATUS, HttpError, readJsonBody } from '../lib/http.js';
import { readBearerToken, type CitizenIdentity, type IdentityVerifier } from '../lib/identity.js';
import { hasValidImageMagicBytes } from '../lib/images.js';
import type { IssueStore } from '../store/issues.js';

/** Plain JSON bodies stay small; only complaint submissions may carry a photo. */
export const MAX_JSON_BYTES = 16 * 1024;
const MAX_UPLOAD_BYTES = 1024 * 1024;

export interface RouteDependencies {
  readonly store: IssueStore;
  readonly ai: AiTriageClient;
  readonly adminPasscode: string;
  readonly sessionSecret: string;
  readonly isProduction: boolean;
  readonly now: () => number;
  /** Present when Firebase sign-in is configured; filing a report then requires a token. */
  readonly verifyIdentity?: IdentityVerifier;
  readonly firebase?: FirebaseWebConfig;
  readonly adminEmails?: readonly string[];
}

export interface RouteContext {
  readonly req: IncomingMessage;
  readonly res: ServerResponse;
  readonly deps: RouteDependencies;
  readonly id: string;
}

export interface Route {
  readonly method: 'GET' | 'POST' | 'PATCH';
  readonly pattern: RegExp;
  readonly handle: (ctx: RouteContext) => Promise<void>;
}

/**
 * Reads and validates a JSON body, turning the first schema problem into a 400.
 *
 * @param req - Incoming request.
 * @param schema - Zod schema for the body.
 * @param maxBytes - Body size ceiling.
 * @returns Validated body.
 */
export async function parseBody<T>(
  req: IncomingMessage,
  schema: ZodType<T>,
  maxBytes: number,
): Promise<T> {
  const parsed = schema.safeParse(await readJsonBody(req, maxBytes));
  if (!parsed.success) {
    throw new HttpError(
      HTTP_STATUS.badRequest,
      parsed.error.issues.map((issue) => issue.message).join(' '),
    );
  }
  return parsed.data;
}

/**
 * Reads a complaint and rejects photos whose bytes do not match their declared type.
 *
 * @param req - Incoming request.
 * @returns Validated complaint.
 */
export async function parseComplaint(req: IncomingMessage): Promise<CreateIssueInput> {
  const input = await parseBody(req, createIssueSchema, MAX_UPLOAD_BYTES);
  if (input.imageDataUrl && !hasValidImageMagicBytes(input.imageDataUrl)) {
    throw new HttpError(
      HTTP_STATUS.badRequest,
      'Uploaded image failed binary signature validation.',
    );
  }
  return input;
}

/**
 * Verifies the caller's Firebase ID token, if one was sent.
 *
 * @param ctx - Route context.
 * @returns Verified identity, or undefined.
 */
export async function identify(ctx: RouteContext): Promise<CitizenIdentity | undefined> {
  const token = readBearerToken(ctx.req);
  return token && ctx.deps.verifyIdentity ? ctx.deps.verifyIdentity(token) : undefined;
}

/**
 * Requires a verified identity.
 *
 * @param ctx - Route context.
 * @returns Verified identity.
 */
export async function requireIdentity(ctx: RouteContext): Promise<CitizenIdentity> {
  const identity = await identify(ctx);
  if (!identity) {
    throw new HttpError(HTTP_STATUS.unauthorized, 'Sign in with Google or as a guest first.');
  }
  return identity;
}

/**
 * Throws a 404 when a lookup came back empty.
 *
 * @param issue - Lookup result.
 * @returns The issue.
 */
export function found(issue: CivicIssue | undefined): CivicIssue {
  if (!issue) throw new HttpError(HTTP_STATUS.notFound, 'Civic issue not found.');
  return issue;
}
