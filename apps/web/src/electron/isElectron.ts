/**
 * Detect if the app is running in Electron environment
 * Checks for the presence of 'Electron' in the user agent string
 */
export function isElectron(): boolean {
  return typeof navigator !== 'undefined' && navigator.userAgent.includes('Electron');
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
  return window.electronAPI?.platform || 'unknown';
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
declare global {
  interface Window {
    electronAPI?: {
      platform: string;
      onFileDrop?: (callback: (filePaths: string[]) => void) => void;
      removeFileDropListener?: (callback: (filePaths: string[]) => void) => void;
    };
  }
}
