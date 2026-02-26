import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useSettings } from './useSettings';
import i18n from '../i18n';

/**
 * Custom hook that synchronizes the user's language setting with i18next
 * and returns the translation function
 */
export function useI18n() {
  const settings = useSettings();
  const translation = useTranslation();
  
  // Sync language setting with i18n
  useEffect(() => {
    if (settings.language && settings.language !== i18n.language) {
      i18n.changeLanguage(settings.language);
    }
  }, [settings.language]);
  
  return translation;
}
