import { contextBridge, ipcRenderer, type IpcRendererEvent } from 'electron';
import { IPC_CHANNELS, IPC_EVENTS } from '../shared/contracts';

const channels = new Set<string>(IPC_CHANNELS);
const events = new Set<string>(IPC_EVENTS);

contextBridge.exposeInMainWorld('soundSwitch', {
  invoke(channel: string, input?: unknown): Promise<unknown> {
    if (!channels.has(channel)) return Promise.reject(new Error(`Canal IPC não permitido: ${channel}`));
    return ipcRenderer.invoke('soundswitch:invoke', channel, input);
  },
  on(event: string, listener: (payload: unknown) => void): () => void {
    if (!events.has(event)) throw new Error(`Evento IPC não permitido: ${event}`);
    const wrapped = (_event: IpcRendererEvent, payload: unknown): void => listener(payload);
    const name = `soundswitch:event:${event}`;
    ipcRenderer.on(name, wrapped);
    return () => ipcRenderer.removeListener(name, wrapped);
  },
});
