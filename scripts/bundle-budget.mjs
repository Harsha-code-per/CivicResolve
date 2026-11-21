import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { gzipSync } from 'node:zlib';

const DIST_ASSETS = join(process.cwd(), 'dist', 'client', 'assets');
const MAX_TOTAL_JS_GZIP_BYTES = 90 * 1024;
const MAX_TOTAL_CSS_GZIP_BYTES = 10 * 1024;

let jsGzip = 0;
let cssGzip = 0;

for (const file of readdirSync(DIST_ASSETS)) {
  const fullPath = join(DIST_ASSETS, file);
  if (!statSync(fullPath).isFile()) continue;
  const gzBytes = gzipSync(readFileSync(fullPath)).byteLength;
  if (file.endsWith('.js')) jsGzip += gzBytes;
  if (file.endsWith('.css')) cssGzip += gzBytes;
}

const fmt = (bytes) => `${(bytes / 1024).toFixed(2)} kB`;
console.log(
  `Bundle gzip budget: JS=${fmt(jsGzip)} / ${fmt(MAX_TOTAL_JS_GZIP_BYTES)}, CSS=${fmt(cssGzip)} / ${fmt(MAX_TOTAL_CSS_GZIP_BYTES)}`,
);

if (jsGzip > MAX_TOTAL_JS_GZIP_BYTES || cssGzip > MAX_TOTAL_CSS_GZIP_BYTES) {
  console.error('Bundle budget exceeded.');
  process.exit(1);
}
