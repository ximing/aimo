import { messages } from '@/config/i18n';
import { useI18nStore } from '@/stores/i18nStore';

type MessagePath = keyof typeof messages.en;

export function useTranslation() {
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

  return { t };
}
