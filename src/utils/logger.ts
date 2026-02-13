// ── Logger ─────────────────────────────────────────────────────────────────
// Centralized logging with context. Every key operation goes through here.

type LogLevel = 'INFO' | 'WARN' | 'ERROR' | 'DEBUG';

function timestamp(): string {
  return new Date().toISOString();
}

function log(level: LogLevel, tag: string, message: string, data?: unknown) {
  const ts = timestamp();
  const prefix = `[${ts}] [${level}] [${tag}]`;
  if (data !== undefined) {
    console.log(prefix, message, JSON.stringify(data, null, 2));
  } else {
    console.log(prefix, message);
  }
}

export const logger = {
  info: (tag: string, message: string, data?: unknown) =>
    log('INFO', tag, message, data),
  warn: (tag: string, message: string, data?: unknown) =>
    log('WARN', tag, message, data),
  error: (tag: string, message: string, data?: unknown) =>
    log('ERROR', tag, message, data),
  debug: (tag: string, message: string, data?: unknown) =>
    log('DEBUG', tag, message, data),
};
