import type { AppState, IpcChannel, IpcResult } from '../../shared/contracts';

type Bridge = {
  invoke(channel: string, input?: unknown): Promise<unknown>;
  on(event: string, listener: (payload: unknown) => void): () => void;
};

const bridge = (): Bridge => {
  const api = (window as unknown as { soundSwitch?: Bridge }).soundSwitch;
  if (!api) throw new Error('A ponte do SoundSwitch não está disponível.');
  return api;
};

export async function call<T>(channel: IpcChannel, input?: unknown): Promise<T> {
  const result = (await bridge().invoke(channel, input)) as IpcResult<T>;
  if (!result.ok) throw new Error(result.error.message);
  return result.data;
}

export function subscribe(listener: (state: AppState) => void): () => void {
  return bridge().on('state', (payload) => listener(payload as AppState));
}

export async function loadState(): Promise<AppState> {
  return call<AppState>('state.get');
}
