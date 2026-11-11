export type SavedDevice = {
  Id: string;
  Name: string;
  Alias?: string;
  Enabled: boolean;
};

export type LiveEndpoint = {
  id: string;
  name: string;
  iconPath: string;
};

export type DeviceEntry = SavedDevice & {
  IconPath: string;
  Connected: boolean;
};

export type PreferredDecision = { action: 'none' } | { action: 'set'; id: string };

const sameId = (left: string, right: string): boolean => left.toLowerCase() === right.toLowerCase();

/** Junta a lista salva com os dispositivos ativos. Um marcado que desconectou continua salvo. */
export function mergeDevices(saved: readonly SavedDevice[] | null | undefined, live: readonly LiveEndpoint[]): DeviceEntry[] {
  const savedById = new Map<string, SavedDevice>();
  for (const entry of saved ?? []) {
    if (!entry?.Id) continue;
    savedById.set(entry.Id, entry);
  }

  const merged: DeviceEntry[] = [];
  const liveIds = new Set<string>();

  for (const endpoint of live) {
    liveIds.add(endpoint.id);
    const previous = savedById.get(endpoint.id);
    merged.push({
      Id: endpoint.id,
      Name: endpoint.name,
      Alias: keptAlias(previous?.Alias),
      Enabled: Boolean(previous?.Enabled),
      IconPath: endpoint.iconPath,
      Connected: true,
    });
  }

  for (const entry of savedById.values()) {
    if (!entry.Enabled || liveIds.has(entry.Id)) continue;
    merged.push({
      Id: entry.Id,
      Name: entry.Name,
      Alias: keptAlias(entry.Alias),
      Enabled: true,
      IconPath: '',
      Connected: false,
    });
  }

  return merged;
}

/** O preferido só é preenchido quando ainda está vazio. Um fallback do Windows não apaga a escolha. */
export function fillPreferred(current: string | null | undefined, fallback: string | null | undefined): string {
  if (current) return current;
  return fallback ?? '';
}

export function preferredDeviceAction(input: {
  preferredId: string | null | undefined;
  currentId: string | null | undefined;
  devices: readonly DeviceEntry[];
}): PreferredDecision {
  const preferredId = input.preferredId ?? '';
  if (!preferredId) return { action: 'none' };

  const preferred = input.devices.find((device) => sameId(device.Id, preferredId));
  if (preferred?.Enabled && preferred.Connected) {
    if (!input.currentId || !sameId(input.currentId, preferred.Id)) return { action: 'set', id: preferred.Id };
    return { action: 'none' };
  }

  if (!preferred?.Enabled) return { action: 'none' };

  const fallbackId = nextEnabledConnected(input.devices, preferredId);
  if (!fallbackId || (input.currentId && sameId(input.currentId, fallbackId))) return { action: 'none' };
  return { action: 'set', id: fallbackId };
}

/** Próximo habilitado e conectado depois do âncora, na ordem da lista. */
export function nextEnabledConnected(devices: readonly DeviceEntry[], afterId: string): string | null {
  const enabled = devices.filter((device) => device.Enabled);
  const index = enabled.findIndex((device) => sameId(device.Id, afterId));
  if (index < 0 || enabled.length < 2) return null;

  for (let offset = 1; offset < enabled.length; offset += 1) {
    const candidate = enabled[(index + offset) % enabled.length];
    if (candidate?.Connected) return candidate.Id;
  }

  return null;
}

export function enabledConnected(devices: readonly DeviceEntry[]): DeviceEntry[] {
  return devices.filter((device) => device.Enabled && device.Connected);
}

export function cycleDefaultId(devices: readonly { Id: string }[], currentId: string | null | undefined): string | null {
  if (devices.length === 0) return null;
  const current = devices.findIndex((device) => currentId && sameId(device.Id, currentId));
  return devices[current < 0 ? 0 : (current + 1) % devices.length]?.Id ?? null;
}

export function deviceLabel(device: { Name: string; Alias?: string }): string {
  return keptAlias(device.Alias) ?? device.Name;
}

export function keptAlias(value: string | null | undefined): string | undefined {
  const alias = value?.trim() ?? '';
  return alias.length > 0 ? alias : undefined;
}

export function persistedDevices(devices: readonly DeviceEntry[]): SavedDevice[] {
  return devices.map((device) => {
    const alias = keptAlias(device.Alias);
    return alias ? { Id: device.Id, Name: device.Name, Alias: alias, Enabled: device.Enabled } : { Id: device.Id, Name: device.Name, Enabled: device.Enabled };
  });
}
