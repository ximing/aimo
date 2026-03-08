import { app, ipcMain, safeStorage } from 'electron';

import { checkForUpdates, downloadUpdate, installUpdate } from './updater';

// In-memory token storage (encrypted with safeStorage)
let encryptedToken: string | null = null;

export function registerIpcHandlers(): void {
  ipcMain.handle('log-preload', (_event, data) => {
    console.log('[Preload] Debug info:', data);
    return { success: true };
  });

  // Secure storage for auth token (uses OS-level encryption)
  ipcMain.handle('secure-store-set', (_event, { key, value }: { key: string; value: string }) => {
    try {
      if (key === 'auth_token') {
        // Encrypt the token using OS-level encryption
        if (safeStorage.isEncryptionAvailable()) {
          const encrypted = safeStorage.encryptString(value);
          encryptedToken = encrypted.toString('base64');
          return { success: true };
        } else {
          // Fallback to plaintext if encryption is not available (rare)
          console.warn('safeStorage encryption not available, using plaintext storage');
          encryptedToken = value;
          return { success: true, warning: 'encryption_not_available' };
        }
      }
      return { success: false, error: 'Unknown key' };
    } catch (error) {
      console.error('Failed to store secure value:', error);
      return { success: false, error: String(error) };
    }
  });

  ipcMain.handle('secure-store-get', (_event, { key }: { key: string }) => {
    try {
      if (key === 'auth_token' && encryptedToken) {
        if (safeStorage.isEncryptionAvailable()) {
          // Decrypt the token
          const buffer = Buffer.from(encryptedToken, 'base64');
          const decrypted = safeStorage.decryptString(buffer);
          return { success: true, value: decrypted };
        } else {
          // Return plaintext if encryption was not available when storing
          return { success: true, value: encryptedToken };
        }
      }
      return { success: true, value: null };
    } catch (error) {
      console.error('Failed to get secure value:', error);
      return { success: false, error: String(error), value: null };
    }
  });

  ipcMain.handle('secure-store-delete', (_event, { key }: { key: string }) => {
    try {
      if (key === 'auth_token') {
        encryptedToken = null;
        return { success: true };
      }
      return { success: false, error: 'Unknown key' };
    } catch (error) {
      console.error('Failed to delete secure value:', error);
      return { success: false, error: String(error) };
    }
  });

  ipcMain.handle('check-for-updates', async () => {
    return await checkForUpdates();
  });

  ipcMain.handle('download-update', async () => {
    await downloadUpdate();
    return { success: true };
  });

  ipcMain.handle('install-update', () => {
    installUpdate();
  });

  ipcMain.handle('get-app-version', () => {
    return app.getVersion();
  });
}
