import { app, Menu, nativeImage, Tray } from 'electron';

import { resolveAssetPath } from './assets';
import { mainWindow, setIsQuiting, setTray } from './shared-state';
import { showMainWindow } from './window-manager';

function createTrayImage(): Electron.NativeImage {
  const runtime = {
    resourcesPath: process.resourcesPath,
    appPath: app.getAppPath(),
  };

  if (process.platform === 'darwin') {
    const templatePath = resolveAssetPath('trayTemplate.png', runtime);
    if (templatePath) {
      const template = nativeImage.createFromPath(templatePath);
      if (!template.isEmpty()) {
        template.setTemplateImage(true);
        return template;
      }
    }
  }

  const candidates =
    process.platform === 'darwin'
      ? ['icon_32.png', 'icon_16.png', 'icon.png', 'icon.icns']
      : process.platform === 'win32'
        ? ['icon_16.png', 'icon_32.png', 'icon.ico', 'icon.png']
        : ['icon_16.png', 'icon_32.png', 'icon.png'];

  for (const filename of candidates) {
    const found = resolveAssetPath(filename, runtime);
    if (!found) {
      continue;
    }

    let image = nativeImage.createFromPath(found);
    if (image.isEmpty()) {
      continue;
    }

    image = image.resize({ width: 16, height: 16 });
    if (process.platform === 'darwin') {
      image.setTemplateImage(true);
    }
    return image;
  }

  console.warn('[tray] No tray icon file found; using embedded template');
  return createEmbeddedTrayImage();
}

/** 32x32 template PNG (scaleFactor 2) so macOS menu bar is never empty. */
const FALLBACK_TRAY_TEMPLATE_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAACbElEQVR42u2WTWtTURCGC0KhSBERhKIodCcViyj4BbqQrgUFN9WNdWPBP9CFKH7RjV8IdqEuihYUwRbEamJyG01uTdIYo1X/ju/Ac2C43iS3rhTuwENI7pmZd2bOOTcDA7nlltt/ZiNitxjcgM92MSo2/23STeKceC6WRUG8FFN9gu4Xd/AxXotrYudGk8+Id+IDFF3QB2Ioxe8Iz23te4fFeSp2ZRVwWXwRsSghIAQrwoUUvyeinCLYflsVj7MkHxYr4rv4IRpUUHRYgmd0Kthx160guoCAdWJ1soxiUqyxOIgoueCek85v1lXvRawRw2J9FYf7zX5B1EULB1P/kcrLBA7BZ/HbwfdKQoR9/0lyG2mTfdLVjjH3VVrfohPT4i2JvYhljuglUROfSBrx/DMCviGg3q8D1wkS49xgPwxzlIKAsqv0olhivflV6VhEB636NqOwNYd6XTZvqKBKMBNwledHSRo5ASU606a9dfwCPnmDznYVME3wFSqoodjO730x5wREbm3EqLwISzRP61suedxNgF2xLwgYCKOoM79ffIbEFScgdnNu8tsUI2hSSI3CDqYJmGCeXkAYRdiQ62yoCoEqCTpgIm6Ks671MT5lruo/7B7HzG+yKCGiTReaLqkXErrQ4TSddq2vsaaUJuAAyQsQLhGb/Q1xS9wXd9kHD92IPGHjLhD3FMmrblxW2HhSwIy7YsN9b0L29TiuV6gqEHa93Qt7WTPquhhR2GLyTTrC69K/9exYnc/wtgyXU0wHHok9iXVnEGUiXokTyUDbaMkYFY8jKqsN8ord2mPNFoQN5f/rcsvtn7LfgWD9+lFrrTAAAAAASUVORK5CYII=',
  'base64'
);

function createEmbeddedTrayImage(): Electron.NativeImage {
  const image = nativeImage.createFromBuffer(FALLBACK_TRAY_TEMPLATE_PNG, {
    scaleFactor: 2,
  });
  if (process.platform === 'darwin') {
    image.setTemplateImage(true);
  }
  return image;
}

export function createTray(): void {
  const trayInstance = new Tray(createTrayImage());

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
