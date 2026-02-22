import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  app,
  BrowserWindow,
  shell,
  Tray,
  Menu,
  nativeImage,
  globalShortcut,
  ipcMain,
  type MenuItemConstructorOptions,
  screen,
  dialog,
  Notification,
} from 'electron';
import Store from 'electron-store';
import { autoUpdater, type UpdateInfo } from 'electron-updater';

// Enable auto-updater logging
autoUpdater.logger = console;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// The built directory structure
//
// ├─┬ dist
// │ ├─┬ main
// │ │ └── index.js     > Electron-Main
// │ ├─┬ preload
// │ │ └── index.mjs    > Preload-Scripts
// │ └─┬ index.html   > Web app (built from apps/web with ELECTRON=true)

export const VITE_DEV_SERVER_URL = process.env.VITE_DEV_SERVER_URL;
export const RENDERER_DIST = path.resolve(__dirname, '..');
export const PRELOAD_PATH = path.join(__dirname, '../preload/index.cjs');

process.env.VITE_PUBLIC = RENDERER_DIST;

let mainWindow: BrowserWindow | null;
let tray: Tray | null = null;
let isQuiting = false;

// Window state store for saving/restoring window bounds and maximized state
interface WindowState {
  x: number;
  y: number;
  width: number;
  height: number;
  isMaximized: boolean;
}

const windowStore = new Store<WindowState>({
  name: 'window-state',
  defaults: {
    x: 0,
    y: 0,
    width: 1200,
    height: 800,
    isMaximized: false,
  },
});

function saveWindowState(): void {
  if (!mainWindow) return;

  const isMaximized = mainWindow.isMaximized();

  // Save maximized state
  windowStore.set('isMaximized', isMaximized);

  // Only save bounds if not maximized (maximized bounds are not useful)
  if (!isMaximized) {
    const bounds = mainWindow.getBounds();
    windowStore.set('x', bounds.x);
    windowStore.set('y', bounds.y);
    windowStore.set('width', bounds.width);
    windowStore.set('height', bounds.height);
  }
}

function getIconPath(): string {
  // Use build directory icons for the app
  const iconPath = path.join(__dirname, '../../build/icon.png');
  return iconPath;
}

function createWindow(): void {
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

  mainWindow = new BrowserWindow({
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

  // Restore maximized state after window is created
  if (savedState.isMaximized && isOnValidDisplay) {
    mainWindow.maximize();
  }

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

  // Prevent navigation from drag-and-drop (will-navigate)
  mainWindow.webContents.on('will-navigate', (event) => {
    // Only prevent navigation if it's a file drop (not from user clicking links)
    // The URL will typically be file:// when files are dropped
    if (event.url.startsWith('file://')) {
      event.preventDefault();
    }
  });

  // Handle file drag and drop events from the webContents
  // @ts-expect-error - webContents drag events are not fully typed in Electron types
  mainWindow.webContents.on('drag-enter', (event: Electron.Event) => {
    event.preventDefault();
  });

  // @ts-expect-error - webContents drag events are not fully typed in Electron types
  mainWindow.webContents.on('drag-over', (event: Electron.Event) => {
    event.preventDefault();
  });

  // @ts-expect-error - webContents drag events are not fully typed in Electron types
  mainWindow.webContents.on('drop', (event: Electron.Event, files: string[]) => {
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

    if (filePaths.length > 0 && mainWindow) {
      mainWindow.webContents.send('files-dropped', filePaths);
    }
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
    if (isQuiting) {
      // Save window state before quitting
      saveWindowState();
    } else {
      // Save window state before hiding
      saveWindowState();
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
  // Create tray icon
  // Use icon_16.png from build directory for tray
  const iconPath = path.join(__dirname, '../../build/icon_16.png');

  // Try to load icon from build folder
  try {
    if (fs.existsSync(iconPath)) {
      const icon = nativeImage.createFromPath(iconPath);
      tray = new Tray(icon);
    } else {
      // Fallback: create a simple 16x16 icon
      const emptyIcon = nativeImage.createEmpty();
      tray = new Tray(emptyIcon);
    }
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

// Auto-update setup
function setupAutoUpdater(): void {
  // Configure autoUpdater to use GitHub releases
  autoUpdater.autoDownload = false; // Don't auto-download, let user confirm
  autoUpdater.autoInstallOnAppQuit = true; // Install on quit

  // Check for updates
  autoUpdater.checkForUpdates().catch((error) => {
    console.warn('Failed to check for updates:', error);
  });
}

// Manual check for updates - can be called from menu or renderer
async function checkForUpdates(): Promise<UpdateInfo | null> {
  try {
    const result = await autoUpdater.checkForUpdates();
    return result?.updateInfo || null;
  } catch (error) {
    console.warn('Failed to check for updates:', error);
    return null;
  }
}

// Download update
async function downloadUpdate(): Promise<void> {
  try {
    await autoUpdater.downloadUpdate();
  } catch (error) {
    console.warn('Failed to download update:', error);
    throw error;
  }
}

// Install update and restart
function installUpdate(): void {
  autoUpdater.quitAndInstall();
}

function createApplicationMenu(): void {
  const isMac = process.platform === 'darwin';

  // Common edit menu items
  const editMenuItems: MenuItemConstructorOptions[] = [
    { label: '撤销', role: 'undo', accelerator: 'CmdOrCtrl+Z' },
    { label: '重做', role: 'redo', accelerator: 'Shift+CmdOrCtrl+Z' },
    { type: 'separator' },
    { label: '剪切', role: 'cut', accelerator: 'CmdOrCtrl+X' },
    { label: '复制', role: 'copy', accelerator: 'CmdOrCtrl+C' },
    { label: '粘贴', role: 'paste', accelerator: 'CmdOrCtrl+V' },
    { label: '全选', role: 'selectAll', accelerator: 'CmdOrCtrl+A' },
  ];

  // View menu items
  const viewMenuItems: MenuItemConstructorOptions[] = [
    {
      label: '重新加载',
      role: 'reload',
      accelerator: 'CmdOrCtrl+R',
    },
    {
      label: '切换开发者工具',
      role: 'toggleDevTools',
      accelerator: isMac ? 'Alt+Cmd+I' : 'Ctrl+Shift+I',
    },
    { type: 'separator' },
    { label: '重置缩放', role: 'resetZoom', accelerator: 'CmdOrCtrl+0' },
    { label: '放大', role: 'zoomIn', accelerator: 'CmdOrCtrl+Plus' },
    { label: '缩小', role: 'zoomOut', accelerator: 'CmdOrCtrl+-' },
    { type: 'separator' },
    { label: '全屏', role: 'togglefullscreen', accelerator: isMac ? 'Ctrl+Cmd+F' : 'F11' },
  ];

  // Window menu items
  const windowMenuItems: MenuItemConstructorOptions[] = [
    { label: '最小化', role: 'minimize', accelerator: 'CmdOrCtrl+M' },
    { label: '关闭', role: 'close', accelerator: 'CmdOrCtrl+W' },
    { type: 'separator' },
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
  ];

  // macOS specific window menu additions
  if (isMac) {
    windowMenuItems.push(
      { type: 'separator' },
      { label: '前置全部窗口', role: 'front' },
      { label: '进入全屏', role: 'togglefullscreen' }
    );
  }

  const template: MenuItemConstructorOptions[] = [];

  if (isMac) {
    // macOS: App menu as first item
    template.push({
      label: app.getName(),
      submenu: [
        { label: `关于 ${app.getName()}`, role: 'about' },
        { type: 'separator' },
        {
          label: '隐藏',
          role: 'hide',
          accelerator: 'Command+H',
        },
        {
          label: '隐藏其他',
          role: 'hideOthers',
          accelerator: 'Command+Alt+H',
        },
        { label: '显示全部', role: 'unhide' },
        { type: 'separator' },
        {
          label: `退出 ${app.getName()}`,
          accelerator: 'Command+Q',
          click: () => {
            isQuiting = true;
            app.quit();
          },
        },
      ],
    });
  }

  // Edit menu
  template.push({
    label: '编辑',
    submenu: editMenuItems,
  }, {
    label: '视图',
    submenu: viewMenuItems,
  }, {
    label: '窗口',
    role: 'window',
    submenu: windowMenuItems,
  }, {
    label: '帮助',
    role: 'help',
    submenu: [
      {
        label: `检查更新 (v${app.getVersion()})`,
        click: async () => {
          const updateInfo = await checkForUpdates();
          if (!updateInfo) {
            dialog.showMessageBox({
              type: 'info',
              title: '检查更新',
              message: '当前已是最新版本',
            });
          }
        },
      },
      { type: 'separator' },
      {
        label: '访问 GitHub',
        click: () => {
          shell.openExternal('https://github.com/ximing/aimo');
        },
      },
    ],
  });

  // Windows/Linux: Add File menu with Quit option
  if (!isMac) {
    template.unshift({
      label: '文件',
      submenu: [
        {
          label: '退出',
          accelerator: 'Ctrl+Q',
          click: () => {
            isQuiting = true;
            app.quit();
          },
        },
      ],
    });
  }

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
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

// Register IPC handlers
ipcMain.handle('log-preload', (_event, data) => {
  console.log('[Preload] Debug info:', data);
  return { success: true };
});

// Update-related IPC handlers
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

// Auto-updater event handlers
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
  dialog.showMessageBox({
    type: 'info',
    title: '更新已就绪',
    message: `版本 ${info.version} 已下载完成`,
    detail: '是否立即重启应用以安装更新？',
    buttons: ['立即重启', '稍后重启'],
    defaultId: 0,
    cancelId: 1,
  }).then((result) => {
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

// Unregister all shortcuts when app is about to quit
app.on('will-quit', () => {
  globalShortcut.unregisterAll();
});
