import { readFile } from 'node:fs/promises';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { extname, resolve, sep } from 'node:path';

export class HttpError extends Error {
  readonly statusCode: number;

  constructor(statusCode: number, message: string) {
    super(message);
    this.statusCode = statusCode;
  }
}

const MIME_TYPES: Readonly<Record<string, string>> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.json': 'application/json; charset=utf-8',
  '.ico': 'image/x-icon',
};

/**
 * Sends a structured JSON response with proper Content-Type and no-store cache headers for APIs.
 *
 * @param res - Node HTTP ServerResponse.
 * @param statusCode - HTTP status code.
 * @param payload - Serializable JSON body.
 */
export function sendJson(res: ServerResponse, statusCode: number, payload: unknown): void {
  const body = JSON.stringify(payload);
  res.statusCode = statusCode;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(body);
}

/**
 * Reads and parses a JSON request body while enforcing a strict maximum byte ceiling.
 *
 * @param req - Incoming HTTP request.
 * @param maxBytes - Maximum allowed payload size in bytes.
 * @returns Parsed JSON value.
 */
export async function readJsonBody(req: IncomingMessage, maxBytes: number): Promise<unknown> {
  const contentType = req.headers['content-type'] ?? '';
  if (!contentType.toLowerCase().includes('application/json')) {
    throw new HttpError(415, 'Content-Type must be application/json.');
  }

  const chunks: Buffer[] = [];
  let total = 0;

  for await (const chunk of req) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk as string);
    total += buffer.length;
    if (total > maxBytes) {
      throw new HttpError(413, 'Request payload exceeds maximum allowed size.');
    }
    chunks.push(buffer);
  }

  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8')) as unknown;
  } catch {
    throw new HttpError(400, 'Request body is not valid JSON.');
  }
}

/**
 * Resolves the client IP address safely for rate limiting.
 *
 * @param req - Incoming HTTP request.
 * @returns Normalized client IP identifier.
 */
export function getClientIp(req: IncomingMessage): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.trim().length > 0) {
    return forwarded.split(',')[0]?.trim() ?? 'unknown';
  }
  return req.socket.remoteAddress ?? 'unknown';
}

/**
 * Serves built Vite static assets safely with path-traversal protection and SPA fallback.
 *
 * @param staticDir - Absolute path to dist/client.
 * @param pathname - Requested URL pathname.
 * @param res - Node HTTP ServerResponse.
 * @returns True if a file was served.
 */
export async function serveStaticAsset(
  staticDir: string,
  pathname: string,
  res: ServerResponse,
): Promise<boolean> {
  const root = resolve(staticDir);
  const relative = pathname === '/' ? 'index.html' : pathname.replace(/^\/+/, '');
  const candidate = resolve(root, relative);

  if (!candidate.startsWith(`${root}${sep}`) && candidate !== root) {
    return false;
  }

  try {
    const content = await readFile(candidate);
    const ext = extname(candidate);
    res.statusCode = 200;
    res.setHeader('Content-Type', MIME_TYPES[ext] ?? 'application/octet-stream');
    res.setHeader(
      'Cache-Control',
      pathname.startsWith('/assets/') ? 'public, max-age=31536000, immutable' : 'no-cache',
    );
    res.end(content);
    return true;
  } catch {
    if (extname(relative)) return false;
    try {
      const indexHtml = await readFile(resolve(root, 'index.html'));
      res.statusCode = 200;
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.setHeader('Cache-Control', 'no-cache');
      res.end(indexHtml);
      return true;
    } catch {
      return false;
    }
  }
}
