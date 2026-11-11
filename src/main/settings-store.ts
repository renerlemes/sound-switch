import { app } from 'electron';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { defaultConfiguration, type AppConfiguration } from '../core/configuration';
import type { SavedDevice } from '../core/devices';
import { configurationSchema } from '../shared/contracts';

export function settingsPath(): string {
  return path.join(app.getPath('appData'), 'SoundSwitch', 'SoundSwitch.json');
}

function legacyPath(): string {
  return path.join(app.getPath('appData'), 'Windows Configurations', 'Windows.Configurations.json');
}

export function loadSettings(): AppConfiguration {
  return readConfiguration(settingsPath()) ?? readConfiguration(legacyPath()) ?? defaultConfiguration();
}

export function saveSettings(settings: AppConfiguration): void {
  const file = settingsPath();
  mkdirSync(path.dirname(file), { recursive: true });
  writeFileSync(file, `${JSON.stringify(settings, null, 2)}\n`, 'utf8');
}

function readConfiguration(file: string): AppConfiguration | null {
  try {
    return normalize(JSON.parse(readFileSync(file, 'utf8')));
  } catch {
    return null;
  }
}

function normalize(raw: unknown): AppConfiguration | null {
  const parsed = configurationSchema.safeParse(raw);
  if (!parsed.success) return null;
  const base = defaultConfiguration();
  const audio = parsed.data.Audio;
  const devices = audio?.Devices;
  return {
    Audio: {
      MuteOnLock: audio?.MuteOnLock ?? base.Audio.MuteOnLock,
      ShowNotificationOnDeviceChange: audio?.ShowNotificationOnDeviceChange ?? base.Audio.ShowNotificationOnDeviceChange,
      Devices: {
        PlaybackDefault: devices?.PlaybackDefault ?? '',
        PlaybackShortcut: devices?.PlaybackShortcut ?? base.Audio.Devices.PlaybackShortcut,
        Playback: clean(devices?.Playback),
        RecordingDefault: devices?.RecordingDefault ?? '',
        RecordingShortcut: devices?.RecordingShortcut ?? base.Audio.Devices.RecordingShortcut,
        Recording: clean(devices?.Recording),
      },
    },
    General: {
      AutoStart: parsed.data.General?.AutoStart ?? base.General.AutoStart,
      Theme: parsed.data.General?.Theme ?? base.General.Theme,
    },
    IntroCompleted: parsed.data.IntroCompleted ?? false,
  };
}

function clean(devices: SavedDevice[] | undefined): SavedDevice[] {
  return (devices ?? []).filter((device) => device.Id.length > 0);
}
