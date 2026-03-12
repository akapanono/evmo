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

export const config = {
  port: Number(getEnv('PORT', '9090')),
  rootDir,
  admin: {
    username: getEnv('ADMIN_USERNAME', 'admin'),
    password: getEnv('ADMIN_PASSWORD', 'change-me'),
    tokenSecret: getEnv('ADMIN_TOKEN_SECRET', 'change-me-too'),
  },
  ai: {
    baseUrl: getEnv('AI_BASE_URL', ''),
    apiKey: getEnv('AI_API_KEY', ''),
    model: getEnv('AI_MODEL', ''),
  },
  database: {
    client: getEnv('DATABASE_CLIENT', 'sqlite').toLowerCase(),
    host: getEnv('DATABASE_HOST', '127.0.0.1'),
    port: Number(getEnv('DATABASE_PORT', '3306')),
    user: getEnv('DATABASE_USER', ''),
    password: getEnv('DATABASE_PASSWORD', ''),
    name: getEnv('DATABASE_NAME', 'youji'),
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
