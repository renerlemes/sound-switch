import type { ThemeChoice } from '../shared/contracts';
import type { SavedDevice } from './devices';

export type AppConfiguration = {
  Audio: {
    MuteOnLock: boolean;
    ShowNotificationOnDeviceChange: boolean;
    Devices: {
      PlaybackDefault: string;
      PlaybackShortcut: string;
      Playback: SavedDevice[];
      RecordingDefault: string;
      RecordingShortcut: string;
      Recording: SavedDevice[];
    };
  };
  General: {
    AutoStart: boolean;
    Theme: ThemeChoice;
  };
  IntroCompleted: boolean;
};

export function defaultConfiguration(): AppConfiguration {
  return {
    Audio: {
      MuteOnLock: true,
      ShowNotificationOnDeviceChange: true,
      Devices: {
        PlaybackDefault: '',
        PlaybackShortcut: 'Ctrl + F1',
        Playback: [],
        RecordingDefault: '',
        RecordingShortcut: 'Ctrl + F2',
        Recording: [],
      },
    },
    General: {
      AutoStart: true,
      Theme: 'system',
    },
    IntroCompleted: false,
  };
}
