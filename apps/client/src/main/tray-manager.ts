import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { app, Menu, nativeImage, Tray } from 'electron';

import { mainWindow, setIsQuiting, setTray } from './shared-state';
import { showMainWindow } from './window-manager';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function createTray(): void {
  const iconPath = path.join(__dirname, '../../build/icon_16.png');

  let trayInstance: Tray;

  try {
    if (fs.existsSync(iconPath)) {
      const icon = nativeImage.createFromPath(iconPath);
      trayInstance = new Tray(icon);
    } else {
      const emptyIcon = nativeImage.createEmpty();
      trayInstance = new Tray(emptyIcon);
    }
  } catch {
    const emptyIcon = nativeImage.createEmpty();
    trayInstance = new Tray(emptyIcon);
  }

  setTray(trayInstance);

  trayInstance.setToolTip('AIMO');

  const contextMenu = Menu.buildFromTemplate([
    {
      label: '显示主窗口',
      click: () => {
        showMainWindow();
      },
    },
    { type: 'separator' },
    {
      label: '退出应用',
      click: () => {
        setIsQuiting(true);
        app.quit();
      },
    },
  ]);

  trayInstance.setContextMenu(contextMenu);

  trayInstance.on('click', () => {
    if (mainWindow && mainWindow.isVisible()) {
      mainWindow.hide();
      return;
    }

    showMainWindow();
  });
}
