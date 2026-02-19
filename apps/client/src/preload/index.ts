import { ipcRenderer, contextBridge, IpcRendererEvent } from 'electron';

type MessageCallback = (message: string) => void;

// Store wrapped callbacks to allow proper removal
const callbackMap = new Map<MessageCallback, (event: IpcRendererEvent, message: string) => void>();

// --------- Expose API to Renderer process ---------
contextBridge.exposeInMainWorld('electronAPI', {
  // Platform info
  platform: process.platform,

  // IPC communication
  onMainMessage: (callback: MessageCallback) => {
    const wrappedCallback = (_event: IpcRendererEvent, message: string) => {
      callback(message);
    };
    callbackMap.set(callback, wrappedCallback);
    ipcRenderer.on('main-process-message', wrappedCallback);
  },

  removeMainMessageListener: (callback: MessageCallback) => {
    const wrappedCallback = callbackMap.get(callback);
    if (wrappedCallback) {
      ipcRenderer.removeListener('main-process-message', wrappedCallback);
      callbackMap.delete(callback);
    }
  },
});

// --------- Type definitions for Renderer process ---------
declare global {
  interface Window {
    electronAPI: {
      platform: string;
      onMainMessage: (callback: (message: string) => void) => void;
      removeMainMessageListener: (callback: (message: string) => void) => void;
    };
  }
}

export type ElectronAPI = Window['electronAPI'];
