import { describe, expect, it } from 'vitest';
import { formatVersion, isNewer } from './version';

describe('versão', () => {
  it('formata major.minor.build e ignora o prefixo v', () => {
    expect(formatVersion('v1.2.3')).toBe('1.2.3');
    expect(formatVersion('1.2')).toBe('1.2.0');
    expect(formatVersion('1.2.3-beta+9')).toBe('1.2.3');
  });

  it('reconhece uma versão mais nova', () => {
    expect(isNewer('v1.0.11', '1.0.10')).toBe(true);
    expect(isNewer('1.0.10', '1.0.10')).toBe(false);
    expect(isNewer('1.0.9', '1.0.10')).toBe(false);
    expect(isNewer('nota', '1.0.10')).toBe(false);
  });
});
