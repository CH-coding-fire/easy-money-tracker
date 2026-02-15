export interface Language {
  code: string;
  label: string;
  nativeName: string;
  flag: string;
}

export const LANGUAGES: Language[] = [
  { code: 'en-US', label: 'English (US)', nativeName: 'English (US)', flag: '🇺🇸' },
  { code: 'en-UK', label: 'English (UK)', nativeName: 'English (UK)', flag: '🇬🇧' },
  { code: 'en-AU', label: 'English (AU)', nativeName: 'English (AU)', flag: '🇦🇺' },
  { code: 'es', label: 'Spanish', nativeName: 'Español', flag: '🇪🇸' },
  { code: 'fr', label: 'French', nativeName: 'Français', flag: '🇫🇷' },
  { code: 'de', label: 'German', nativeName: 'Deutsch', flag: '🇩🇪' },
  { code: 'it', label: 'Italian', nativeName: 'Italiano', flag: '🇮🇹' },
  { code: 'pt-BR', label: 'Portuguese (BR)', nativeName: 'Português (BR)', flag: '🇧🇷' },
  { code: 'ja', label: 'Japanese', nativeName: '日本語', flag: '🇯🇵' },
  { code: 'ko', label: 'Korean', nativeName: '한국어', flag: '🇰🇷' },
  { code: 'zh-CN', label: 'Chinese (Simplified)', nativeName: '中文 (简体)', flag: '🇨🇳' },
  { code: 'zh-TW', label: 'Chinese (Traditional)', nativeName: '中文 (繁體)', flag: '🇹🇼' },
  { code: 'zh-HK', label: 'Cantonese (HK)', nativeName: '粵語 (香港)', flag: '🇭🇰' },
  { code: 'hi', label: 'Hindi', nativeName: 'हिन्दी', flag: '🇮🇳' },
  { code: 'ar', label: 'Arabic', nativeName: 'العربية', flag: '🇸🇦' },
  { code: 'ru', label: 'Russian', nativeName: 'Русский', flag: '🇷🇺' },
  { code: 'nl', label: 'Dutch', nativeName: 'Nederlands', flag: '🇳🇱' },
  { code: 'sv', label: 'Swedish', nativeName: 'Svenska', flag: '🇸🇪' },
  { code: 'pl', label: 'Polish', nativeName: 'Polski', flag: '🇵🇱' },
];
