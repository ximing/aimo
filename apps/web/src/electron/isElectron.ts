/**
 * Electron environment detection utilities
 *
 * These utilities allow the web app to detect if it's running inside Electron
 * and access Electron-specific APIs when available.
 */

// Extend Window interface to include electronAPI
declare global {
  interface Window {
    electronAPI?: {
      platform: string;
      onMainMessage?: (callback: (message: string) => void) => void;
      removeMainMessageListener?: (callback: (message: string) => void) => void;
    };
  }
}

/**
 * Check if the app is running inside Electron
 *
 * This function safely detects the Electron environment by checking for the
 * presence of window.electronAPI which is exposed via contextBridge in the preload script.
 *
 * @returns true if running in Electron, false if running in a regular browser
 */
export function isElectron(): boolean {
  // Check for electronAPI exposed via contextBridge (preferred method)
  if (typeof window !== 'undefined' && window.electronAPI !== undefined) {
    return true;
  }

  // Fallback: Check user agent for Electron string
  if (typeof navigator !== 'undefined' && navigator.userAgent.includes('Electron')) {
    return true;
  }

  return false;
}

/**
 * Get the current platform when running in Electron
 *
 * @returns The platform string (darwin, win32, linux) or null if not in Electron
 */
export function getPlatform(): string | null {
  if (isElectron() && window.electronAPI) {
    return window.electronAPI.platform;
  }
  return null;
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
