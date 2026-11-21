import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('Architecture layer boundaries', () => {
  it('keeps src/domain strictly pure with zero React, server, or Node I/O imports', () => {
    const domainDir = join(process.cwd(), 'src', 'domain');
    const files = readdirSync(domainDir).filter((file) => file.endsWith('.ts'));
    expect(files.length).toBeGreaterThan(0);

    for (const file of files) {
      const content = readFileSync(join(domainDir, file), 'utf8');
      expect(content).not.toMatch(/from ['"]react/);
      expect(content).not.toMatch(/from ['"]node:/);
      expect(content).not.toMatch(/from ['"]\.\.\/\.\.\/server/);
      expect(content).not.toMatch(/\bfetch\(/);
    }
  });
});
