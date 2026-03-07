import Store from 'electron-store';

import { mainWindow } from './shared-state';

export interface WindowState {
  x: number;
  y: number;
  width: number;
  height: number;
  isMaximized: boolean;
}

export const windowStore = new Store<WindowState>({
  name: 'window-state',
  defaults: {
    x: 0,
    y: 0,
    width: 1200,
    height: 800,
    isMaximized: false,
  },
});

export function saveWindowState(): void {
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
