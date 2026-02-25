/**
 * Detect if the app is running in Electron environment
 * Checks for the presence of 'Electron' in the user agent string
 * or the presence of electronAPI (exposed by preload script)
 */
export function isElectron(): boolean {
  // First check userAgent (fast, synchronous)
  const hasElectronInUA =
    typeof navigator !== 'undefined' && navigator.userAgent.includes('Electron');
  // Also check for electronAPI (more reliable, exposed by preload script)
  const hasElectronAPI = typeof window !== 'undefined' && !!window.electronAPI;

  return hasElectronInUA || hasElectronAPI;
}

/**
 * Get the platform the app is running on
 * Returns the platform string from Electron (darwin, win32, linux)
 * or 'browser' if running in a web browser
 */
export function getPlatform(): string {
  if (!isElectron()) {
    return 'browser';
  }
  const platform = window.electronAPI?.platform;
  if (typeof platform === 'string' && platform.length > 0) {
    return platform;
  }

  return 'unknown';
}

/**
 * Check if running on macOS
 */
export function isMacOS(): boolean {
  return getPlatform() === 'darwin';
}

/**
 * Check if running on Windows
 */
export function isWindows(): boolean {
  return getPlatform() === 'win32';
}

/**
 * Check if running on Linux
 */
export function isLinux(): boolean {
  return getPlatform() === 'linux';
}

/**
 * Register a callback for when files are dropped into the Electron window
 * This only works in Electron and will be a no-op in browser
 */
export function onFileDrop(callback: (filePaths: string[]) => void): () => void {
  if (!isElectron() || !window.electronAPI?.onFileDrop) {
    // Return a no-op cleanup function for browser
    return () => {};
  }

  window.electronAPI.onFileDrop(callback);

  // Return cleanup function
  return () => {
    window.electronAPI?.removeFileDropListener?.(callback);
  };
}

/**
 * Type definition for the Electron API exposed via preload script
 */
export interface UpdateStatus {
  status: 'checking' | 'available' | 'not-available' | 'downloading' | 'downloaded' | 'error';
  version?: string;
  releaseNotes?: string;
  percent?: number;
  error?: string;
}

export interface UpdateInfo {
  version: string;
  releaseDate?: string;
  releaseNotes?: string;
}

declare global {
  interface Window {
    electronAPI?: {
      platform: string;
      getVersion: () => string;
      onFileDrop?: (callback: (filePaths: string[]) => void) => void;
      removeFileDropListener?: (callback: (filePaths: string[]) => void) => void;
      // Auto-update APIs
      checkForUpdates: () => Promise<UpdateInfo | null>;
      downloadUpdate: () => Promise<{ success: boolean }>;
      installUpdate: () => void;
      getAppVersion: () => Promise<string>;
      onUpdateStatus?: (callback: (status: UpdateStatus) => void) => void;
      removeUpdateStatusListener?: (callback: (status: UpdateStatus) => void) => void;
    };
  }
}
