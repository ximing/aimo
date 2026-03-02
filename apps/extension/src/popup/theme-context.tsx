import { createContext, useContext } from 'react';

// Theme context
export interface ThemeContextType {
  isDarkMode: boolean;
  theme: 'light' | 'dark' | 'system';
  setTheme: (theme: 'light' | 'dark' | 'system') => void;
}

export const ThemeContext = createContext<ThemeContextType>({
  isDarkMode: false,
  theme: 'system',
  setTheme: () => {},
});

export const useTheme = () => useContext(ThemeContext);
