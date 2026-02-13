export interface Language {
  code: string;
  label: string;
  nativeName: string;
}

export const LANGUAGES: Language[] = [
  { code: 'en-US', label: 'English (US)', nativeName: 'English (US)' },
  { code: 'en-UK', label: 'English (UK)', nativeName: 'English (UK)' },
  { code: 'en-AU', label: 'English (AU)', nativeName: 'English (AU)' },
  { code: 'es', label: 'Spanish', nativeName: 'Español' },
  { code: 'fr', label: 'French', nativeName: 'Français' },
  { code: 'de', label: 'German', nativeName: 'Deutsch' },
  { code: 'it', label: 'Italian', nativeName: 'Italiano' },
  { code: 'pt-BR', label: 'Portuguese (BR)', nativeName: 'Português (BR)' },
  { code: 'ja', label: 'Japanese', nativeName: '日本語' },
  { code: 'ko', label: 'Korean', nativeName: '한국어' },
  { code: 'zh-CN', label: 'Chinese (Simplified)', nativeName: '中文 (简体)' },
  { code: 'zh-TW', label: 'Chinese (Traditional)', nativeName: '中文 (繁體)' },
  { code: 'zh-HK', label: 'Cantonese (HK)', nativeName: '粵語 (香港)' },
  { code: 'hi', label: 'Hindi', nativeName: 'हिन्दी' },
  { code: 'ar', label: 'Arabic', nativeName: 'العربية' },
  { code: 'ru', label: 'Russian', nativeName: 'Русский' },
  { code: 'nl', label: 'Dutch', nativeName: 'Nederlands' },
  { code: 'sv', label: 'Swedish', nativeName: 'Svenska' },
  { code: 'pl', label: 'Polish', nativeName: 'Polski' },
];
