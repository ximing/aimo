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

/**
 * Authentication Service
 * Manages user authentication state and operations.
 * The token stays in an HTTP-only cookie. Only the user profile is kept locally.
 */
export class AuthService extends Service {
  // State
  user: UserInfoDto | null = null;
  isAuthenticated = false;

  constructor() {
    super();
    void this.loadAuthState();
  }

  /**
   * Load authentication state from localStorage.
   * The session cookie is sent by the browser on later requests.
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
  }

  /**
   * Save the user profile. The token stays in the HTTP-only cookie.
   */
  async saveAuthState(_token: string, user: UserInfoDto) {
    this.user = user;
    this.isAuthenticated = true;
    localStorage.setItem('aimo_user', JSON.stringify(user));
  }

  /**
   * Clear authentication state
   */
  async clearAuthState() {
    this.user = null;
    this.isAuthenticated = false;
    localStorage.removeItem('aimo_user');
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
