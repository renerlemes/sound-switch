import { Menu, Tray, screen, nativeImage, type NativeImage } from 'electron';

export type TrayDevice = { id: string; name: string };

export function createTray(icon: NativeImage): Tray {
  const tray = new Tray(icon);
  tray.setToolTip('SoundSwitch');
  return tray;
}

export function showDeviceMenu(
  tray: Tray,
  playback: TrayDevice[],
  recording: TrayDevice[],
  defaultPlaybackId: string | null,
  defaultRecordingId: string | null,
  onSelect: (playback: boolean, id: string) => void,
): void {
  const items: Electron.MenuItemConstructorOptions[] = [];
  appendSection(items, 'Reprodução', playback, defaultPlaybackId, (id) => onSelect(true, id));
  if (playback.length > 0 && recording.length > 0) items.push({ type: 'separator' });
  appendSection(items, 'Gravação', recording, defaultRecordingId, (id) => onSelect(false, id));
  if (items.length === 0) items.push({ label: 'Nenhum dispositivo selecionado', enabled: false });
  tray.popUpContextMenu(Menu.buildFromTemplate(items));
}

export function showOptionsMenu(tray: Tray, version: string, onOpen: () => void, onQuit: () => void): void {
  tray.popUpContextMenu(
    Menu.buildFromTemplate([
      { label: `SoundSwitch (${version})`, enabled: false },
      { label: 'Configurações', click: onOpen },
      { label: 'Sair', click: onQuit },
    ]),
  );
}

export function trayImage(source: NativeImage | null, fallback: NativeImage): NativeImage {
  const image = !source || source.isEmpty() ? fallback : source;
  const slot = traySlot();
  const size = image.getSize();
  if (size.width === slot && size.height === slot) return image;
  return image.resize({ width: slot, height: slot, quality: 'best' });
}

function traySlot(): number {
  const scale = screen.getPrimaryDisplay().scaleFactor || 1;
  return Math.max(16, Math.round(16 * scale));
}

export function bitmapImage(bgra: Buffer, width: number, height: number): NativeImage | null {
  if (width <= 0 || height <= 0 || bgra.length !== width * height * 4) return null;
  const image = nativeImage.createFromBitmap(bgra, { width, height });
  return image.isEmpty() ? null : image;
}

function appendSection(
  items: Electron.MenuItemConstructorOptions[],
  title: string,
  devices: TrayDevice[],
  defaultId: string | null,
  onSelect: (id: string) => void,
): void {
  if (devices.length === 0) return;
  items.push({ label: title, enabled: false });
  for (const device of devices) {
    const id = device.id;
    items.push({
      label: device.name,
      type: 'checkbox',
      checked: defaultId !== null && id.toLowerCase() === defaultId.toLowerCase(),
      click: () => onSelect(id),
    });
  }
}
