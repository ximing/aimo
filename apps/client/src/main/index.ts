import { app, BrowserWindow, shell, Tray, Menu, nativeImage, globalShortcut } from 'electron';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// The built directory structure
//
// ├─┬ dist
// │ ├─┬ main
// │ │ └── index.js    > Electron-Main
// │ └─┬ preload
// │   └── index.mjs   > Preload-Scripts
// ├─┬ ../server/public
// │ └── ...           > Web build output (from apps/web)

/* eslint-disable turbo/no-undeclared-env-vars */
process.env.APP_ROOT = path.join(__dirname, '../..');

export const MAIN_DIST = path.join(process.env.APP_ROOT, 'dist');
// Web app builds to ../server/public (relative to apps/web, so from apps/client: ../../server/public)
export const RENDERER_DIST = path.join(process.env.APP_ROOT, '../../server/public');
export const VITE_DEV_SERVER_URL = process.env.VITE_DEV_SERVER_URL;

process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL
  ? path.join(process.env.APP_ROOT, 'public')
  : RENDERER_DIST;
/* eslint-enable turbo/no-undeclared-env-vars */

let mainWindow: BrowserWindow | null;
let tray: Tray | null = null;
let isQuiting = false;

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    show: false,
    title: 'AIMO',
    webPreferences: {
      preload: path.join(MAIN_DIST, 'preload/index.mjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  // Test active push message to Renderer-process.
  mainWindow.webContents.on('did-finish-load', () => {
    mainWindow?.webContents.send('main-process-message', new Date().toLocaleString());
  });

  // Make all links open with the browser, not within the application
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('https:')) {
      shell.openExternal(url);
    }
    return { action: 'deny' };
  });

  if (VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(path.join(RENDERER_DIST, 'index.html'));
  }

  // Show window when ready to prevent visual flash
  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
  });

  // Handle close to tray - prevent default close and hide window instead
  mainWindow.on('close', (event) => {
    if (!isQuiting) {
      event.preventDefault();
      mainWindow?.hide();
    }
  });
}

function toggleWindowVisibility(): void {
  if (!mainWindow) {
    createWindow();
    return;
  }

  if (mainWindow.isVisible()) {
    mainWindow.hide();
  } else {
    mainWindow.show();
    mainWindow.focus();
  }
}

function registerGlobalShortcuts(): void {
  // Register CommandOrControl+Shift+A to toggle window visibility
  const registered = globalShortcut.register('CommandOrControl+Shift+A', toggleWindowVisibility);
  if (!registered) {
    console.warn('Failed to register global shortcut CommandOrControl+Shift+A');
  }
}

function createTray(): void {
  // Create tray icon (use a default template or create from path)
  // Use a simple base64 encoded icon for now (16x16 tray icon)
  const iconPath = path.join(process.env.VITE_PUBLIC || '', 'tray-icon.png');

  // Try to load icon from public folder, fallback to nativeImage.createEmpty()
  try {
    tray = new Tray(iconPath);
  } catch {
    // Create a simple 16x16 transparent icon as fallback
    const emptyIcon = nativeImage.createEmpty();
    tray = new Tray(emptyIcon);
  }

  // Set tooltip
  tray.setToolTip('AIMO');

  // Create context menu
  const contextMenu = Menu.buildFromTemplate([
    {
      label: '显示主窗口',
      click: () => {
        if (mainWindow) {
          mainWindow.show();
          mainWindow.focus();
        } else {
          createWindow();
        }
      },
    },
    { type: 'separator' },
    {
      label: '退出应用',
      click: () => {
        isQuiting = true;
        app.quit();
      },
    },
  ]);

  tray.setContextMenu(contextMenu);

  // Click tray icon to toggle window visibility
  tray.on('click', () => {
    if (mainWindow) {
      if (mainWindow.isVisible()) {
        mainWindow.hide();
      } else {
        mainWindow.show();
        mainWindow.focus();
      }
    } else {
      createWindow();
    }
  });
}

app.on('window-all-closed', () => {
  mainWindow = null;
  // On macOS, keep app running in background when window is closed
  // On Windows/Linux, we keep running with tray icon
  // Don't quit here - tray icon keeps app running
});

app.on('activate', () => {
  // macOS: click dock icon to restore window
  if (mainWindow) {
    if (mainWindow.isVisible()) {
      mainWindow.focus();
    } else {
      mainWindow.show();
      mainWindow.focus();
    }
  } else {
    createWindow();
  }
});

app.whenReady().then(() => {
  createWindow();
  createTray();
  registerGlobalShortcuts();
});

// Unregister all shortcuts when app is about to quit
app.on('will-quit', () => {
  globalShortcut.unregisterAll();
});
