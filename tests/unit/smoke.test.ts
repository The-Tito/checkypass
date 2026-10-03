import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { parseGlobalHeaders } from '../../scripts/headers.ts';

describe('parseGlobalHeaders', () => {
  const headers = parseGlobalHeaders(readFileSync('public/_headers', 'utf8'));

  it('extrae la Content-Security-Policy', () => {
    expect(headers['Content-Security-Policy']).toBeTypeOf('string');
  });

  it('permite conectar solo a HIBP y exige Trusted Types', () => {
    const csp = headers['Content-Security-Policy'] ?? '';
    expect(csp).toContain('connect-src https://api.pwnedpasswords.com;');
    expect(csp).toContain("require-trusted-types-for 'script'");
  });

  it('ignora otros bloques de ruta', () => {
    const parsed = parseGlobalHeaders('/otra\n  X-A: 1\n/*\n  X-B: 2\n');
    expect(parsed).toEqual({ 'X-B': '2' });
  });
});

describe('_headers: caché de assets', () => {
  it('cachea /assets/* de forma inmutable y no el HTML', () => {
    const source = readFileSync('public/_headers', 'utf8');
    expect(source).toMatch(
      /^\/assets\/\*\n {2}Cache-Control: public, max-age=31536000, immutable$/m,
    );
    expect(parseGlobalHeaders(source)['Cache-Control']).toBeUndefined();
  });
});
