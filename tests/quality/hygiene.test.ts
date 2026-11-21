import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

/** Every file git tracks, so the checks cover exactly what is published. */
const tracked = execFileSync('git', ['ls-files'], { encoding: 'utf8' })
  .split('\n')
  .filter((path) => path !== '' && !path.endsWith('package-lock.json'));
const text = (path: string): string => readFileSync(path, 'utf8');
const matching = (paths: readonly string[], pattern: RegExp): string[] =>
  paths.filter((path) => pattern.test(text(path)));

const sourceFiles = tracked.filter((path) => /^(src|server)\/.*\.tsx?$/.test(path));
const browserFiles = sourceFiles.filter((path) => path.startsWith('src/'));
const textFiles = tracked.filter((path) => !/\.(png|jpe?g|webp|ico|woff2?)$/.test(path));

describe('Repository hygiene', () => {
  it('publishes no API keys, service-account keys or private keys', () => {
    const secret =
      /AIza[0-9A-Za-z_-]{30,}|AQ\.[0-9A-Za-z_-]{30,}|"private_key"\s*:|-----BEGIN [A-Z ]*PRIVATE KEY-----/;
    expect(matching(textFiles, secret)).toEqual([]);
  });

  it('never commits environment files', () => {
    expect(tracked.filter((path) => /(^|\/)\.env(\.|$)/.test(path))).toEqual(['.env.example']);
  });

  it('never bypasses React escaping or evaluates strings as code', () => {
    const unsafe = /dangerouslySetInnerHTML|\.innerHTML\s*=|\beval\(|new Function\(/;
    expect(matching(sourceFiles, unsafe)).toEqual([]);
  });

  it('keeps the browser console clean', () => {
    expect(matching(browserFiles, /\bconsole\.\w+\(/)).toEqual([]);
  });

  it('leaves no unfinished work markers in source', () => {
    expect(matching(sourceFiles, /\b(TODO|FIXME|XXX)\b/)).toEqual([]);
  });
});
