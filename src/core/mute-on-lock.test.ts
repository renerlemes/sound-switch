import { describe, expect, it } from 'vitest';
import { idsToMute, idsToRestore } from './mute-on-lock';

describe('mudo ao bloquear', () => {
  const devices = [
    { id: 'a', muted: false },
    { id: 'b', muted: true },
    { id: 'c', muted: false },
  ];

  it('silencia só quem está com som e ainda não foi silenciado por este aplicativo', () => {
    const already = new Set(['c']);
    expect(idsToMute(true, already, devices)).toEqual(['a']);
    expect(idsToMute(false, already, devices)).toEqual([]);
  });

  it('restaura apenas o que este aplicativo silenciou', () => {
    expect(idsToRestore(new Set(['a', 'c']))).toEqual(['a', 'c']);
  });
});
