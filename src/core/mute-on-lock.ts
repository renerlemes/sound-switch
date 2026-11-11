/** Dispositivos que este aplicativo silenciou e que devem voltar ao desbloquear. */
export function idsToMute(away: boolean, mutedByApp: ReadonlySet<string>, devices: readonly { id: string; muted: boolean }[]): string[] {
  if (!away) return [];
  return devices.filter((device) => !mutedByApp.has(device.id) && !device.muted).map((device) => device.id);
}

export function idsToRestore(mutedByApp: ReadonlySet<string>): string[] {
  return [...mutedByApp];
}
