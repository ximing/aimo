import { app, ipcMain } from 'electron';

import { checkForUpdates, downloadUpdate, installUpdate } from './updater';

export function registerIpcHandlers(): void {
  ipcMain.handle('log-preload', (_event, data) => {
    console.log('[Preload] Debug info:', data);
    return { success: true };
  });

  ipcMain.handle('check-for-updates', async () => {
    return await checkForUpdates();
  });

  ipcMain.handle('download-update', async () => {
    await downloadUpdate();
    return { success: true };
  });

  ipcMain.handle('install-update', () => {
    installUpdate();
  });

  ipcMain.handle('get-app-version', () => {
    return app.getVersion();
  });
}
