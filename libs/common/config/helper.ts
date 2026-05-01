export function getStringEnv(key: string, fallback?: string): string {
  const val = process.env[key] || fallback;
  if (val === undefined) {
    throw new Error(`Environment variable ${key} is required`);
  }
  return val;
}

export function getNumberEnv(key: string, fallback?: number): number {
  const val =
    process.env[key] || (fallback !== undefined ? String(fallback) : undefined);
  if (val === undefined) {
    throw new Error(`Environment variable ${key} is required`);
  }
  const num = Number(val);
  if (isNaN(num)) {
    throw new Error(`Environment variable ${key} must be a number`);
  }
  return num;
}

export function getStringArrayEnv(key: string, fallback?: string[]): string[] {
  const val = process.env[key] || (fallback ? fallback.join(',') : undefined);
  if (val === undefined) {
    throw new Error(`Environment variable ${key} is required`);
  }
  return val.split(',').map((s) => s.trim());
}
