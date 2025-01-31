import type { ThemeConfig } from 'antd'

export const lightTheme: ThemeConfig = {
  token: {
    colorPrimary: '#42b883',
    borderRadius: 4,
    colorBgContainer: '#ffffff',
    colorBgLayout: '#f0f2f5'
  }
}

export const darkTheme: ThemeConfig = {
  token: {
    colorPrimary: '#42b883',
    borderRadius: 4,
    colorBgContainer: '#141414',
    colorBgLayout: '#000000',
    colorText: '#ffffff',
    colorTextSecondary: 'rgba(255, 255, 255, 0.65)'
  }
}

export const themeConfig = {
  light: lightTheme,
  dark: darkTheme
} 