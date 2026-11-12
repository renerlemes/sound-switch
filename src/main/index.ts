import { existsSync, unlinkSync } from 'node:fs';
import path from 'node:path';
import { app, BrowserWindow, ipcMain, type NativeImage, nativeImage, nativeTheme, shell } from 'electron';
import { AppController, createAppTray } from './controller';
import { dispatch } from './dispatch';

const DEV_URL = process.env.VITE_DEV_SERVER_URL ?? null;
const APP_USER_MODEL_ID = app.isPackaged ? 'app.soundswitch.desktop' : 'app.soundswitch.desktop.dev';

if (process.platform === 'win32') app.setAppUserModelId(APP_USER_MODEL_ID);

if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  void app.whenReady().then(() => start());
}

function start(): void {
  removeDevStartMenuShortcut();
  const icon = appIcon();
  let mainWindow: BrowserWindow | null = null;

  const showMainWindow = (): void => {
    if (!mainWindow || mainWindow.isDestroyed()) mainWindow = createWindow(icon);
    if (!mainWindow.isMaximized()) mainWindow.maximize();
    mainWindow.show();
    mainWindow.focus();
  };

  const controller = new AppController((state) => {
    paintWindowBackground();
    for (const window of BrowserWindow.getAllWindows()) {
      if (!window.isDestroyed()) window.webContents.send('soundswitch:event:state', state);
    }
  }, showMainWindow);

  const tray = createAppTray(icon);
  controller.attach(tray, icon);
  mainWindow = createWindow(icon);
  controller.restoreHotkeys();

  ipcMain.handle('soundswitch:invoke', (_event, channel: unknown, input: unknown) => dispatch(controller, channel, input));
  nativeTheme.on('updated', paintWindowBackground);
  app.on('second-instance', () => showMainWindow());
  app.on('before-quit', () => controller.prepareQuit());
  app.on('window-all-closed', () => {
    if (controller.isQuitting()) app.quit();
  });

  function createWindow(windowIcon: NativeImage): BrowserWindow {
    const window = new BrowserWindow({
      width: 960,
      height: 760,
      minWidth: 760,
      minHeight: 560,
      show: false,
      autoHideMenuBar: true,
      backgroundColor: windowBackground(),
      icon: windowIcon,
      webPreferences: {
        preload: path.join(__dirname, '../preload/index.cjs'),
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: true,
      },
    });

    window.on('close', (event) => {
      if (controller.isQuitting()) return;
      event.preventDefault();
      window.hide();
    });
    window.on('hide', () => controller.restoreHotkeys());
    window.webContents.on('before-input-event', (event, input) => {
      if (controller.consumeShortcut(input)) event.preventDefault();
    });

    if (DEV_URL) void window.loadURL(DEV_URL);
    else void window.loadFile(path.join(__dirname, '../renderer/index.html'));

    return window;
  }

  if (!controller.state().introCompleted) showMainWindow();
}

function windowBackground(): string {
  return nativeTheme.shouldUseDarkColors ? '#131922' : '#fbfcfe';
}

function paintWindowBackground(): void {
  const background = windowBackground();
  for (const window of BrowserWindow.getAllWindows()) {
    if (!window.isDestroyed()) window.setBackgroundColor(background);
  }
}

function appIcon(): NativeImage {
  const candidates = [path.join(process.resourcesPath, 'icon.ico'), path.join(app.getAppPath(), 'build', 'icon.ico')];
  for (const candidate of candidates) {
    if (existsSync(candidate)) return nativeImage.createFromPath(candidate);
  }
  return nativeImage.createEmpty();
}

/** O desenvolvimento não cria atalho. Remove o que uma versão anterior gravou apontando para o electron.exe. */
function removeDevStartMenuShortcut(): void {
  if (process.platform !== 'win32' || app.isPackaged) return;
  const shortcutPath = path.join(app.getPath('appData'), 'Microsoft', 'Windows', 'Start Menu', 'Programs', 'SoundSwitch.lnk');
  if (!existsSync(shortcutPath)) return;
  try {
    const target = shell.readShortcutLink(shortcutPath).target;
    if (!target.toLowerCase().endsWith('electron.exe')) return;
    unlinkSync(shortcutPath);
  } catch {
    // Atalho inacessível: a abertura segue sem ele.
  }
}
