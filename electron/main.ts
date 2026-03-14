import { app, BrowserWindow, ipcMain, nativeImage, shell, globalShortcut, Menu, Notification } from 'electron';
import path from 'path';
import fs from 'fs';
import { registerClaudeHandlers } from './ipc/claude';
import { registerSessionHandlers } from './ipc/sessions';
import { registerProjectHandlers } from './ipc/projects';
import { registerSecretHandlers } from './ipc/secrets';
import { registerUpdaterHandlers } from './updater';

let mainWindow: BrowserWindow | null = null;

function resolveDockIconPath(): string | null {
  const candidates = [
    path.join(process.cwd(), 'build/icon-source.png'),
    path.join(__dirname, '../build/icon-source.png'),
    path.join(app.getAppPath(), 'build/icon-source.png'),
    path.join(process.resourcesPath, 'build/icon-source.png'),
  ];

  for (const candidate of candidates) {
    try {
      if (fs.existsSync(candidate)) {
        return candidate;
      }
    } catch {
      // ignore invalid candidate paths
    }
  }

  return null;
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    titleBarStyle: 'hiddenInset',
    trafficLightPosition: { x: 16, y: 16 },
    backgroundColor: '#faf9fe',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('https://') || url.startsWith('http://')) {
      shell.openExternal(url);
    }
    return { action: 'deny' };
  });

  if (process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }
}

function ensureWindow() {
  if (!app.isReady()) {
    void app.whenReady().then(() => {
      if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
      }
    });
    return;
  }

  const windows = BrowserWindow.getAllWindows();
  if (windows.length === 0) {
    createWindow();
    return;
  }

  const existingWindow = windows[0];
  if (existingWindow.isMinimized()) existingWindow.restore();
  existingWindow.show();
  existingWindow.focus();
}

function buildMenu() {
  const template: Electron.MenuItemConstructorOptions[] = [
    {
      label: 'Codeye',
      submenu: [
        { role: 'about' },
        { type: 'separator' },
        { role: 'hide' },
        { role: 'hideOthers' },
        { role: 'unhide' },
        { type: 'separator' },
        { role: 'quit' },
      ],
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'selectAll' },
      ],
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' },
      ],
    },
    {
      label: 'Window',
      submenu: [
        { role: 'minimize' },
        { role: 'zoom' },
        { role: 'close' },
      ],
    },
  ];
  return Menu.buildFromTemplate(template);
}

function registerGlobalShortcuts() {
  globalShortcut.register('CommandOrControl+Shift+C', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.show();
      mainWindow.focus();
    }
  });
}

function showNotification(title: string, body: string) {
  if (Notification.isSupported()) {
    new Notification({ title, body }).show();
  }
}

ipcMain.handle('notification:show', (_event, { title, body }) => {
  showNotification(title, body);
});

app.whenReady().then(() => {
  if (process.platform === 'darwin' && app.dock) {
    const iconPath = resolveDockIconPath();
    if (iconPath) {
      const icon = nativeImage.createFromPath(iconPath);
      if (!icon.isEmpty()) {
        app.dock.setIcon(icon);
      }
    }
  }
  Menu.setApplicationMenu(buildMenu());
  registerGlobalShortcuts();
  ipcMain.handle('app:get-cwd', () => process.cwd());
  registerClaudeHandlers(ipcMain);
  registerSessionHandlers(ipcMain);
  registerProjectHandlers(ipcMain);
  registerSecretHandlers(ipcMain);
  registerUpdaterHandlers(ipcMain, () => mainWindow);
  ensureWindow();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
});

app.on('activate', () => {
  ensureWindow();
});
