import type { IncomingMessage } from 'node:http';
import { createRemoteJWKSet, jwtVerify, type JWTPayload, type JWTVerifyGetKey } from 'jose';

/** Google's public keys for Firebase Authentication ID tokens. */
const FIREBASE_JWKS_URL =
  'https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com';
const BEARER_PREFIX = 'Bearer ';

/** Who is calling, as proven by a verified Firebase ID token. */
export interface CitizenIdentity {
  readonly uid: string;
  readonly email?: string;
  readonly emailVerified: boolean;
  readonly anonymous: boolean;
}

/** Resolves an ID token to an identity, or undefined when the token is not valid. */
export type IdentityVerifier = (token: string) => Promise<CitizenIdentity | undefined>;

/**
 * Maps verified Firebase claims to the identity the API works with.
 *
 * @param payload - Verified JWT claims.
 * @returns Identity, or undefined when the token has no subject.
 */
function toIdentity(payload: JWTPayload): CitizenIdentity | undefined {
  if (!payload.sub) return undefined;
  const provider = (payload['firebase'] as { sign_in_provider?: unknown } | undefined)
    ?.sign_in_provider;
  const email = payload['email'];
  return {
    uid: payload.sub,
    emailVerified: payload['email_verified'] === true,
    anonymous: provider === 'anonymous',
    ...(typeof email === 'string' ? { email } : {}),
  };
}

/**
 * Creates a verifier for Firebase Authentication ID tokens.
 *
 * Signature (RS256 against Google's rotating keys), issuer, audience and expiry are
 * all checked by jose, so a token minted for another Firebase project is rejected.
 *
 * @param projectId - Firebase project the tokens must be issued for.
 * @param keys - Key resolver; defaults to Google's published JWKS (cached by jose).
 * @returns IdentityVerifier.
 */
export function createFirebaseVerifier(
  projectId: string,
  keys: JWTVerifyGetKey = createRemoteJWKSet(new URL(FIREBASE_JWKS_URL)),
): IdentityVerifier {
  return async (token) => {
    try {
      const { payload } = await jwtVerify(token, keys, {
        issuer: `https://securetoken.google.com/${projectId}`,
        audience: projectId,
        algorithms: ['RS256'],
      });
      return toIdentity(payload);
    } catch {
      return undefined;
    }
  };
}

/**
 * Reads a bearer token from the Authorization header.
 *
 * @param req - Incoming request.
 * @returns Token, or undefined when absent.
 */
export function readBearerToken(req: IncomingMessage): string | undefined {
  const header = req.headers.authorization;
  return header?.startsWith(BEARER_PREFIX) ? header.slice(BEARER_PREFIX.length) : undefined;
}

/**
 * Decides whether a verified identity belongs to an allow-listed administrator.
 *
 * @param identity - Verified identity.
 * @param adminEmails - Lower-cased administrator emails.
 * @returns True only for a verified email on the list.
 */
export function isAdminIdentity(
  identity: CitizenIdentity | undefined,
  adminEmails: readonly string[],
): boolean {
  const email = identity?.emailVerified ? identity.email?.toLowerCase() : undefined;
  return email !== undefined && adminEmails.includes(email);
}
