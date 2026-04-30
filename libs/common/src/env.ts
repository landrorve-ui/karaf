import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

let loaded = false;

function unquote(value: string): string {
  const trimmed = value.trim();
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1);
  }

  return trimmed;
}

export function loadLocalEnv(fileName = '.env.local'): void {
  if (loaded) {
    return;
  }

  loaded = true;
  const envPath = resolve(process.cwd(), fileName);
  if (!existsSync(envPath)) {
    return;
  }

  for (const line of readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) {
      continue;
    }

    const separator = trimmed.indexOf('=');
    if (separator === -1) {
      continue;
    }

    const key = trimmed.slice(0, separator).trim();
    const value = unquote(trimmed.slice(separator + 1));
    if (key && process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

export function getEnv(key: string, fallback: string): string {
  loadLocalEnv();
  return process.env[key] ?? fallback;
}

export function getNumberEnv(key: string, fallback: number): number {
  const value = Number(getEnv(key, String(fallback)));
  return Number.isFinite(value) ? value : fallback;
}

export function getKafkaBrokers(): string[] {
  return getEnv('KAFKA_BROKERS', 'localhost:9092')
    .split(',')
    .map((broker) => broker.trim())
    .filter(Boolean);
}
