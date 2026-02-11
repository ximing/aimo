import { Service } from '@rabjs/react';
import type { LoginDto, RegisterDto, UserInfoDto } from '@aimo/dto';
import * as authApi from '../api/auth';
import * as userApi from '../api/user';

/**
 * Authentication Service
 * Manages user authentication state and operations
 */
export class AuthService extends Service {
  // State
  token: string | null = null;
  user: UserInfoDto | null = null;
  isAuthenticated = false;

  constructor() {
    super();
    // Load auth state from localStorage on init
    this.loadAuthState();
  }

  /**
   * Load authentication state from localStorage
   */
  loadAuthState() {
    const savedToken = localStorage.getItem('aimo_token');
    const savedUser = localStorage.getItem('aimo_user');

    if (savedToken && savedUser) {
      try {
        this.token = savedToken;
        this.user = JSON.parse(savedUser);
        this.isAuthenticated = true;
      } catch (error) {
        console.error('Failed to parse saved user data:', error);
        this.clearAuthState();
      }
    }
  }

  /**
   * Save authentication state to localStorage
   */
  saveAuthState(token: string, user: UserInfoDto) {
    this.token = token;
    this.user = user;
    this.isAuthenticated = true;

    localStorage.setItem('aimo_token', token);
    localStorage.setItem('aimo_user', JSON.stringify(user));
  }

  /**
   * Clear authentication state
   */
  clearAuthState() {
    this.token = null;
    this.user = null;
    this.isAuthenticated = false;

    localStorage.removeItem('aimo_token');
    localStorage.removeItem('aimo_user');
  }

  /**
   * Login with email and password
   */
  async login(data: LoginDto) {
    try {
      const response = await authApi.login(data);

      if (response.code === 0 && response.data) {
        this.saveAuthState(response.data.token, response.data.user);
        return { success: true };
      } else {
        return {
          success: false,
          message: 'Login failed',
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
  logout() {
    this.clearAuthState();
  }

  /**
   * Check if user is authenticated and fetch user info
   */
  async checkAuth() {
    if (!this.token) {
      return false;
    }

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
}
