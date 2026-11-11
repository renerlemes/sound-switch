import { globalShortcut } from 'electron';
import { toAccelerator } from '../core/shortcuts';

export function bindHotkeys(playback: string, recording: string, onPlayback: () => void, onRecording: () => void): void {
  if (globalShortcut.isSuspended()) globalShortcut.setSuspended(false);
  globalShortcut.unregisterAll();
  const playbackAccelerator = toAccelerator(playback);
  const recordingAccelerator = toAccelerator(recording);
  if (playbackAccelerator) globalShortcut.register(playbackAccelerator, onPlayback);
  if (recordingAccelerator && recordingAccelerator !== playbackAccelerator) globalShortcut.register(recordingAccelerator, onRecording);
}

export function clearHotkeys(): void {
  globalShortcut.unregisterAll();
}
