// Sync missing keys from en-US.json to all other locale files
const fs = require('fs');
const path = require('path');

const localesDir = path.join(__dirname, 'src/i18n/locales');
const enUS = JSON.parse(fs.readFileSync(path.join(localesDir, 'en-US.json'), 'utf8'));

function getAllKeys(obj, prefix = '') {
  let keys = [];
  for (const key of Object.keys(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (typeof obj[key] === 'object' && obj[key] !== null) {
      keys = keys.concat(getAllKeys(obj[key], fullKey));
    } else {
      keys.push(fullKey);
    }
  }
  return keys;
}

function getNestedValue(obj, keyPath) {
  const parts = keyPath.split('.');
  let current = obj;
  for (const part of parts) {
    if (current === undefined || current === null) return undefined;
    current = current[part];
  }
  return current;
}

function setNestedValue(obj, keyPath, value) {
  const parts = keyPath.split('.');
  let current = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    if (!current[parts[i]] || typeof current[parts[i]] !== 'object') {
      current[parts[i]] = {};
    }
    current = current[parts[i]];
  }
  current[parts[parts.length - 1]] = value;
}

const enUSKeys = getAllKeys(enUS);
const files = fs.readdirSync(localesDir).filter(f => f.endsWith('.json') && f !== 'en-US.json');

for (const file of files) {
  const filePath = path.join(localesDir, file);
  const locale = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  let addedCount = 0;
  
  for (const key of enUSKeys) {
    if (getNestedValue(locale, key) === undefined) {
      setNestedValue(locale, key, getNestedValue(enUS, key));
      addedCount++;
    }
  }
  
  if (addedCount > 0) {
    fs.writeFileSync(filePath, JSON.stringify(locale, null, 2) + '\n', 'utf8');
    console.log(`${file}: added ${addedCount} missing keys`);
  } else {
    console.log(`${file}: all keys present`);
  }
}

console.log('Done!');
