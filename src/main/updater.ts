import { app } from 'electron';
import { autoUpdater, type UpdateInfo } from 'electron-updater';
import { isNewer } from '../core/version';

export type UpdateSnapshot = {
  version: string | null;
  progress: number | null;
  busy: boolean;
};

export function createUpdater(onChange: (snapshot: UpdateSnapshot) => void, onReady: (version: string) => void): {
  snapshot: () => UpdateSnapshot;
  check: () => Promise<void>;
  download: () => Promise<void>;
} {
  const state: UpdateSnapshot = { version: null, progress: null, busy: false };
  const publish = () => onChange({ ...state });

  autoUpdater.autoDownload = false;
  autoUpdater.on('update-available', (info: UpdateInfo) => {
    if (!isNewer(info.version, app.getVersion())) return;
    state.version = info.version;
    state.busy = false;
    publish();
    onReady(info.version);
  });
  autoUpdater.on('update-not-available', () => {
    state.version = null;
    state.busy = false;
    state.progress = null;
    publish();
  });
  autoUpdater.on('download-progress', (progress) => {
    state.progress = Math.max(0, Math.min(100, Math.round(progress.percent)));
    publish();
  });
  autoUpdater.on('update-downloaded', () => {
    state.busy = false;
    state.progress = 100;
    publish();
    autoUpdater.quitAndInstall(false, true);
  });
  autoUpdater.on('error', () => {
    state.busy = false;
    publish();
  });

  return {
    snapshot: () => ({ ...state }),
    async check() {
      state.busy = true;
      state.progress = null;
      publish();
      try {
        await autoUpdater.checkForUpdates();
      } catch {
        state.busy = false;
        publish();
      }
    },
    async download() {
      if (!state.version) return;
      state.busy = true;
      state.progress = 0;
      publish();
      try {
        await autoUpdater.downloadUpdate();
      } catch {
        state.busy = false;
        publish();
      }
    },
  };
}
