import fs from 'node:fs';
import path from 'node:path';

import { app, BrowserWindow, screen, shell } from 'electron';

import { getIconPath, PRELOAD_PATH, RENDERER_DIST, VITE_DEV_SERVER_URL } from './constants';
import { isQuiting, mainWindow, setMainWindow } from './shared-state';
import { saveWindowState, windowStore } from './window-state';

export function createWindow(): void {
  // Load saved window state
  const savedState = windowStore.store;

  // Check if the saved display is still available
  const displays = screen.getAllDisplays();
  const isOnValidDisplay = displays.some((display) => {
    const { x, y, width, height } = display.bounds;
    return (
      savedState.x >= x - width &&
      savedState.x <= x + width &&
      savedState.y >= y - height &&
      savedState.y <= y + height
    );
  });

  // Use saved bounds if on valid display, otherwise use default
  const windowBounds = isOnValidDisplay
    ? {
        x: savedState.x,
        y: savedState.y,
        width: savedState.width,
        height: savedState.height,
      }
    : { width: 1200, height: 800 };

  const iconPath = getIconPath();

  const win = new BrowserWindow({
    ...windowBounds,
    minWidth: 800,
    minHeight: 600,
    show: false,
    title: 'AIMO',
    icon: iconPath,
    titleBarStyle: 'hidden',
    webPreferences: {
      preload: PRELOAD_PATH,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  setMainWindow(win);

  // Restore maximized state after window is created
  if (savedState.isMaximized && isOnValidDisplay) {
    win.maximize();
  }

  // Test active push message to Renderer-process.
  win.webContents.on('did-finish-load', () => {
    win.webContents.send('main-process-message', new Date().toLocaleString());
  });

  // Make all links open with the browser, not within the application
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('https:')) {
      shell.openExternal(url);
    }
    return { action: 'deny' };
  });

  // Prevent navigation from drag-and-drop (will-navigate)
  win.webContents.on('will-navigate', (event) => {
    // Only prevent navigation if it's a file drop (not from user clicking links)
    // The URL will typically be file:// when files are dropped
    if (event.url.startsWith('file://')) {
      event.preventDefault();
    }
  });

  // Handle file drag and drop events from the webContents
  // @ts-expect-error - webContents drag events are not fully typed in Electron types
  win.webContents.on('drag-enter', (event: Electron.Event) => {
    event.preventDefault();
  });

  // @ts-expect-error - webContents drag events are not fully typed in Electron types
  win.webContents.on('drag-over', (event: Electron.Event) => {
    event.preventDefault();
  });

  // @ts-expect-error - webContents drag events are not fully typed in Electron types
  win.webContents.on('drop', (event: Electron.Event, files: string[]) => {
    event.preventDefault();
    if (!files || !Array.isArray(files)) return;

    // Filter to only include files (not directories) and return absolute paths
    const filePaths = files.filter((filePath) => {
      try {
        const stats = fs.statSync(filePath);
        return stats.isFile();
      } catch {
        return false;
      }
    });

    if (filePaths.length > 0) {
      win.webContents.send('files-dropped', filePaths);
    }
  });

  if (VITE_DEV_SERVER_URL) {
    win.loadURL(VITE_DEV_SERVER_URL);
  } else {
    win.loadFile(path.join(RENDERER_DIST, 'index.html'));
  }

  // Show window when ready to prevent visual flash
  win.once('ready-to-show', () => {
    win.show();
  });

  // Handle close to tray - prevent default close and hide window instead
  win.on('close', (event) => {
    if (isQuiting) {
      // Save window state before quitting
      saveWindowState();
    } else {
      // Save window state before hiding
      saveWindowState();
      event.preventDefault();
      win.hide();
    }
  });
}

export function showMainWindow(): void {
  if (!mainWindow) {
    createWindow();
    return;
  }

  if (mainWindow.isMinimized()) {
    mainWindow.restore();
  }

  mainWindow.show();
  mainWindow.focus();

  if (process.platform === 'darwin') {
    app.focus({ steal: true });
    mainWindow.moveTop();
  }
}
