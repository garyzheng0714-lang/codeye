import { IpcMain, dialog, BrowserWindow } from 'electron';
import fs from 'fs';
import path from 'path';
import os from 'os';

export function registerProjectHandlers(ipcMain: IpcMain) {
  ipcMain.handle('projects:list', () => {
    const projectsDir = path.join(os.homedir(), '.claude', 'projects');
    if (!fs.existsSync(projectsDir)) return [];

    return fs.readdirSync(projectsDir)
      .filter(name => {
        const fullPath = path.join(projectsDir, name);
        return fs.statSync(fullPath).isDirectory();
      })
      .map(name => ({
        id: name,
        path: name.replace(/-/g, '/'),
        name: name.split('-').pop() || name,
      }));
  });

  ipcMain.handle('projects:select-directory', async (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (!win) return null;

    const result = await dialog.showOpenDialog(win, {
      properties: ['openDirectory'],
      title: 'Select Project Directory',
    });

    if (result.canceled || !result.filePaths.length) return null;
    return result.filePaths[0];
  });

  ipcMain.handle('window:minimize', (event) => {
    BrowserWindow.fromWebContents(event.sender)?.minimize();
  });

  ipcMain.handle('window:maximize', (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (win?.isMaximized()) {
      win.unmaximize();
    } else {
      win?.maximize();
    }
  });

  ipcMain.handle('window:close', (event) => {
    BrowserWindow.fromWebContents(event.sender)?.close();
  });
}
