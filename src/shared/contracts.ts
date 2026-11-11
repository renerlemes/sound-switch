import { z } from 'zod';

export const themeSchema = z.enum(['system', 'light', 'dark']);

export type ThemeChoice = z.infer<typeof themeSchema>;

export const savedDeviceSchema = z.object({
  Id: z.string(),
  Name: z.string(),
  Alias: z.string().optional(),
  Enabled: z.boolean(),
});

export const configurationSchema = z.object({
  Audio: z.object({
    MuteOnLock: z.boolean().optional(),
    ShowNotificationOnDeviceChange: z.boolean().optional(),
    Devices: z
      .object({
        PlaybackDefault: z.string().optional(),
        PlaybackShortcut: z.string().optional(),
        Playback: z.array(savedDeviceSchema).optional(),
        RecordingDefault: z.string().optional(),
        RecordingShortcut: z.string().optional(),
        Recording: z.array(savedDeviceSchema).optional(),
      })
      .optional(),
  }).optional(),
  General: z
    .object({
      AutoStart: z.boolean().optional(),
      Theme: themeSchema.optional(),
    })
    .optional(),
  IntroCompleted: z.boolean().optional(),
});

export const deviceViewSchema = z.object({
  id: z.string(),
  name: z.string(),
  originalName: z.string(),
  enabled: z.boolean(),
  connected: z.boolean(),
  iconUrl: z.string().nullable(),
});

export const appStateSchema = z.object({
  introCompleted: z.boolean(),
  version: z.string(),
  autoStart: z.boolean(),
  theme: themeSchema,
  muteOnLock: z.boolean(),
  showNotification: z.boolean(),
  playbackShortcut: z.string(),
  recordingShortcut: z.string(),
  playback: z.array(deviceViewSchema),
  recording: z.array(deviceViewSchema),
  defaultPlaybackId: z.string().nullable(),
  defaultRecordingId: z.string().nullable(),
  updateVersion: z.string().nullable(),
  updateProgress: z.number().nullable(),
  updateBusy: z.boolean(),
  audioError: z.string().nullable(),
});

export type AppState = z.infer<typeof appStateSchema>;

export const ipcContract = {
  'state.get': z.void(),
  'settings.setAutoStart': z.object({ enabled: z.boolean() }),
  'settings.setTheme': z.object({ theme: themeSchema }),
  'settings.setMuteOnLock': z.object({ enabled: z.boolean() }),
  'settings.setNotifications': z.object({ enabled: z.boolean() }),
  'devices.setEnabled': z.object({ playback: z.boolean(), id: z.string().min(1), enabled: z.boolean() }),
  'devices.setAlias': z.object({ playback: z.boolean(), id: z.string().min(1), alias: z.string() }),
  'devices.setShortcut': z.object({ playback: z.boolean(), shortcut: z.string() }),
  'devices.setDefault': z.object({ playback: z.boolean(), id: z.string().min(1) }),
  'hotkeys.suspend': z.object({ suspended: z.boolean() }),
  'intro.complete': z.void(),
  'update.check': z.void(),
  'update.download': z.void(),
} as const;

export const IPC_CHANNELS = Object.keys(ipcContract) as (keyof typeof ipcContract)[];
export const IPC_EVENTS = ['state'] as const;

export type IpcChannel = keyof typeof ipcContract;
export type IpcResult<T> = { ok: true; data: T } | { ok: false; error: { message: string; code: string } };
