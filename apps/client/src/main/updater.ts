import { dialog, Notification } from 'electron';
import { autoUpdater, type UpdateInfo } from 'electron-updater';

import { mainWindow } from './shared-state';

// Enable auto-updater logging
autoUpdater.logger = console;

export function setupAutoUpdater(): void {
  // Configure autoUpdater to use GitHub releases
  autoUpdater.autoDownload = false; // Don't auto-download, let user confirm
  autoUpdater.autoInstallOnAppQuit = true; // Install on quit

  // Check for updates
  autoUpdater.checkForUpdates().catch((error) => {
    console.warn('Failed to check for updates:', error);
  });
}

export async function checkForUpdates(): Promise<UpdateInfo | null> {
  try {
    const result = await autoUpdater.checkForUpdates();
    return result?.updateInfo || null;
  } catch (error) {
    console.warn('Failed to check for updates:', error);
    return null;
  }
}

export async function downloadUpdate(): Promise<void> {
  try {
    await autoUpdater.downloadUpdate();
  } catch (error) {
    console.warn('Failed to download update:', error);
    throw error;
  }
}

export function installUpdate(): void {
  autoUpdater.quitAndInstall();
}

export function registerUpdaterEvents(): void {
  autoUpdater.on('checking-for-update', () => {
    console.log('Checking for update...');
    mainWindow?.webContents.send('update-status', { status: 'checking' });
  });

  autoUpdater.on('update-available', (info: UpdateInfo) => {
    console.log('Update available:', info.version);
    mainWindow?.webContents.send('update-status', {
      status: 'available',
      version: info.version,
      releaseNotes: info.releaseNotes,
    });

    // Show system notification
    if (Notification.isSupported()) {
      new Notification({
        title: '发现新版本',
        body: `版本 ${info.version} 可用，是否立即下载？`,
      }).show();
    }
  });

  autoUpdater.on('update-not-available', () => {
    console.log('Update not available');
    mainWindow?.webContents.send('update-status', { status: 'not-available' });
  });

  autoUpdater.on('download-progress', (progress) => {
    console.log('Download progress:', progress.percent);
    mainWindow?.webContents.send('update-status', {
      status: 'downloading',
      percent: progress.percent,
    });
  });

  autoUpdater.on('update-downloaded', (info: UpdateInfo) => {
    console.log('Update downloaded:', info.version);
    mainWindow?.webContents.send('update-status', {
      status: 'downloaded',
      version: info.version,
    });

    // Show system notification
    if (Notification.isSupported()) {
      new Notification({
        title: '更新已下载',
        body: '新版本已下载完成，重启应用即可安装',
      }).show();
    }

    // Ask user if they want to restart now
    dialog
      .showMessageBox({
        type: 'info',
        title: '更新已就绪',
        message: `版本 ${info.version} 已下载完成`,
        detail: '是否立即重启应用以安装更新？',
        buttons: ['立即重启', '稍后重启'],
        defaultId: 0,
        cancelId: 1,
      })
      .then((result) => {
        if (result.response === 0) {
          installUpdate();
        }
      });
  });

  autoUpdater.on('error', (error) => {
    console.error('Auto-updater error:', error);
    mainWindow?.webContents.send('update-status', {
      status: 'error',
      error: error.message,
    });
  });
}
