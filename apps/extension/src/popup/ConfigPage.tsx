import { useState, useEffect } from 'react';
import { login, testConnection, getCategories, type Category } from '../api/aimo.js';
import { setConfig } from '../storage/index.js';
import { getSettings, setSettings } from '../storage/index.js';
import type { Config } from '../types/index.js';

interface ConfigPageProps {
  onConfigSaved: (config: Config) => void;
  initialErrorMessage?: string;
}

interface FormErrors {
  url?: string;
  email?: string;
  password?: string;
  token?: string;
  general?: string;
}

export function ConfigPage({ onConfigSaved, initialErrorMessage }: ConfigPageProps) {
  const [url, setUrl] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [token, setToken] = useState('');
  const [loginMethod, setLoginMethod] = useState<'password' | 'token'>('password');
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<FormErrors>(
    initialErrorMessage ? { general: initialErrorMessage } : {}
  );
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [activeTab, setActiveTab] = useState<'account' | 'settings'>('account');
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('');
  const [saveSourceUrl, setSaveSourceUrl] = useState<boolean>(true);
  const [isLoadingCategories, setIsLoadingCategories] = useState(false);

  // Detect dark mode preference
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    setIsDarkMode(mediaQuery.matches);

    const handleChange = (e: MediaQueryListEvent) => {
      setIsDarkMode(e.matches);
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  // Load saved URL from storage on mount
  useEffect(() => {
    chrome.storage.local.get(['aimo_config']).then((result) => {
      if (result.aimo_config?.url) {
        setUrl(result.aimo_config.url);
      }
    });
  }, []);

  // Load settings and categories when switching to settings tab
  useEffect(() => {
    if (activeTab === 'settings') {
      // Load saved settings
      getSettings().then((settings) => {
        setSelectedCategoryId(settings.defaultCategoryId || '');
        setSaveSourceUrl(settings.saveSourceUrl ?? true);
      });

      // Fetch categories
      setIsLoadingCategories(true);
      getCategories()
        .then((cats) => {
          setCategories(cats);
        })
        .catch((err) => {
          console.error('Failed to load categories:', err);
        })
        .finally(() => {
          setIsLoadingCategories(false);
        });
    }
  }, [activeTab]);

  // Save settings when category changes
  const handleCategoryChange = async (categoryId: string) => {
    setSelectedCategoryId(categoryId);
    const currentSettings = await getSettings();
    await setSettings({
      ...currentSettings,
      defaultCategoryId: categoryId || undefined,
    });
  };

  // Save settings when source URL toggle changes
  const handleSaveSourceUrlChange = async (enabled: boolean) => {
    setSaveSourceUrl(enabled);
    const currentSettings = await getSettings();
    await setSettings({
      ...currentSettings,
      saveSourceUrl: enabled,
    });
  };

  const validateUrl = (value: string): boolean => {
    if (!value.trim()) {
      setErrors((prev) => ({ ...prev, url: '请输入服务器地址' }));
      return false;
    }

    try {
      const urlToTest = value.startsWith('http') ? value : `https://${value}`;
      new URL(urlToTest);
      return true;
    } catch {
      setErrors((prev) => ({ ...prev, url: '请输入有效的 URL 地址' }));
      return false;
    }
  };

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    if (!url.trim()) {
      newErrors.url = '请输入服务器地址';
    } else {
      try {
        const urlToTest = url.startsWith('http') ? url : `https://${url}`;
        new URL(urlToTest);
      } catch {
        newErrors.url = '请输入有效的 URL 地址';
      }
    }

    if (loginMethod === 'password') {
      if (!email.trim()) {
        newErrors.email = '请输入用户名/邮箱';
      }

      if (!password) {
        newErrors.password = '请输入密码';
      }
    } else {
      if (!token.trim()) {
        newErrors.token = '请输入 Token';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsLoading(true);
    setErrors({});

    try {
      // Normalize URL - add https:// if no protocol specified
      const normalizedUrl = url.startsWith('http') ? url : `https://${url}`;

      let finalToken: string;
      let username: string;

      if (loginMethod === 'token') {
        // Token login - use provided token directly
        finalToken = token.trim();

        // Save config with token
        await setConfig(normalizedUrl, finalToken, 'Token 用户');
        username = 'Token 用户';
      } else {
        // Password login - call login API
        // First save the URL to config temporarily for the login call
        await setConfig(normalizedUrl, '', '');

        // Try to login
        const loginResponse = await login(email, password);
        finalToken = loginResponse.token;
        username = loginResponse.user.nickname || loginResponse.user.email;

        // Save complete config
        await setConfig(normalizedUrl, finalToken, username);
      }

      // Notify parent with saved config
      const config: Config = {
        url: normalizedUrl,
        token: finalToken,
        username,
      };

      onConfigSaved(config);
    } catch (error) {
      console.error('Login error:', error);
      if (error instanceof Error) {
        setErrors((prev) => ({ ...prev, general: error.message }));
      } else {
        setErrors((prev) => ({ ...prev, general: '登录失败，请重试' }));
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleTestConnection = async () => {
    if (!validateUrl(url)) {
      return;
    }

    setIsLoading(true);
    setErrors({});

    try {
      const normalizedUrl = url.startsWith('http') ? url : `https://${url}`;
      const isConnected = await testConnection(normalizedUrl);

      if (isConnected) {
        alert('连接成功！');
      } else {
        setErrors((prev) => ({ ...prev, url: '无法连接到服务器' }));
      }
    } catch {
      setErrors((prev) => ({ ...prev, url: '无法连接到服务器' }));
    } finally {
      setIsLoading(false);
    }
  };

  const styles: Record<string, React.CSSProperties> = {
    container: {
      padding: '20px',
      width: '320px',
      minHeight: '400px',
      backgroundColor: isDarkMode ? '#1f2937' : '#ffffff',
      color: isDarkMode ? '#f3f4f6' : '#1f2937',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    },
    header: {
      display: 'flex',
      alignItems: 'center',
      gap: '10px',
      marginBottom: '20px',
      paddingBottom: '16px',
      borderBottom: `1px solid ${isDarkMode ? '#374151' : '#e5e7eb'}`,
    },
    logo: {
      width: '32px',
      height: '32px',
      borderRadius: '8px',
      backgroundColor: '#3b82f6',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: 'white',
      fontWeight: 'bold',
      fontSize: '16px',
    },
    title: {
      fontSize: '18px',
      fontWeight: 600,
      margin: 0,
      color: isDarkMode ? '#f3f4f6' : '#1f2937',
    },
    subtitle: {
      fontSize: '13px',
      color: isDarkMode ? '#9ca3af' : '#6b7280',
      marginTop: '4px',
    },
    form: {
      display: 'flex',
      flexDirection: 'column',
      gap: '16px',
    },
    fieldGroup: {
      display: 'flex',
      flexDirection: 'column',
      gap: '6px',
    },
    label: {
      fontSize: '14px',
      fontWeight: 500,
      color: isDarkMode ? '#d1d5db' : '#374151',
    },
    input: {
      padding: '10px 12px',
      fontSize: '14px',
      borderRadius: '8px',
      border: `1px solid ${isDarkMode ? '#4b5563' : '#d1d5db'}`,
      backgroundColor: isDarkMode ? '#374151' : '#ffffff',
      color: isDarkMode ? '#f3f4f6' : '#1f2937',
      outline: 'none',
      transition: 'border-color 0.2s, box-shadow 0.2s',
    },
    inputError: {
      borderColor: '#ef4444',
    },
    errorText: {
      fontSize: '12px',
      color: '#ef4444',
      marginTop: '2px',
    },
    generalError: {
      padding: '10px 12px',
      backgroundColor: isDarkMode ? '#450a0a' : '#fef2f2',
      border: `1px solid ${isDarkMode ? '#7f1d1d' : '#fecaca'}`,
      borderRadius: '8px',
      fontSize: '13px',
      color: isDarkMode ? '#fca5a5' : '#dc2626',
    },
    testButton: {
      padding: '8px 12px',
      fontSize: '13px',
      color: '#3b82f6',
      backgroundColor: 'transparent',
      border: 'none',
      cursor: 'pointer',
      textAlign: 'left' as const,
      marginTop: '-10px',
    },
    submitButton: {
      padding: '12px 16px',
      fontSize: '14px',
      fontWeight: 500,
      color: '#ffffff',
      backgroundColor: '#3b82f6',
      border: 'none',
      borderRadius: '8px',
      cursor: isLoading ? 'not-allowed' : 'pointer',
      opacity: isLoading ? 0.6 : 1,
      transition: 'background-color 0.2s',
      marginTop: '8px',
    },
    footer: {
      marginTop: '20px',
      paddingTop: '16px',
      borderTop: `1px solid ${isDarkMode ? '#374151' : '#e5e7eb'}`,
      fontSize: '12px',
      color: isDarkMode ? '#9ca3af' : '#6b7280',
      textAlign: 'center' as const,
    },
    tabs: {
      display: 'flex',
      gap: '8px',
      marginBottom: '16px',
    },
    tab: {
      flex: 1,
      padding: '10px 16px',
      fontSize: '14px',
      fontWeight: 500,
      borderRadius: '8px',
      border: 'none',
      cursor: 'pointer',
      backgroundColor: isDarkMode ? '#374151' : '#f3f4f6',
      color: isDarkMode ? '#d1d5db' : '#374151',
    },
    tabActive: {
      backgroundColor: '#3b82f6',
      color: '#ffffff',
    },
    select: {
      padding: '10px 12px',
      fontSize: '14px',
      borderRadius: '8px',
      border: `1px solid ${isDarkMode ? '#4b5563' : '#d1d5db'}`,
      backgroundColor: isDarkMode ? '#374151' : '#ffffff',
      color: isDarkMode ? '#f3f4f6' : '#1f2937',
      outline: 'none',
      cursor: 'pointer',
    },
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div style={styles.logo}>A</div>
        <div>
          <h1 style={styles.title}>AIMO 知识库</h1>
          <div style={styles.subtitle}>配置服务器连接</div>
        </div>
      </div>

      {/* Tab navigation */}
      <div style={styles.tabs}>
        <button
          type="button"
          onClick={() => setActiveTab('account')}
          style={{
            ...styles.tab,
            ...(activeTab === 'account' ? styles.tabActive : {}),
          }}
        >
          账号
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('settings')}
          style={{
            ...styles.tab,
            ...(activeTab === 'settings' ? styles.tabActive : {}),
          }}
        >
          设置
        </button>
      </div>

      {activeTab === 'account' ? (
        <form onSubmit={handleSubmit} style={styles.form}>
          {errors.general && <div style={styles.generalError}>{errors.general}</div>}

          <div style={styles.fieldGroup}>
            <label htmlFor="url" style={styles.label}>
              服务器地址
            </label>
            <input
              id="url"
              type="text"
              value={url}
              onChange={(e) => {
                setUrl(e.target.value);
                if (errors.url) {
                  setErrors((prev) => ({ ...prev, url: undefined }));
                }
              }}
              placeholder="https://aimo.example.com"
              style={{
                ...styles.input,
                ...(errors.url ? styles.inputError : {}),
              }}
              disabled={isLoading}
            />
            {errors.url ? (
              <span style={styles.errorText}>{errors.url}</span>
            ) : (
              <button
                type="button"
                onClick={handleTestConnection}
                style={styles.testButton}
                disabled={isLoading}
              >
                测试连接
              </button>
            )}
          </div>

          {/* Login method toggle */}
          <div style={styles.fieldGroup}>
            <div
              style={{
                display: 'flex',
                gap: '8px',
                marginBottom: '4px',
              }}
            >
              <button
                type="button"
                onClick={() => setLoginMethod('password')}
                style={{
                  flex: 1,
                  padding: '8px 12px',
                  fontSize: '13px',
                  fontWeight: 500,
                  borderRadius: '6px',
                  border: 'none',
                  cursor: isLoading ? 'not-allowed' : 'pointer',
                  backgroundColor:
                    loginMethod === 'password' ? '#3b82f6' : isDarkMode ? '#374151' : '#e5e7eb',
                  color:
                    loginMethod === 'password' ? '#ffffff' : isDarkMode ? '#d1d5db' : '#374151',
                  opacity: isLoading ? 0.6 : 1,
                }}
                disabled={isLoading}
              >
                密码登录
              </button>
              <button
                type="button"
                onClick={() => setLoginMethod('token')}
                style={{
                  flex: 1,
                  padding: '8px 12px',
                  fontSize: '13px',
                  fontWeight: 500,
                  borderRadius: '6px',
                  border: 'none',
                  cursor: isLoading ? 'not-allowed' : 'pointer',
                  backgroundColor:
                    loginMethod === 'token' ? '#3b82f6' : isDarkMode ? '#374151' : '#e5e7eb',
                  color: loginMethod === 'token' ? '#ffffff' : isDarkMode ? '#d1d5db' : '#374151',
                  opacity: isLoading ? 0.6 : 1,
                }}
                disabled={isLoading}
              >
                Token 登录
              </button>
            </div>
          </div>

          {loginMethod === 'password' ? (
            <>
              <div style={styles.fieldGroup}>
                <label htmlFor="email" style={styles.label}>
                  用户名 / 邮箱
                </label>
                <input
                  id="email"
                  type="text"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (errors.email) {
                      setErrors((prev) => ({ ...prev, email: undefined }));
                    }
                  }}
                  placeholder="your@email.com"
                  style={{
                    ...styles.input,
                    ...(errors.email ? styles.inputError : {}),
                  }}
                  disabled={isLoading}
                />
                {errors.email && <span style={styles.errorText}>{errors.email}</span>}
              </div>

              <div style={styles.fieldGroup}>
                <label htmlFor="password" style={styles.label}>
                  密码
                </label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (errors.password) {
                      setErrors((prev) => ({ ...prev, password: undefined }));
                    }
                  }}
                  placeholder="••••••••"
                  style={{
                    ...styles.input,
                    ...(errors.password ? styles.inputError : {}),
                  }}
                  disabled={isLoading}
                />
                {errors.password && <span style={styles.errorText}>{errors.password}</span>}
              </div>
            </>
          ) : (
            <div style={styles.fieldGroup}>
              <label htmlFor="token" style={styles.label}>
                Token
              </label>
              <input
                id="token"
                type="password"
                value={token}
                onChange={(e) => {
                  setToken(e.target.value);
                  if (errors.token) {
                    setErrors((prev) => ({ ...prev, token: undefined }));
                  }
                }}
                placeholder="请输入您的 API Token"
                style={{
                  ...styles.input,
                  ...(errors.token ? styles.inputError : {}),
                }}
                disabled={isLoading}
              />
              {errors.token && <span style={styles.errorText}>{errors.token}</span>}
            </div>
          )}

          <button
            type="submit"
            style={styles.submitButton}
            disabled={isLoading}
            onMouseEnter={(e) => {
              if (!isLoading) {
                e.currentTarget.style.backgroundColor = '#2563eb';
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#3b82f6';
            }}
          >
            {isLoading ? '登录中...' : '登录'}
          </button>
        </form>
      ) : (
        <div style={styles.form}>
          {/* Settings Tab */}
          <div style={styles.fieldGroup}>
            <label style={styles.label}>默认分类</label>
            <select
              value={selectedCategoryId}
              onChange={(e) => handleCategoryChange(e.target.value)}
              style={styles.select}
              disabled={isLoadingCategories}
            >
              <option value="">不选择分类</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
            <span
              style={{
                fontSize: '12px',
                color: isDarkMode ? '#9ca3af' : '#6b7280',
                marginTop: '4px',
              }}
            >
              保存内容时将使用此分类
            </span>
          </div>

          {isLoadingCategories && (
            <div style={{ fontSize: '13px', color: isDarkMode ? '#9ca3af' : '#6b7280' }}>
              加载分类中...
            </div>
          )}

          {/* Save Source URL Toggle */}
          <div style={{ ...styles.fieldGroup, marginTop: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <label style={styles.label}>保存来源网址</label>
              <button
                type="button"
                onClick={() => handleSaveSourceUrlChange(!saveSourceUrl)}
                style={{
                  width: '44px',
                  height: '24px',
                  borderRadius: '12px',
                  border: 'none',
                  cursor: 'pointer',
                  backgroundColor: saveSourceUrl ? '#3b82f6' : isDarkMode ? '#4b5563' : '#d1d5db',
                  position: 'relative',
                  transition: 'background-color 0.2s',
                }}
              >
                <div
                  style={{
                    width: '20px',
                    height: '20px',
                    borderRadius: '50%',
                    backgroundColor: '#ffffff',
                    position: 'absolute',
                    top: '2px',
                    left: saveSourceUrl ? '22px' : '2px',
                    transition: 'left 0.2s',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                  }}
                />
              </button>
            </div>
            <span
              style={{
                fontSize: '12px',
                color: isDarkMode ? '#9ca3af' : '#6b7280',
                marginTop: '4px',
              }}
            >
              保存网页内容时记录来源网址
            </span>
          </div>
        </div>
      )}

      <div style={styles.footer}>首次使用？请先配置您的 AIMO 服务器地址</div>
    </div>
  );
}
