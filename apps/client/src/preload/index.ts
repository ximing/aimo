import { ipcRenderer, contextBridge, IpcRendererEvent, app } from 'electron';

type MessageCallback = (message: string) => void;
type FileDropCallback = (filePaths: string[]) => void;

// Store wrapped callbacks to allow proper removal
const messageCallbackMap = new Map<MessageCallback, (event: IpcRendererEvent, message: string) => void>();
const fileDropCallbackMap = new Map<FileDropCallback, (event: IpcRendererEvent, filePaths: string[]) => void>();

// Log platform info for debugging
console.log('Preload script loaded, platform:', process.platform);
// Also send to main process via IPC for better visibility
ipcRenderer.invoke('log-preload', { platform: process.platform });

// --------- Expose API to Renderer process ---------
contextBridge.exposeInMainWorld('electronAPI', {
  // Platform info
  platform: process.platform,

  // App version
  getVersion: () => app.getVersion(),

  // IPC communication
  onMainMessage: (callback: MessageCallback) => {
    const wrappedCallback = (_event: IpcRendererEvent, message: string) => {
      callback(message);
    };
    messageCallbackMap.set(callback, wrappedCallback);
    ipcRenderer.on('main-process-message', wrappedCallback);
  },

  removeMainMessageListener: (callback: MessageCallback) => {
    const wrappedCallback = messageCallbackMap.get(callback);
    if (wrappedCallback) {
      ipcRenderer.removeListener('main-process-message', wrappedCallback);
      messageCallbackMap.delete(callback);
    }
  },

  // File drag and drop
  onFileDrop: (callback: FileDropCallback) => {
    const wrappedCallback = (_event: IpcRendererEvent, filePaths: string[]) => {
      callback(filePaths);
    };
    fileDropCallbackMap.set(callback, wrappedCallback);
    ipcRenderer.on('files-dropped', wrappedCallback);
  },

  removeFileDropListener: (callback: FileDropCallback) => {
    const wrappedCallback = fileDropCallbackMap.get(callback);
    if (wrappedCallback) {
      ipcRenderer.removeListener('files-dropped', wrappedCallback);
      fileDropCallbackMap.delete(callback);
    }
  },
});

// --------- Type definitions for Renderer process ---------
declare global {
  interface Window {
    electronAPI: {
      platform: string;
      getVersion: () => string;
      onMainMessage: (callback: (message: string) => void) => void;
      removeMainMessageListener: (callback: (message: string) => void) => void;
      onFileDrop: (callback: (filePaths: string[]) => void) => void;
      removeFileDropListener: (callback: (filePaths: string[]) => void) => void;
    };
  }
}

export type ElectronAPI = Window['electronAPI'];
