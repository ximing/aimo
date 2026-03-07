import { app, dialog, Menu, shell, type MenuItemConstructorOptions } from 'electron';

import { setIsQuiting } from './shared-state';
import { checkForUpdates } from './updater';
import { showMainWindow } from './window-manager';

export function createApplicationMenu(): void {
  const isMac = process.platform === 'darwin';

  const editMenuItems: MenuItemConstructorOptions[] = [
    { label: '撤销', role: 'undo', accelerator: 'CmdOrCtrl+Z' },
    { label: '重做', role: 'redo', accelerator: 'Shift+CmdOrCtrl+Z' },
    { type: 'separator' },
    { label: '剪切', role: 'cut', accelerator: 'CmdOrCtrl+X' },
    { label: '复制', role: 'copy', accelerator: 'CmdOrCtrl+C' },
    { label: '粘贴', role: 'paste', accelerator: 'CmdOrCtrl+V' },
    { label: '全选', role: 'selectAll', accelerator: 'CmdOrCtrl+A' },
  ];

  const viewMenuItems: MenuItemConstructorOptions[] = [
    { label: '重新加载', role: 'reload', accelerator: 'CmdOrCtrl+R' },
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

  const windowMenuItems: MenuItemConstructorOptions[] = [
    { label: '最小化', role: 'minimize', accelerator: 'CmdOrCtrl+M' },
    { label: '关闭', role: 'close', accelerator: 'CmdOrCtrl+W' },
    { type: 'separator' },
    {
      label: '显示主窗口',
      click: () => {
        showMainWindow();
      },
    },
  ];

  if (isMac) {
    windowMenuItems.push(
      { type: 'separator' },
      { label: '前置全部窗口', role: 'front' },
      { label: '进入全屏', role: 'togglefullscreen' }
    );
  }

  const template: MenuItemConstructorOptions[] = [];

  if (isMac) {
    template.push({
      label: app.getName(),
      submenu: [
        { label: `关于 ${app.getName()}`, role: 'about' },
        { type: 'separator' },
        { label: '隐藏', role: 'hide', accelerator: 'Command+H' },
        { label: '隐藏其他', role: 'hideOthers', accelerator: 'Command+Alt+H' },
        { label: '显示全部', role: 'unhide' },
        { type: 'separator' },
        {
          label: `退出 ${app.getName()}`,
          accelerator: 'Command+Q',
          click: () => {
            setIsQuiting(true);
            app.quit();
          },
        },
      ],
    });
  }

  template.push(
    { label: '编辑', submenu: editMenuItems },
    { label: '视图', submenu: viewMenuItems },
    { label: '窗口', role: 'window', submenu: windowMenuItems },
    {
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
    }
  );

  if (!isMac) {
    template.unshift({
      label: '文件',
      submenu: [
        {
          label: '退出',
          accelerator: 'Ctrl+Q',
          click: () => {
            setIsQuiting(true);
            app.quit();
          },
        },
      ],
    });
  }

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}
