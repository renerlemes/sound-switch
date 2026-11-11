/** Major, minor, build e revision. Componente ausente fica -1, como System.Version. */
export function parseVersion(version: string | null | undefined): [number, number, number, number] | null {
  if (!version?.trim()) return null;

  let numeric = version.trim().replace(/^[vV]/, '');
  const metadata = numeric.search(/[+-]/);
  if (metadata >= 0) numeric = numeric.slice(0, metadata);
  if (!/^\d+(\.\d+){0,3}$/.test(numeric)) return null;

  const parts = numeric.split('.').map(Number);
  while (parts.length < 4) parts.push(-1);
  return [parts[0] ?? -1, parts[1] ?? -1, parts[2] ?? -1, parts[3] ?? -1];
}

export function formatVersion(version: string | null | undefined): string {
  const parsed = parseVersion(version);
  if (!parsed) return version?.trim().replace(/^[vV]/, '') ?? '';
  const build = parsed[2] < 0 ? 0 : parsed[2];
  return `${parsed[0]}.${parsed[1]}.${build}`;
}

export function isNewer(candidate: string | null | undefined, current: string | null | undefined): boolean {
  const newer = parseVersion(candidate);
  const installed = parseVersion(current);
  if (!newer || !installed) return false;

  for (let index = 0; index < 4; index += 1) {
    if (newer[index] === installed[index]) continue;
    return newer[index] > installed[index];
  }

  return false;
}
