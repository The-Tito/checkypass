import { beforeAll, describe, expect, it } from 'vitest';
import { applyPwnedCap, strengthScore } from '../../src/core/score.ts';
import { loadStrengthAnalyzer, type StrengthAnalyzer } from '../../src/core/strength.ts';
import { buildTips } from '../../src/core/tips.ts';
import { CALIBRATION } from '../fixtures/calibration.ts';

let analyze: StrengthAnalyzer;

beforeAll(async () => {
  analyze = await loadStrengthAnalyzer();
});

describe('loadStrengthAnalyzer', () => {
  it('reutiliza la misma instancia', async () => {
    expect(await loadStrengthAnalyzer()).toBe(analyze);
  });
});

describe('calibración del puntaje (zxcvbn real)', () => {
  it.each(CALIBRATION)('$password', ({ password, min, max }) => {
    const score = strengthScore(analyze(password).guessesLog10);
    if (min !== undefined) expect(score).toBeGreaterThanOrEqual(min);
    if (max !== undefined) expect(score).toBeLessThanOrEqual(max);
  });

  it('una contraseña "fuerte" pero filtrada queda en 1–2', () => {
    const score = strengthScore(analyze('kX9#mQ2$vL7@pR4!').guessesLog10);
    expect(applyPwnedCap(score, { status: 'found', count: 4 })).toBe(2);
  });
});

describe('detección de patrones', () => {
  it.each([
    ['password', 'common-password'],
    ['P@ssw0rd', 'l33t'],
    ['JuanPerez', 'name'],
    ['cruzazul', 'local-word'],
    ['guadalupe1985', 'date'],
    ['cvbnm,./', 'keyboard'],
    ['abcdefgh', 'sequence'],
    ['aaaaaaaa', 'repeat'],
    ['Mexico.2026', 'predictable-structure'],
  ] as const)('%s → %s', (password, pattern) => {
    expect(analyze(password).patterns.has(pattern)).toBe(true);
  });

  it('marca palabra única', () => {
    expect(analyze('tormenta').singleWord).toBe(true);
    expect(analyze('tormenta-lápiz').singleWord).toBe(false);
  });

  it('cuenta caracteres Unicode, no unidades UTF-16', () => {
    expect(analyze('🔒🔒').length).toBe(2);
  });
});

describe('buildTips', () => {
  it('pone la filtración primero y limita a tres', () => {
    const strength = analyze('Password123!');
    const tips = buildTips(strength, 1, { status: 'found', count: 295389 });
    expect(tips).toHaveLength(3);
    expect(tips[0]?.id).toBe('pwned');
    expect(tips[0]?.text).toContain('295,389');
  });

  it('para una contraseña débil prioriza los patrones detectados', () => {
    const tips = buildTips(analyze('america2024'), 2, { status: 'clean' });
    expect(tips.map((t) => t.id)).toEqual(['local-word', 'date', 'too-short']);
  });

  it('para una contraseña fuerte solo da buenas prácticas, sin criticar las palabras', () => {
    const tips = buildTips(analyze('marmota-lápiz-tormenta-cobre'), 10, { status: 'clean' });
    expect(tips.map((t) => t.id)).toEqual(['no-reuse', 'password-manager', 'two-factor']);
  });

  it('no repite la palabra única si ya es contraseña común', () => {
    const ids = buildTips(analyze('password'), 1, null).map((t) => t.id);
    expect(ids).not.toContain('single-word');
  });
});
