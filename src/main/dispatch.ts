import { ZodError } from 'zod';
import { ipcContract, type IpcChannel, type IpcResult, type AppState, type ThemeChoice } from '../shared/contracts';
import type { AppController } from './controller';

const isChannel = (value: unknown): value is IpcChannel => typeof value === 'string' && Object.hasOwn(ipcContract, value);

export async function dispatch(controller: AppController, channel: unknown, rawInput: unknown): Promise<IpcResult<AppState>> {
  if (!isChannel(channel)) return { ok: false, error: { message: 'Canal IPC desconhecido.', code: 'UNKNOWN_CHANNEL' } };
  try {
    const input = ipcContract[channel].parse(rawInput ?? undefined);
    await run(controller, channel, input);
    return { ok: true, data: controller.state() };
  } catch (error) {
    if (error instanceof ZodError) {
      return {
        ok: false,
        error: {
          message: `Dados inválidos: ${error.issues.map((issue) => issue.message).join('; ')}`,
          code: 'VALIDATION',
        },
      };
    }
    return { ok: false, error: { message: error instanceof Error ? error.message : String(error), code: 'INTERNAL' } };
  }
}

async function run(controller: AppController, channel: IpcChannel, input: unknown): Promise<void> {
  switch (channel) {
    case 'state.get':
      return;
    case 'settings.setAutoStart':
      controller.setAutoStart((input as { enabled: boolean }).enabled);
      return;
    case 'settings.setTheme':
      controller.setTheme((input as { theme: ThemeChoice }).theme);
      return;
    case 'settings.setMuteOnLock':
      controller.setMuteOnLock((input as { enabled: boolean }).enabled);
      return;
    case 'settings.setNotifications':
      controller.setNotifications((input as { enabled: boolean }).enabled);
      return;
    case 'devices.setEnabled': {
      const value = input as { playback: boolean; id: string; enabled: boolean };
      controller.setEnabled(value.playback, value.id, value.enabled);
      return;
    }
    case 'devices.setShortcut': {
      const value = input as { playback: boolean; shortcut: string };
      controller.setShortcut(value.playback, value.shortcut);
      return;
    }
    case 'devices.setDefault': {
      const value = input as { playback: boolean; id: string };
      await controller.setPreferred(value.playback, value.id);
      return;
    }
    case 'hotkeys.suspend':
      controller.suspendHotkeys((input as { suspended: boolean }).suspended);
      return;
    case 'intro.complete':
      controller.completeIntro();
      return;
    case 'update.check':
      await controller.checkForUpdate();
      return;
    case 'update.download':
      await controller.downloadUpdate();
      return;
  }
}
