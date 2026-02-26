import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

// Import all translation files
import enUS from './locales/en-US.json';
import enUK from './locales/en-UK.json';
import enAU from './locales/en-AU.json';
import es from './locales/es.json';
import fr from './locales/fr.json';
import de from './locales/de.json';
import it from './locales/it.json';
import ptBR from './locales/pt-BR.json';
import ja from './locales/ja.json';
import ko from './locales/ko.json';
import zhCN from './locales/zh-CN.json';
import zhTW from './locales/zh-TW.json';
import zhHK from './locales/zh-HK.json';
import hi from './locales/hi.json';
import ar from './locales/ar.json';
import ru from './locales/ru.json';
import nl from './locales/nl.json';
import sv from './locales/sv.json';
import pl from './locales/pl.json';

// Configure i18next
i18n
  .use(initReactI18next)
  .init({
    resources: {
      'en-US': { translation: enUS },
      'en-UK': { translation: enUK },
      'en-AU': { translation: enAU },
      'es': { translation: es },
      'fr': { translation: fr },
      'de': { translation: de },
      'it': { translation: it },
      'pt-BR': { translation: ptBR },
      'ja': { translation: ja },
      'ko': { translation: ko },
      'zh-CN': { translation: zhCN },
      'zh-TW': { translation: zhTW },
      'zh-HK': { translation: zhHK },
      'hi': { translation: hi },
      'ar': { translation: ar },
      'ru': { translation: ru },
      'nl': { translation: nl },
      'sv': { translation: sv },
      'pl': { translation: pl },
    },
    lng: 'en-US', // default language
    fallbackLng: 'en-US',
    interpolation: {
      escapeValue: false, // React already escapes values
    },
    react: {
      useSuspense: false, // Important for React Native
    },
  });

export default i18n;
