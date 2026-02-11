import { Service } from '@rabjs/react';

export type ThemeMode = 'light' | 'dark';

/**
 * Theme Service
 * Manages application theme (light/dark mode)
 */
export class ThemeService extends Service {
  // State
  theme: ThemeMode = 'light';

  constructor() {
    super();
    this.loadTheme();
  }

  /**
   * Load theme preference from localStorage
   */
  loadTheme() {
    const savedTheme = localStorage.getItem('aimo_theme') as ThemeMode | null;

    if (savedTheme) {
      this.theme = savedTheme;
    } else {
      // Check system preference
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      this.theme = prefersDark ? 'dark' : 'light';
    }

    this.applyTheme();
  }

  /**
   * Apply theme to document
   */
  applyTheme() {
    const htmlElement = document.documentElement;

    if (this.theme === 'dark') {
      htmlElement.classList.add('dark');
    } else {
      htmlElement.classList.remove('dark');
    }

    localStorage.setItem('aimo_theme', this.theme);
  }

  /**
   * Toggle between light and dark theme
   */
  toggleTheme() {
    this.theme = this.theme === 'light' ? 'dark' : 'light';
    this.applyTheme();
  }

  /**
   * Set specific theme
   */
  setTheme(theme: ThemeMode) {
    this.theme = theme;
    this.applyTheme();
  }

  /**
   * Check if current theme is dark
   */
  isDark(): boolean {
    return this.theme === 'dark';
  }
}
