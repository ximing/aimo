import { BrowserWindow, Tray } from 'electron';

export let mainWindow: BrowserWindow | null = null;
export let tray: Tray | null = null;
export let isQuiting = false;

export function setMainWindow(w: BrowserWindow | null): void {
  mainWindow = w;
}

export function setTray(t: Tray | null): void {
  tray = t;
}

export function setIsQuiting(v: boolean): void {
  isQuiting = v;
}
