import { createContext, useContext } from 'react';
import { useI18nStore } from '@/stores/i18nStore';
import { messages } from '@/config/i18n';

interface I18nContextType {
  t: (key: string) => string;
  language: keyof typeof messages;
}

const I18nContext = createContext<I18nContextType | null>(null);

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const language = useI18nStore((state) => state.language);

  function t(path: string) {
    const keys = path.split('.');
    let current: any = messages[language];

    for (const key of keys) {
      if (current[key] === undefined) {
        console.warn(`Translation missing: ${path}`);
        return path;
      }
      current = current[key];
    }

    return current;
  }

  return (
    <I18nContext.Provider value={{ t, language }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error('useI18n must be used within an I18nProvider');
  }
  return context;
}
