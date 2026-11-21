import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { gzipSync } from 'node:zlib';

const DIST = join(process.cwd(), 'dist', 'client');
const ASSETS = join(DIST, 'assets');
const KB = 1024;
/** JavaScript the first page load downloads (entry + preloaded chunks). */
const MAX_INITIAL_JS = 95 * KB;
/** All JavaScript, including Firebase Auth, which only loads when sign-in is configured. */
const MAX_TOTAL_JS = 150 * KB;
const MAX_CSS = 12 * KB;

const html = readFileSync(join(DIST, 'index.html'), 'utf8');
const totals = { initialJs: 0, totalJs: 0, css: 0 };

// Directory entries carry their type, so files are read once with no separate stat (no check-then-use race).
for (const entry of readdirSync(ASSETS, { withFileTypes: true })) {
  if (!entry.isFile()) continue;
  const file = entry.name;
  const gz = gzipSync(readFileSync(join(ASSETS, file))).byteLength;
  if (file.endsWith('.css')) totals.css += gz;
  if (!file.endsWith('.js')) continue;
  totals.totalJs += gz;
  if (html.includes(`/assets/${file}`)) totals.initialJs += gz;
}

const fmt = (bytes) => `${(bytes / KB).toFixed(2)} kB`;
console.log(
  `Bundle gzip budget: initial JS=${fmt(totals.initialJs)} / ${fmt(MAX_INITIAL_JS)}, ` +
    `all JS=${fmt(totals.totalJs)} / ${fmt(MAX_TOTAL_JS)}, CSS=${fmt(totals.css)} / ${fmt(MAX_CSS)}`,
);

if (totals.initialJs > MAX_INITIAL_JS || totals.totalJs > MAX_TOTAL_JS || totals.css > MAX_CSS) {
  console.error('Bundle budget exceeded.');
  process.exit(1);
}
