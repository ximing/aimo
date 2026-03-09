import { Service } from '@rabjs/react';
import type {
  LoginDto,
  RegisterDto,
  UpdateUserDto,
  UserInfoDto,
  ChangePasswordDto,
} from '@aimo/dto';
import * as authApi from '../api/auth';
import * as userApi from '../api/user';
import { isElectron } from '../electron/isElectron';
import { setElectronToken, clearElectronToken, resolveTokenReady } from '../utils/request';

/**
 * Authentication Service
 * Manages user authentication state and operations
 * Uses HTTP Only Cookie for token authentication (web)
 * Uses Electron safeStorage for token storage (Electron desktop app)
 */
export class AuthService extends Service {
  // State
  user: UserInfoDto | null = null;
  isAuthenticated = false;

  // Promise that resolves once token is loaded (Electron only)
  private tokenReadyPromise: Promise<void> | null = null;

  constructor() {
    super();
    this.tokenReadyPromise = this.loadAuthState();
  }

  /**
   * Wait until the auth token has been loaded from secure storage.
   * Resolves immediately in browser environments.
   */
  waitForToken(): Promise<void> {
    return this.tokenReadyPromise ?? Promise.resolve();
  }

  /**
   * Load authentication state from localStorage and, in Electron, restore
   * the token from secure storage so requests can include the Authorization header.
   */
  async loadAuthState(): Promise<void> {
    const savedUser = localStorage.getItem('aimo_user');

    if (savedUser) {
      try {
        this.user = JSON.parse(savedUser);
        this.isAuthenticated = true;
      } catch (error) {
        console.error('Failed to parse saved user data:', error);
        await this.clearAuthState();
        return;
      }
    }

    // In Electron, restore token from persistent secure storage into memory cache
    if (isElectron()) {
      try {
        const result = await window.electronAPI?.secureStoreGet('auth_token');
        if (result?.success && result.value) {
          // setElectronToken resolves the tokenReadyPromise internally
          setElectronToken(result.value);
        } else {
          // No token stored — resolve the gate so requests aren't blocked
          resolveTokenReady();
          if (this.isAuthenticated) {
            await this.clearAuthState();
          }
        }
      } catch (error) {
        console.error('Failed to restore token from secure storage:', error);
        resolveTokenReady();
        await this.clearAuthState();
      }
    }
  }

  /**
   * Save authentication state to localStorage
   * Note: Token is stored in HTTP Only Cookie, only user info is saved here
   * For Electron environment, token is stored securely using OS-level encryption (safeStorage)
   */
  async saveAuthState(token: string, user: UserInfoDto) {
    this.user = user;
    this.isAuthenticated = true;

    // Only save user info to localStorage (token is in HTTP Only Cookie)
    localStorage.setItem('aimo_user', JSON.stringify(user));

    // For Electron environment, store token using secure storage (safeStorage)
    // This uses OS-level encryption (Keychain on macOS, DPAPI on Windows)
    if (isElectron() && token) {
      const result = await window.electronAPI?.secureStoreSet('auth_token', token);
      if (!result?.success) {
        console.error('Failed to store token securely:', result?.error);
      }
      // Also cache in memory for faster request interceptor access
      setElectronToken(token);
    }
  }

  /**
   * Get stored token for Electron environment (from secure storage)
   */
  async getToken(): Promise<string | null> {
    if (isElectron()) {
      const result = await window.electronAPI?.secureStoreGet('auth_token');
      if (result?.success && result.value) {
        return result.value;
      }
    }
    return null;
  }

  /**
   * Clear authentication state
   */
  async clearAuthState() {
    this.user = null;
    this.isAuthenticated = false;

    localStorage.removeItem('aimo_user');
    // For Electron environment, also clear secure token storage
    if (isElectron()) {
      await window.electronAPI?.secureStoreDelete('auth_token');
      clearElectronToken();
    }
  }

  /**
   * Login with email and password
   */
  async login(data: LoginDto) {
    try {
      const response = await authApi.login(data);

      if (response.code === 0 && response.data) {
        await this.saveAuthState(response.data.token, response.data.user);
        return { success: true };
      } else {
        return {
          success: false,
          message: response.msg || 'Login failed',
        };
      }
    } catch (error: unknown) {
      console.error('Login error:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Login failed',
      };
    }
  }

  /**
   * Register a new user
   */
  async register(data: RegisterDto) {
    try {
      const response = await authApi.register(data);

      if (response.code === 0) {
        return { success: true };
      } else {
        return {
          success: false,
          message: 'Registration failed',
        };
      }
    } catch (error: unknown) {
      console.error('Registration error:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Registration failed',
      };
    }
  }

  /**
   * Logout current user
   */
  async logout() {
    await this.clearAuthState();
  }

  /**
   * Check if user is authenticated and fetch user info
   */
  async checkAuth() {
    try {
      const response = await userApi.getUserInfo();

      if (response.code === 0 && response.data) {
        this.user = response.data;
        this.isAuthenticated = true;
        localStorage.setItem('aimo_user', JSON.stringify(response.data));
        return true;
      } else {
        this.clearAuthState();
        return false;
      }
    } catch (error: unknown) {
      console.error('Check auth error:', error);
      this.clearAuthState();
      return false;
    }
  }

  /**
   * Update user info (nickname/avatar metadata)
   */
  async updateUserInfo(data: UpdateUserDto) {
    try {
      const response = await userApi.updateUserInfo(data);

      if (response.code === 0 && response.data?.user) {
        this.user = response.data.user;
        localStorage.setItem('aimo_user', JSON.stringify(response.data.user));
        return { success: true, message: response.data.message, user: response.data.user };
      }

      return {
        success: false,
        message: response.data?.message || 'User info update failed',
      };
    } catch (error: unknown) {
      console.error('Update user info error:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'User info update failed',
      };
    }
  }

  /**
   * Upload and update user avatar
   */
  async updateAvatar(file: File) {
    try {
      const response = await userApi.uploadAvatar(file);

      if (response.code === 0 && response.data) {
        // Update local user state with new avatar
        if (this.user) {
          this.user = {
            ...this.user,
            avatar: response.data.avatar,
          };
          localStorage.setItem('aimo_user', JSON.stringify(this.user));
        }
        return { success: true, avatar: response.data.avatar };
      } else {
        return {
          success: false,
          message: 'Avatar upload failed',
        };
      }
    } catch (error: unknown) {
      console.error('Upload avatar error:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Avatar upload failed',
      };
    }
  }

  /**
   * Change user password
   */
  async changePassword(data: ChangePasswordDto) {
    try {
      const response = await userApi.changePassword(data);

      if (response.code === 0 && response.data) {
        return { success: true, message: response.data.message };
      }

      return {
        success: false,
        message: response.data?.message || 'Password change failed',
      };
    } catch (error: unknown) {
      console.error('Change password error:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Password change failed',
      };
    }
  }
}
