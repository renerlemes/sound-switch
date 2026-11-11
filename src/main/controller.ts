import { app, nativeTheme, Notification, nativeImage, type NativeImage } from 'electron';
import { cycleDefaultId, enabledConnected, fillPreferred, mergeDevices, persistedDevices, preferredDeviceAction, type DeviceEntry, type LiveEndpoint } from '../core/devices';
import { idsToMute, idsToRestore } from '../core/mute-on-lock';
import { shortcutFromInput } from '../core/shortcuts';
import { formatVersion } from '../core/version';
import type { AppState, ThemeChoice } from '../shared/contracts';
import { AudioClient, type ListResult, type LiveDevice } from './audio-client';
import { bindHotkeys, clearHotkeys } from './hotkeys';
import { loadSettings, saveSettings } from './settings-store';
import { bitmapImage, createTray, showDeviceMenu, showOptionsMenu, trayImage, type TrayDevice } from './tray';
import { createUpdater, type UpdateSnapshot } from './updater';
import type { AppConfiguration } from '../core/configuration';
import type { Tray } from 'electron';

const leaving = new Set(['lock', 'consoleDisconnect', 'remoteDisconnect']);
const returning = new Set(['unlock', 'consoleConnect', 'remoteConnect']);

export class AppController {
  private readonly settings: AppConfiguration;
  private readonly audio = new AudioClient();
  private readonly icons = new Map<string, string>();
  private readonly bitmaps = new Map<string, NativeImage>();
  private readonly trayBitmaps = new Map<string, NativeImage>();
  private readonly updater;
  private playback: DeviceEntry[] = [];
  private recording: DeviceEntry[] = [];
  private defaultPlaybackId: string | null = null;
  private defaultRecordingId: string | null = null;
  private audioError: string | null = null;
  private update: UpdateSnapshot = { version: null, progress: null, busy: false };
  private away = false;
  private readonly mutedByApp = new Set<string>();
  private hotkeysSuspended = false;
  private lastPlaybackHotkey = 0;
  private lastRecordingHotkey = 0;
  private refreshTimer: NodeJS.Timeout | null = null;
  private tray: Tray | null = null;
  private fallbackIcon: NativeImage = nativeImage.createEmpty();
  private quitting = false;
  private chain: Promise<unknown> = Promise.resolve();

  constructor(private readonly broadcast: (state: AppState) => void, private readonly showWindow: () => void) {
    this.settings = loadSettings();
    nativeTheme.themeSource = this.settings.General.Theme;
    this.updater = createUpdater(
      (snapshot) => {
        this.update = snapshot;
        this.publish();
      },
      (version) => {
        this.notify('SoundSwitch', `Atualização para SoundSwitch (${formatVersion(version)}) está disponível`, () => this.showWindow());
      },
    );
    this.audio.onDevicesChanged = () => this.scheduleRefresh();
    this.audio.onSession = (reason) => this.onSession(reason);
  }

  attach(tray: Tray, fallbackIcon: NativeImage): void {
    this.tray = tray;
    this.fallbackIcon = fallbackIcon;
    this.bindTray();
    this.applyLogin(this.settings.General.AutoStart);
    this.applyHotkeys();
    void this.audio.removeLegacy().catch(() => undefined);
    void this.run(() => this.refresh());
    void this.updater.check();
  }

  state(): AppState {
    return {
      introCompleted: this.settings.IntroCompleted,
      version: formatVersion(app.getVersion()),
      autoStart: this.settings.General.AutoStart,
      theme: this.settings.General.Theme,
      muteOnLock: this.settings.Audio.MuteOnLock,
      showNotification: this.settings.Audio.ShowNotificationOnDeviceChange,
      playbackShortcut: this.settings.Audio.Devices.PlaybackShortcut,
      recordingShortcut: this.settings.Audio.Devices.RecordingShortcut,
      playback: this.views(this.playback),
      recording: this.views(this.recording),
      defaultPlaybackId: this.defaultPlaybackId,
      defaultRecordingId: this.defaultRecordingId,
      updateVersion: this.update.version === null ? null : formatVersion(this.update.version),
      updateProgress: this.update.progress,
      updateBusy: this.update.busy,
      audioError: this.audioError,
    };
  }

  setTheme(theme: ThemeChoice): void {
    nativeTheme.themeSource = theme;
    this.settings.General.Theme = theme;
    this.persist();
  }

  setAutoStart(enabled: boolean): void {
    this.applyLogin(enabled);
    this.settings.General.AutoStart = enabled;
    this.persist();
  }

  setMuteOnLock(enabled: boolean): void {
    this.settings.Audio.MuteOnLock = enabled;
    this.persist();
    if (!enabled && this.away) void this.restore();
  }

  setNotifications(enabled: boolean): void {
    this.settings.Audio.ShowNotificationOnDeviceChange = enabled;
    this.persist();
  }

  setEnabled(playback: boolean, id: string, enabled: boolean): void {
    const same = (deviceId: string) => deviceId.toLowerCase() === id.toLowerCase();
    const devices = playback ? this.settings.Audio.Devices.Playback : this.settings.Audio.Devices.Recording;
    const current = devices.find((device) => same(device.Id));
    if (current) current.Enabled = enabled;
    const runtime = playback ? this.playback : this.recording;
    const shown = runtime.find((device) => same(device.Id));
    if (shown) shown.Enabled = enabled;
    this.persist();
  }

  setShortcut(playback: boolean, shortcut: string): void {
    if (playback) this.settings.Audio.Devices.PlaybackShortcut = shortcut;
    else this.settings.Audio.Devices.RecordingShortcut = shortcut;
    this.persist();
    this.applyHotkeys();
  }

  suspendHotkeys(suspended: boolean): void {
    this.hotkeysSuspended = suspended;
    this.applyHotkeys();
  }

  restoreHotkeys(): void {
    this.applyHotkeys();
  }

  /**
   * A janela em foco recebe a tecla além do atalho global. Devolve true quando
   * a combinação é de um atalho deste aplicativo e não deve seguir para a página.
   */
  consumeShortcut(input: { alt: boolean; code: string; control: boolean; isAutoRepeat: boolean; meta: boolean; shift: boolean; type: string }): boolean {
    if (input.type !== 'keyDown' || this.hotkeysSuspended) return false;
    const text = shortcutFromInput(input);
    if (!text) return false;
    const playback = text === this.settings.Audio.Devices.PlaybackShortcut;
    const recording = text === this.settings.Audio.Devices.RecordingShortcut && !playback;
    if (!playback && !recording) return false;
    if (!input.isAutoRepeat) this.fireHotkey(playback);
    return true;
  }

  completeIntro(): void {
    this.settings.IntroCompleted = true;
    this.persist();
  }

  checkForUpdate(): Promise<void> {
    return this.updater.check();
  }

  downloadUpdate(): Promise<void> {
    return this.updater.download();
  }

  setPreferred(playback: boolean, id: string): Promise<void> {
    return this.run(() => this.applyUserDefault(playback, id));
  }

  async cycle(playback: boolean): Promise<void> {
    return this.run(async () => {
      await this.readDevices();
      const listed = enabledConnected(playback ? this.playback : this.recording);
      const next = cycleDefaultId(listed, playback ? this.defaultPlaybackId : this.defaultRecordingId);
      if (next) await this.applyUserDefault(playback, next);
      else this.publish();
    });
  }

  requestQuit(): void {
    this.prepareQuit();
    app.quit();
  }

  prepareQuit(): void {
    if (this.quitting) return;
    this.quitting = true;
    if (this.refreshTimer) clearTimeout(this.refreshTimer);
    clearHotkeys();
    this.audio.stop();
    this.tray?.destroy();
    this.tray = null;
  }

  isQuitting(): boolean {
    return this.quitting;
  }

  private async applyUserDefault(playback: boolean, id: string): Promise<void> {
    const changed = await this.audio.setDefault(id);
    if (!changed) return;
    if (playback) {
      this.settings.Audio.Devices.PlaybackDefault = id;
      this.defaultPlaybackId = id;
    } else {
      this.settings.Audio.Devices.RecordingDefault = id;
      this.defaultRecordingId = id;
    }
    this.persist();
    this.applyTrayIcon();
    this.notifyDevice(playback, id);
  }

  private async refresh(): Promise<void> {
    await this.readDevices();
    await this.applyPreferred(true);
    await this.applyPreferred(false);
    if (this.away) await this.silence();
    this.persistDevices();
    this.applyTrayIcon();
    this.publish();
  }

  private scheduleRefresh(): void {
    if (this.refreshTimer) clearTimeout(this.refreshTimer);
    this.refreshTimer = setTimeout(() => {
      this.refreshTimer = null;
      void this.run(() => this.refresh());
    }, 500);
  }

  private async readDevices(): Promise<void> {
    try {
      const list = await this.audio.list();
      this.audioError = null;
      this.applyList(list);
    } catch (error) {
      this.audioError = error instanceof Error ? error.message : 'Não foi possível ler os dispositivos.';
    }
  }

  private applyList(list: ListResult): void {
    this.playback = mergeDevices(this.settings.Audio.Devices.Playback, list.playback.map(asLive));
    this.recording = mergeDevices(this.settings.Audio.Devices.Recording, list.recording.map(asLive));
    this.rememberIcons(list.playback);
    this.rememberIcons(list.recording);
    this.settings.Audio.Devices.PlaybackDefault = fillPreferred(this.settings.Audio.Devices.PlaybackDefault, list.defaultPlayback);
    this.settings.Audio.Devices.RecordingDefault = fillPreferred(this.settings.Audio.Devices.RecordingDefault, list.defaultRecording);
    this.defaultPlaybackId = list.defaultPlayback || null;
    this.defaultRecordingId = list.defaultRecording || null;
    this.settings.Audio.Devices.Playback = persistedDevices(this.playback);
    this.settings.Audio.Devices.Recording = persistedDevices(this.recording);
  }

  private async applyPreferred(playback: boolean): Promise<void> {
    const decision = preferredDeviceAction({
      preferredId: playback ? this.settings.Audio.Devices.PlaybackDefault : this.settings.Audio.Devices.RecordingDefault,
      currentId: playback ? this.defaultPlaybackId : this.defaultRecordingId,
      devices: playback ? this.playback : this.recording,
    });
    if (decision.action !== 'set') return;
    const changed = await this.audio.setDefault(decision.id).catch(() => false);
    if (!changed) return;
    if (playback) this.defaultPlaybackId = decision.id;
    else this.defaultRecordingId = decision.id;
    this.notifyDevice(playback, decision.id);
  }

  private async silence(): Promise<void> {
    const snapshot: { id: string; muted: boolean }[] = [];
    for (const device of this.playback.filter((item) => item.Connected)) {
      const muted = await this.audio.getMute(device.Id).catch(() => null);
      snapshot.push({ id: device.Id, muted: muted === true });
    }
    for (const id of idsToMute(true, this.mutedByApp, snapshot)) {
      if (await this.audio.setMute(id, true).catch(() => false)) this.mutedByApp.add(id);
    }
  }

  private async restore(): Promise<void> {
    this.away = false;
    for (const id of idsToRestore(this.mutedByApp)) {
      await this.audio.setMute(id, false).catch(() => false);
    }
    this.mutedByApp.clear();
  }

  private onSession(reason: string): void {
    if (!this.settings.Audio.MuteOnLock) return;
    if (leaving.has(reason)) {
      this.away = true;
      void this.silence();
      return;
    }
    if (returning.has(reason)) void this.restore();
  }

  private rememberIcons(devices: LiveDevice[]): void {
    for (const device of devices) {
      if (!device.iconPath) continue;
      if (!this.bitmaps.has(device.id) && device.iconBgra && device.iconWidth && device.iconHeight) {
        const image = bitmapImage(Buffer.from(device.iconBgra, 'base64'), device.iconWidth, device.iconHeight);
        if (image) {
          this.bitmaps.set(device.id, image);
          this.icons.set(device.iconPath, image.toDataURL());
        }
      }
      if (!this.trayBitmaps.has(device.id) && device.trayIconBgra && device.trayIconWidth && device.trayIconHeight) {
        const tray = bitmapImage(Buffer.from(device.trayIconBgra, 'base64'), device.trayIconWidth, device.trayIconHeight);
        if (tray) this.trayBitmaps.set(device.id, tray);
      }
    }
  }

  private views(devices: DeviceEntry[]): AppState['playback'] {
    return devices
      .filter((device) => device.Connected)
      .map((device) => ({
        id: device.Id,
        name: device.Name,
        enabled: device.Enabled,
        connected: device.Connected,
        iconUrl: this.icons.get(device.IconPath) ?? null,
      }));
  }

  private applyTrayIcon(): void {
    if (!this.tray) return;
    const current = this.playback.find((device) => this.defaultPlaybackId && device.Id.toLowerCase() === this.defaultPlaybackId.toLowerCase());
    const image = current ? (this.trayBitmaps.get(current.Id) ?? this.bitmaps.get(current.Id)) : undefined;
    this.tray.setImage(trayImage(image ?? null, this.fallbackIcon));
    const name = current?.Name || 'SoundSwitch';
    this.tray.setToolTip(name.length <= 63 ? name : name.slice(0, 63));
  }

  private bindTray(): void {
    if (!this.tray) return;
    this.tray.on('click', () => this.openDevices());
    this.tray.on('right-click', () => this.openOptions());
    this.tray.on('middle-click', () => this.openOptions());
  }

  private openDevices(): void {
    if (!this.tray) return;
    void this.run(() => this.readDevices()).then(() => {
      this.applyTrayIcon();
      this.publish();
      if (!this.tray) return;
      showDeviceMenu(this.tray, listed(this.playback), listed(this.recording), this.defaultPlaybackId, this.defaultRecordingId, (playback, id) => {
        void this.setPreferred(playback, id);
      });
    });
  }

  private openOptions(): void {
    if (!this.tray) return;
    showOptionsMenu(this.tray, formatVersion(app.getVersion()), () => this.showWindow(), () => this.requestQuit());
  }

  private applyHotkeys(): void {
    if (this.hotkeysSuspended) {
      clearHotkeys();
      return;
    }
    bindHotkeys(
      this.settings.Audio.Devices.PlaybackShortcut,
      this.settings.Audio.Devices.RecordingShortcut,
      () => this.fireHotkey(true),
      () => this.fireHotkey(false),
    );
  }

  private fireHotkey(playback: boolean): void {
    const now = Date.now();
    const previous = playback ? this.lastPlaybackHotkey : this.lastRecordingHotkey;
    if (now - previous < 100) return;
    if (playback) this.lastPlaybackHotkey = now;
    else this.lastRecordingHotkey = now;
    void this.cycle(playback);
  }

  private applyLogin(enabled: boolean): void {
    app.setLoginItemSettings({ openAtLogin: enabled });
  }

  private notifyDevice(playback: boolean, id: string): void {
    if (!this.settings.Audio.ShowNotificationOnDeviceChange) return;
    const devices = playback ? this.playback : this.recording;
    const device = devices.find((item) => item.Id.toLowerCase() === id.toLowerCase());
    this.notify(playback ? 'Reprodução' : 'Gravação', device?.Name || id);
  }

  private notify(title: string, body: string, onClick?: () => void): void {
    if (!Notification.isSupported()) return;
    const notification = new Notification({ title, body });
    if (onClick) notification.on('click', onClick);
    notification.show();
  }

  private persist(): void {
    saveSettings(this.settings);
    this.publish();
  }

  private persistDevices(): void {
    saveSettings(this.settings);
  }

  private publish(): void {
    this.broadcast(this.state());
  }

  private run<T>(work: () => Promise<T>): Promise<T> {
    const next = this.chain.then(work, work);
    this.chain = next.then(
      () => undefined,
      () => undefined,
    );
    return next;
  }
}

function asLive(device: LiveDevice): LiveEndpoint {
  return { id: device.id, name: device.name, iconPath: device.iconPath };
}

function listed(devices: DeviceEntry[]): TrayDevice[] {
  return enabledConnected(devices).map((device) => ({ id: device.Id, name: device.Name }));
}

export function createAppTray(icon: NativeImage): Tray {
  return createTray(icon);
}
