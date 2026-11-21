import type { IncomingMessage } from 'node:http';
import { createLocalJWKSet, exportJWK, generateKeyPair, SignJWT, type JWTPayload } from 'jose';
import { beforeAll, describe, expect, it } from 'vitest';
import {
  createFirebaseVerifier,
  isAdminIdentity,
  readBearerToken,
  type IdentityVerifier,
} from '../../server/lib/identity.js';

const PROJECT = 'demo-project';
let sign: (claims: JWTPayload, audience?: string) => Promise<string>;
let verify: IdentityVerifier;

beforeAll(async () => {
  const { publicKey, privateKey } = await generateKeyPair('RS256');
  const jwk = { ...(await exportJWK(publicKey)), kid: 'k1', alg: 'RS256' };
  verify = createFirebaseVerifier(PROJECT, createLocalJWKSet({ keys: [jwk] }));
  sign = (claims, audience = PROJECT) =>
    new SignJWT(claims)
      .setProtectedHeader({ alg: 'RS256', kid: 'k1' })
      .setIssuer(`https://securetoken.google.com/${PROJECT}`)
      .setAudience(audience)
      .setIssuedAt()
      .setExpirationTime('1h')
      .sign(privateKey);
});

describe('createFirebaseVerifier', () => {
  it('accepts a Google sign-in token and maps its claims', async () => {
    const token = await sign({
      sub: 'uid-1',
      email: 'Admin@City.gov',
      email_verified: true,
      firebase: { sign_in_provider: 'google.com' },
    });
    expect(await verify(token)).toEqual({
      uid: 'uid-1',
      email: 'Admin@City.gov',
      emailVerified: true,
      anonymous: false,
    });
  });

  it('recognises anonymous guests', async () => {
    const token = await sign({ sub: 'guest', firebase: { sign_in_provider: 'anonymous' } });
    expect(await verify(token)).toEqual({ uid: 'guest', emailVerified: false, anonymous: true });
  });

  it('rejects tokens for another project, without a subject, or malformed', async () => {
    expect(await verify(await sign({ sub: 'x' }, 'other-project'))).toBeUndefined();
    expect(await verify(await sign({}))).toBeUndefined();
    expect(await verify('not-a-jwt')).toBeUndefined();
  });

  it('builds a remote key set by default', () => {
    expect(typeof createFirebaseVerifier(PROJECT)).toBe('function');
  });
});

describe('identity helpers', () => {
  const req = (authorization?: string): IncomingMessage =>
    Object.assign(Object.create(null) as IncomingMessage, {
      headers: authorization ? { authorization } : {},
    });

  it('reads bearer tokens only', () => {
    expect(readBearerToken(req('Bearer abc'))).toBe('abc');
    expect(readBearerToken(req('Basic abc'))).toBeUndefined();
    expect(readBearerToken(req())).toBeUndefined();
  });

  it('only treats verified, allow-listed emails as admins', () => {
    const admins = ['admin@city.gov'];
    const base = { uid: 'u', anonymous: false };
    expect(isAdminIdentity({ ...base, email: 'ADMIN@city.gov', emailVerified: true }, admins)).toBe(
      true,
    );
    expect(
      isAdminIdentity({ ...base, email: 'admin@city.gov', emailVerified: false }, admins),
    ).toBe(false);
    expect(isAdminIdentity({ ...base, emailVerified: true }, admins)).toBe(false);
    expect(isAdminIdentity(undefined, admins)).toBe(false);
  });
});
