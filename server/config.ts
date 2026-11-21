import { randomBytes } from 'node:crypto';

/** Default Gemini cascade: fast lite models first, then a stronger flash model. */
export const DEFAULT_GEMINI_MODELS = [
  'gemini-3.5-flash-lite',
  'gemini-3.1-flash-lite',
  'gemini-3.8-flash',
] as const;

export const DEV_ADMIN_PASSCODE = 'civic-admin-2026';
const DEFAULT_PORT = 8080;
const DEFAULT_RATE_LIMIT_PER_MINUTE = 60;
const MIN_SECRET_LENGTH = 32;
const SECRET_BYTES = 32;

/** Public Firebase web config; these values identify the project and are not secrets. */
export interface FirebaseWebConfig {
  readonly apiKey: string;
  readonly authDomain: string;
  readonly projectId: string;
  readonly appId: string;
}

export interface ServerConfig {
  readonly port: number;
  readonly isProduction: boolean;
  readonly adminPasscode: string;
  readonly sessionSecret: string;
  readonly geminiApiKey?: string;
  readonly geminiModels: readonly string[];
  readonly useFirestore: boolean;
  readonly publicOrigin?: string;
  readonly firebase?: FirebaseWebConfig;
  readonly adminEmails: readonly string[];
  /** API requests allowed per client IP per minute. */
  readonly rateLimitPerMinute: number;
}

type Env = Readonly<Record<string, string | undefined>>;

/**
 * Reads a trimmed environment value, treating blank strings as unset.
 *
 * @param env - Environment map.
 * @param key - Variable name.
 * @returns Trimmed value or undefined.
 */
function read(env: Env, key: string): string | undefined {
  const value = env[key]?.trim();
  return value === '' ? undefined : value;
}

/**
 * Refuses to start a production server without a passcode and a strong signing secret.
 *
 * @param adminPasscode - Configured admin passcode, if any.
 * @param sessionSecret - Configured session secret, if any.
 */
function assertProductionSecrets(adminPasscode?: string, sessionSecret?: string): void {
  if (!adminPasscode) throw new Error('ADMIN_PASSCODE must be set in production.');
  if ((sessionSecret?.length ?? 0) < MIN_SECRET_LENGTH) {
    throw new Error(`SESSION_SECRET must be at least ${String(MIN_SECRET_LENGTH)} characters.`);
  }
}

/**
 * Resolves the admin secrets, refusing to start a production server on defaults.
 *
 * @param env - Environment map.
 * @param isProduction - Whether NODE_ENV is production.
 * @returns Admin passcode and session signing secret.
 */
function resolveSecrets(
  env: Env,
  isProduction: boolean,
): Pick<ServerConfig, 'adminPasscode' | 'sessionSecret'> {
  const adminPasscode = read(env, 'ADMIN_PASSCODE');
  const sessionSecret = read(env, 'SESSION_SECRET');
  if (isProduction) assertProductionSecrets(adminPasscode, sessionSecret);
  return {
    adminPasscode: adminPasscode ?? DEV_ADMIN_PASSCODE,
    sessionSecret: sessionSecret ?? randomBytes(SECRET_BYTES).toString('hex'),
  };
}

/**
 * Splits a comma-separated variable into trimmed, non-empty entries.
 *
 * @param env - Environment map.
 * @param key - Variable name.
 * @returns List of entries (empty when unset).
 */
function readList(env: Env, key: string): string[] {
  return (read(env, key) ?? '')
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);
}

/**
 * Reads the Firebase web config; all four values are needed to enable sign-in.
 *
 * @param env - Environment map.
 * @returns Firebase config, or undefined when sign-in is not configured.
 */
function readFirebase(env: Env): FirebaseWebConfig | undefined {
  const apiKey = read(env, 'FIREBASE_API_KEY');
  const authDomain = read(env, 'FIREBASE_AUTH_DOMAIN');
  const projectId = read(env, 'FIREBASE_PROJECT_ID');
  const appId = read(env, 'FIREBASE_APP_ID');
  if (!apiKey || !authDomain || !projectId || !appId) return undefined;
  return { apiKey, authDomain, projectId, appId };
}

/**
 * Builds validated server configuration from environment variables.
 *
 * @param env - Environment map, normally process.env.
 * @returns Validated ServerConfig.
 */
export function loadConfig(env: Env): ServerConfig {
  const isProduction = read(env, 'NODE_ENV') === 'production';
  const geminiApiKey = read(env, 'GEMINI_API_KEY');
  const publicOrigin = read(env, 'PUBLIC_ORIGIN');
  const models = readList(env, 'GEMINI_MODELS');
  const firebase = readFirebase(env);

  return {
    port: Number(read(env, 'PORT') ?? DEFAULT_PORT),
    rateLimitPerMinute: Number(read(env, 'RATE_LIMIT_PER_MINUTE') ?? DEFAULT_RATE_LIMIT_PER_MINUTE),
    isProduction,
    ...resolveSecrets(env, isProduction),
    geminiModels: models.length ? models : DEFAULT_GEMINI_MODELS,
    adminEmails: readList(env, 'ADMIN_EMAILS').map((email) => email.toLowerCase()),
    useFirestore: read(env, 'FIRESTORE_ENABLED') === 'true',
    ...(geminiApiKey ? { geminiApiKey } : {}),
    ...(publicOrigin ? { publicOrigin } : {}),
    ...(firebase ? { firebase } : {}),
  };
}
