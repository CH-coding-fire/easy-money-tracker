// ── UUID generation using expo-crypto ──────────────────────────────────────
import * as Crypto from 'expo-crypto';

/**
 * Generate a UUID v4 using expo-crypto (React Native compatible)
 */
export function generateUUID(): string {
  return Crypto.randomUUID();
}
