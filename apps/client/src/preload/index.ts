import { ipcRenderer, contextBridge, IpcRendererEvent, app } from 'electron';

type MessageCallback = (message: string) => void;
type FileDropCallback = (filePaths: string[]) => void;

// Update status callback type
type UpdateStatusCallback = (status: UpdateStatus) => void;

// Update status type
export interface UpdateStatus {
  status: 'checking' | 'available' | 'not-available' | 'downloading' | 'downloaded' | 'error';
  version?: string;
  releaseNotes?: string;
  percent?: number;
  error?: string;
}

// Update info type
export interface UpdateInfo {
  version: string;
  releaseDate?: string;
  releaseNotes?: string;
}

// Store wrapped callbacks to allow proper removal
const messageCallbackMap = new Map<MessageCallback, (event: IpcRendererEvent, message: string) => void>();
const fileDropCallbackMap = new Map<FileDropCallback, (event: IpcRendererEvent, filePaths: string[]) => void>();
const updateStatusCallbackMap = new Map<UpdateStatusCallback, (event: IpcRendererEvent, status: UpdateStatus) => void>();

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

  // Auto-update APIs
  checkForUpdates: () => ipcRenderer.invoke('check-for-updates'),
  downloadUpdate: () => ipcRenderer.invoke('download-update'),
  installUpdate: () => ipcRenderer.invoke('install-update'),
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),

  // Update status listener
  onUpdateStatus: (callback: UpdateStatusCallback) => {
    const wrappedCallback = (_event: IpcRendererEvent, status: UpdateStatus) => {
      callback(status);
    };
    updateStatusCallbackMap.set(callback, wrappedCallback);
    ipcRenderer.on('update-status', wrappedCallback);
  },

  removeUpdateStatusListener: (callback: UpdateStatusCallback) => {
    const wrappedCallback = updateStatusCallbackMap.get(callback);
    if (wrappedCallback) {
      ipcRenderer.removeListener('update-status', wrappedCallback);
      updateStatusCallbackMap.delete(callback);
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
      // Auto-update APIs
      checkForUpdates: () => Promise<UpdateInfo | null>;
      downloadUpdate: () => Promise<{ success: boolean }>;
      installUpdate: () => void;
      getAppVersion: () => Promise<string>;
      onUpdateStatus: (callback: (status: UpdateStatus) => void) => void;
      removeUpdateStatusListener: (callback: (status: UpdateStatus) => void) => void;
    };
  }
}

export type ElectronAPI = Window['electronAPI'];
