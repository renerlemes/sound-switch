import { describe, expect, it } from 'vitest';
import { cycleDefaultId, enabledConnected, fillPreferred, mergeDevices, nextEnabledConnected, preferredDeviceAction, type DeviceEntry } from './devices';

const live = [
  { id: 'a', name: 'Alto-falantes', iconPath: 'a.dll,-1' },
  { id: 'b', name: 'Fone', iconPath: 'b.dll,-2' },
];

function entry(partial: Partial<DeviceEntry> & Pick<DeviceEntry, 'Id'>): DeviceEntry {
  return {
    Name: partial.Id,
    Enabled: false,
    IconPath: '',
    Connected: false,
    ...partial,
  };
}

describe('mergeDevices', () => {
  it('marca só o que já estava habilitado e guarda o desconectado marcado', () => {
    const merged = mergeDevices(
      [
        { Id: 'a', Name: 'Antigo', Alias: '  Sala  ', Enabled: true },
        { Id: 'c', Name: 'Fone fora', Enabled: true },
        { Id: 'd', Name: 'Ignorado', Enabled: false },
        { Id: '', Name: 'Vazio', Enabled: true },
      ],
      live,
    );

    expect(merged.map((device) => [device.Id, device.Enabled, device.Connected, device.Name, device.Alias])).toEqual([
      ['a', true, true, 'Alto-falantes', 'Sala'],
      ['b', false, true, 'Fone', undefined],
      ['c', true, false, 'Fone fora', undefined],
    ]);
    expect(merged[0]?.IconPath).toBe('a.dll,-1');
  });
});

describe('preferido', () => {
  const devices = [
    entry({ Id: 'a', Enabled: true, Connected: false }),
    entry({ Id: 'b', Enabled: true, Connected: true }),
    entry({ Id: 'c', Enabled: false, Connected: true }),
  ];

  it('não preenche de novo um preferido já escolhido', () => {
    expect(fillPreferred('a', 'b')).toBe('a');
    expect(fillPreferred('', 'b')).toBe('b');
  });

  it('volta para o preferido conectado sem tratar isso como nova escolha', () => {
    expect(preferredDeviceAction({ preferredId: 'b', currentId: 'a', devices })).toEqual({ action: 'set', id: 'b' });
    expect(preferredDeviceAction({ preferredId: 'b', currentId: 'b', devices })).toEqual({ action: 'none' });
  });

  it('cai no próximo marcado e conectado quando o preferido está fora', () => {
    expect(preferredDeviceAction({ preferredId: 'a', currentId: 'x', devices })).toEqual({ action: 'set', id: 'b' });
    expect(preferredDeviceAction({ preferredId: 'a', currentId: 'b', devices })).toEqual({ action: 'none' });
  });

  it('não troca quando o preferido foi desmarcado', () => {
    expect(preferredDeviceAction({ preferredId: 'c', currentId: 'b', devices })).toEqual({ action: 'none' });
    expect(preferredDeviceAction({ preferredId: '', currentId: 'b', devices })).toEqual({ action: 'none' });
  });
});

describe('alternância', () => {
  const devices = [
    entry({ Id: 'a', Enabled: true, Connected: true }),
    entry({ Id: 'b', Enabled: true, Connected: false }),
    entry({ Id: 'c', Enabled: true, Connected: true }),
  ];

  it('pula o desconectado e volta ao início', () => {
    expect(nextEnabledConnected(devices, 'a')).toBe('c');
    expect(nextEnabledConnected(devices, 'c')).toBe('a');
    expect(nextEnabledConnected(devices, 'ausente')).toBeNull();
  });

  it('alterna só entre os habilitados e conectados', () => {
    const listed = enabledConnected(devices);
    expect(cycleDefaultId(listed, 'a')).toBe('c');
    expect(cycleDefaultId(listed, 'c')).toBe('a');
    expect(cycleDefaultId(listed, 'outro')).toBe('a');
    expect(cycleDefaultId([], 'a')).toBeNull();
  });
});
