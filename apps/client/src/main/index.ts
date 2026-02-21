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
  type MenuItemConstructorOptions,
  screen,
} from 'electron';
import Store from 'electron-store';
import { autoUpdater } from 'electron-updater';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// The built directory structure
//
// ├─┬ dist
// │ ├─┬ main
// │ │ └── index.js     > Electron-Main
// │ ├─┬ preload
// │ │ └── index.mjs    > Preload-Scripts
// │ └─┬ web
// │   └── index.html   > Web app (built from apps/web with ELECTRON=true)

export const VITE_DEV_SERVER_URL = process.env.VITE_DEV_SERVER_URL;
export const RENDERER_DIST = path.resolve(__dirname, '..');
export const PRELOAD_PATH = path.join(__dirname, '../preload/index.mjs');

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
  // Configure autoUpdater to use GitHub releases (default behavior)
  autoUpdater.checkForUpdatesAndNotify().catch((error) => {
    console.warn('Failed to check for updates:', error);
  });
}

// Manual check for updates - can be called from menu
function checkForUpdates(): void {
  autoUpdater.checkForUpdatesAndNotify().catch((error) => {
    console.warn('Failed to check for updates:', error);
  });
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
          role: 'quit',
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
        label: '检查更新',
        click: () => {
          checkForUpdates();
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
autoUpdater.on('update-available', () => {
  // System notification is handled automatically by checkForUpdatesAndNotify()
  console.log('Update available - will be downloaded automatically');
});

autoUpdater.on('update-downloaded', () => {
  console.log('Update downloaded - will be installed on quit');
});

autoUpdater.on('error', (error) => {
  console.warn('Auto-updater error:', error);
});

// Unregister all shortcuts when app is about to quit
app.on('will-quit', () => {
  globalShortcut.unregisterAll();
});
