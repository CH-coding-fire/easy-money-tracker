// ── Minimal i18n (key-value per language) ──────────────────────────────────
// For MVP, we use English strings directly. This file provides the structure
// for future translation support.

const translations: Record<string, Record<string, string>> = {
  'en-US': {
    'tab.add': 'Add',
    'tab.stats': 'Statistics',
    'tab.records': 'Records',
    'tab.settings': 'Settings',
    'add.title': 'Add Transaction',
    'add.expense': 'Expense',
    'add.income': 'Income',
    'add.amount': 'Amount',
    'add.category': 'Category',
    'add.date': 'Date',
    'add.recurring': 'Recurring',
    'add.oneOff': 'One-off',
    'add.title_field': 'Title (optional)',
    'add.description': 'Description (optional)',
    'add.save': 'Save',
    'stats.title': 'Statistics',
    'records.title': 'Edit Records',
    'records.search': 'Search records...',
    'settings.title': 'Settings',
    'settings.language': 'Language',
    'settings.export': 'Export Data',
    'settings.import': 'Import Data',
    'settings.debug': 'Debug Mode',
    'onboarding.welcome': 'Welcome to Easy Money Tracker!',
    'onboarding.language': 'Choose your language',
    'onboarding.currency': 'Set your main currency',
    'onboarding.done': 'Get Started',
    'common.cancel': 'Cancel',
    'common.save': 'Save',
    'common.delete': 'Delete',
    'common.edit': 'Edit',
    'common.back': 'Back',
    'common.loading': 'Loading...',
    'common.empty': 'No data yet',
    'common.error': 'An error occurred',
  },
};

let currentLanguage = 'en-US';

export function setLanguage(lang: string) {
  currentLanguage = lang;
}

export function t(key: string): string {
  return translations[currentLanguage]?.[key] ?? translations['en-US']?.[key] ?? key;
}
