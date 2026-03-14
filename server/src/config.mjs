import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, isAbsolute, resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = resolve(__dirname, '..');
const envPath = join(rootDir, '.env');

loadEnvFile(envPath);

function loadEnvFile(path) {
  if (!existsSync(path)) {
    return;
  }

  const content = readFileSync(path, 'utf8');
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) {
      continue;
    }

    const separatorIndex = trimmed.indexOf('=');
    if (separatorIndex <= 0) {
      continue;
    }

    const key = trimmed.slice(0, separatorIndex).trim();
    const value = trimmed.slice(separatorIndex + 1).trim().replace(/^['"]|['"]$/g, '');
    if (!key || process.env[key] !== undefined) {
      continue;
    }

    process.env[key] = value;
  }
}

export function getEnv(name, fallback = '') {
  const value = process.env[name];
  return typeof value === 'string' && value.trim() ? value.trim() : fallback;
}

function getEnvList(name, fallback = []) {
  const value = getEnv(name, '');
  if (!value) {
    return fallback;
  }

  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function getEnvNumber(name, fallback) {
  const value = Number(getEnv(name, String(fallback)));
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

function getRequiredEnv(name, { disallow = [] } = {}) {
  const value = getEnv(name, '');
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  if (disallow.includes(value)) {
    throw new Error(`Unsafe value for environment variable: ${name}`);
  }

  return value;
}

function getDatabaseConfig() {
  const client = getEnv('DATABASE_CLIENT', 'sqlite').toLowerCase();
  if (!['sqlite', 'mysql'].includes(client)) {
    throw new Error(`Unsupported DATABASE_CLIENT: ${client}`);
  }

  const database = {
    client,
    host: getEnv('DATABASE_HOST', '127.0.0.1'),
    port: Number(getEnv('DATABASE_PORT', '3306')),
    user: getEnv('DATABASE_USER', ''),
    password: getEnv('DATABASE_PASSWORD', ''),
    name: getEnv('DATABASE_NAME', 'youji'),
  };

  if (client === 'mysql') {
    if (!database.host) {
      throw new Error('Missing required environment variable for MySQL: DATABASE_HOST');
    }
    if (!database.user) {
      throw new Error('Missing required environment variable for MySQL: DATABASE_USER');
    }
    if (!database.password) {
      throw new Error('Missing required environment variable for MySQL: DATABASE_PASSWORD');
    }
    if (!database.name) {
      throw new Error('Missing required environment variable for MySQL: DATABASE_NAME');
    }
  }

  return database;
}

export const config = {
  port: Number(getEnv('PORT', '9090')),
  rootDir,
  admin: {
    username: getRequiredEnv('ADMIN_USERNAME'),
    password: getRequiredEnv('ADMIN_PASSWORD', { disallow: ['change-me'] }),
    tokenSecret: getRequiredEnv('ADMIN_TOKEN_SECRET', { disallow: ['change-me-too'] }),
  },
  ai: {
    baseUrl: getEnv('AI_BASE_URL', ''),
    apiKey: getEnv('AI_API_KEY', ''),
    model: getEnv('AI_MODEL', ''),
  },
  database: getDatabaseConfig(),
  security: {
    corsAllowedOrigins: getEnvList('CORS_ALLOW_ORIGINS', [
      'http://127.0.0.1:3000',
      'http://localhost:3000',
      'http://127.0.0.1:5173',
      'http://localhost:5173',
      'http://127.0.0.1:9090',
      'http://localhost:9090',
      'http://localhost',
      'https://localhost',
      'capacitor://localhost',
    ]),
    bodyLimitBytes: getEnvNumber('MAX_BODY_SIZE_BYTES', 1024 * 1024),
    rateLimitWindowMs: getEnvNumber('RATE_LIMIT_WINDOW_MS', 60 * 1000),
    rateLimitMaxRequests: getEnvNumber('RATE_LIMIT_MAX_REQUESTS', 60),
  },
};

const dataDirValue = getEnv('DATA_DIR', './data');
export const dataDir = isAbsolute(dataDirValue)
  ? dataDirValue
  : resolve(rootDir, dataDirValue);

mkdirSync(dataDir, { recursive: true });

export function ensureJsonFile(filename, fallbackValue) {
  const path = join(dataDir, filename);
  if (!existsSync(path)) {
    writeFileSync(path, JSON.stringify(fallbackValue, null, 2), 'utf8');
  }
  return path;
}

export function readJsonFile(filename, fallbackValue) {
  const path = ensureJsonFile(filename, fallbackValue);
  try {
    return JSON.parse(readFileSync(path, 'utf8'));
  } catch {
    return fallbackValue;
  }
}

export function writeJsonFile(filename, value) {
  const path = join(dataDir, filename);
  writeFileSync(path, JSON.stringify(value, null, 2), 'utf8');
}
