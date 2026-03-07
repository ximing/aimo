import { app, globalShortcut } from 'electron';

import { registerIpcHandlers } from './ipc-handlers';
import { createApplicationMenu } from './menu-manager';
import { setIsQuiting, setMainWindow } from './shared-state';
import { registerGlobalShortcuts } from './shortcut-manager';
import { createTray } from './tray-manager';
import { registerUpdaterEvents, setupAutoUpdater } from './updater';
import { createWindow, showMainWindow } from './window-manager';

registerUpdaterEvents();
registerIpcHandlers();

app.on('window-all-closed', () => {
  setMainWindow(null);
  // On macOS, keep app running in background when window is closed
  // On Windows/Linux, we keep running with tray icon
  // Don't quit here - tray icon keeps app running
});

app.on('activate', () => {
  // macOS: click dock icon to restore window
  showMainWindow();
});

app.on('before-quit', () => {
  setIsQuiting(true);
});

// Unregister all shortcuts when app is about to quit
app.on('will-quit', () => {
  globalShortcut.unregisterAll();
});

app.whenReady().then(() => {
  createWindow();
  createTray();
  registerGlobalShortcuts();
  createApplicationMenu();

  // Check for updates 3 seconds after app startup
  setTimeout(() => {
    setupAutoUpdater();
  }, 3000);
});
