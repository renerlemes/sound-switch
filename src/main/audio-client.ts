import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process';
import { app } from 'electron';
import { createInterface } from 'node:readline';
import path from 'node:path';

export type LiveDevice = {
  id: string;
  name: string;
  iconPath: string;
  iconWidth?: number;
  iconHeight?: number;
  iconBgra?: string;
  trayIconWidth?: number;
  trayIconHeight?: number;
  trayIconBgra?: string;
};

export type ListResult = {
  playback: LiveDevice[];
  recording: LiveDevice[];
  defaultPlayback: string;
  defaultRecording: string;
};

type SidecarMessage = {
  id?: number;
  ok?: boolean;
  error?: string;
  event?: string;
  reason?: string;
  changed?: boolean;
  muted?: boolean;
  playback?: LiveDevice[];
  recording?: LiveDevice[];
  defaultPlayback?: string;
  defaultRecording?: string;
};

type Pending = {
  resolve: (value: SidecarMessage) => void;
  reject: (error: Error) => void;
  timer: NodeJS.Timeout;
};

export class AudioClient {
  onDevicesChanged: () => void = () => {};
  onSession: (reason: string) => void = () => {};

  private child: ChildProcessWithoutNullStreams | null = null;
  private readonly pending = new Map<number, Pending>();
  private nextId = 1;

  list(): Promise<ListResult> {
    return this.request('list').then((message) => ({
      playback: message.playback ?? [],
      recording: message.recording ?? [],
      defaultPlayback: message.defaultPlayback ?? '',
      defaultRecording: message.defaultRecording ?? '',
    }));
  }

  setDefault(deviceId: string): Promise<boolean> {
    return this.request('setDefault', { deviceId }).then((message) => message.changed === true);
  }

  getMute(deviceId: string): Promise<boolean | null> {
    return this.request('getMute', { deviceId }).then((message) => (typeof message.muted === 'boolean' ? message.muted : null));
  }

  setMute(deviceId: string, mute: boolean): Promise<boolean> {
    return this.request('setMute', { deviceId, mute }).then((message) => message.changed === true);
  }

  removeLegacy(): Promise<void> {
    return this.request('removeLegacy').then(() => undefined);
  }

  stop(): void {
    const child = this.child;
    this.child = null;
    if (!child) return;
    if (process.platform === 'win32' && child.pid !== undefined) {
      spawn('taskkill.exe', ['/F', '/T', '/PID', String(child.pid)], { windowsHide: true, stdio: 'ignore', shell: false });
    }
    child.kill();
  }

  private request(cmd: string, extra: Record<string, unknown> = {}): Promise<SidecarMessage> {
    this.ensure();
    const id = this.nextId++;
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error('O processo de áudio não respondeu.'));
      }, 8000);
      this.pending.set(id, { resolve, reject, timer });
      this.child?.stdin.write(`${JSON.stringify({ id, cmd, ...extra })}\n`);
    });
  }

  private ensure(): void {
    if (this.child && this.child.exitCode === null) return;
    const exe = app.isPackaged
      ? path.join(process.resourcesPath, 'SoundSwitch.Audio.exe')
      : path.join(app.getAppPath(), 'native', 'dist', 'SoundSwitch.Audio.exe');
    this.child = spawn(exe, [], { stdio: ['pipe', 'pipe', 'pipe'], windowsHide: true, shell: false });
    const output = createInterface({ input: this.child.stdout });
    output.on('line', (line) => this.onLine(line));
    this.child.on('exit', () => {
      this.child = null;
      for (const [id, pending] of this.pending) {
        clearTimeout(pending.timer);
        pending.reject(new Error('O processo de áudio encerrou.'));
        this.pending.delete(id);
      }
    });
  }

  private onLine(line: string): void {
    let message: SidecarMessage;
    try {
      message = JSON.parse(line) as SidecarMessage;
    } catch {
      return;
    }

    if (message.event === 'devicesChanged') {
      this.onDevicesChanged();
      return;
    }
    if (message.event === 'session' && message.reason) {
      this.onSession(message.reason);
      return;
    }
    if (typeof message.id !== 'number') return;

    const pending = this.pending.get(message.id);
    if (!pending) return;
    clearTimeout(pending.timer);
    this.pending.delete(message.id);
    if (message.ok === false) pending.reject(new Error(message.error || 'O comando de áudio falhou.'));
    else pending.resolve(message);
  }
}
