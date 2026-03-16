import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { dataDir, readJsonFile } from '../config.mjs';

const DB_FILENAME = 'youji.sqlite';
const dbPath = join(dataDir, DB_FILENAME);

mkdirSync(dataDir, { recursive: true });

const db = new DatabaseSync(dbPath);
db.exec('PRAGMA journal_mode = WAL;');
db.exec('PRAGMA foreign_keys = ON;');

function normalizeParams(params = []) {
  if (Array.isArray(params)) {
    return { kind: 'positional', value: params };
  }

  if (params && typeof params === 'object') {
    return { kind: 'named', value: params };
  }

  return { kind: 'positional', value: [] };
}

export function getDb() {
  return db;
}

export function queryAll(sql, params = []) {
  const normalized = normalizeParams(params);
  return normalized.kind === 'named'
    ? db.prepare(sql).all(normalized.value)
    : db.prepare(sql).all(...normalized.value);
}

export function queryOne(sql, params = []) {
  const normalized = normalizeParams(params);
  return normalized.kind === 'named'
    ? db.prepare(sql).get(normalized.value)
    : db.prepare(sql).get(...normalized.value);
}

export function execute(sql, params = []) {
  const normalized = normalizeParams(params);
  return normalized.kind === 'named'
    ? db.prepare(sql).run(normalized.value)
    : db.prepare(sql).run(...normalized.value);
}

export async function runInTransaction(callback) {
  db.exec('BEGIN');
  try {
    const result = await callback({
      queryAll,
      queryOne,
      execute,
    });
    db.exec('COMMIT');
    return result;
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  }
}

export function runMigrations() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS admins (
      id TEXT PRIMARY KEY,
      username TEXT NOT NULL UNIQUE,
      role TEXT NOT NULL DEFAULT 'super_admin',
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT,
      name TEXT,
      phone TEXT,
      email TEXT,
      status TEXT NOT NULL DEFAULT 'active',
      is_member INTEGER NOT NULL DEFAULT 0,
      password_hash TEXT,
      security_question_1 TEXT,
      security_answer_hash_1 TEXT,
      security_question_2 TEXT,
      security_answer_hash_2 TEXT,
      security_question_3 TEXT,
      security_answer_hash_3 TEXT,
      wechat_open_id TEXT,
      qq_open_id TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS user_settings (
      user_id TEXT PRIMARY KEY,
      settings_json TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS friends (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      name TEXT NOT NULL,
      nickname TEXT,
      relationship TEXT,
      birthday TEXT,
      gender TEXT,
      age INTEGER,
      height_cm INTEGER,
      weight_kg INTEGER,
      city TEXT,
      hometown TEXT,
      occupation TEXT,
      company TEXT,
      school TEXT,
      major TEXT,
      avatar_color TEXT,
      avatar_preset TEXT,
      avatar_image TEXT,
      last_contact_date TEXT,
      last_viewed_at TEXT,
      is_important INTEGER NOT NULL DEFAULT 0,
      notes TEXT NOT NULL DEFAULT '',
      preferences_json TEXT NOT NULL DEFAULT '[]',
      birthday_recommendation_json TEXT,
      ai_profile_json TEXT NOT NULL DEFAULT '{}',
      contact_count INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS friend_preference_items (
      id TEXT PRIMARY KEY,
      friend_id TEXT NOT NULL,
      category TEXT NOT NULL,
      value TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (friend_id) REFERENCES friends(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS friend_basic_info_fields (
      id TEXT PRIMARY KEY,
      friend_id TEXT NOT NULL,
      label TEXT NOT NULL,
      value TEXT NOT NULL,
      created_at TEXT NOT NULL,
      source_text TEXT NOT NULL DEFAULT '',
      FOREIGN KEY (friend_id) REFERENCES friends(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS friend_custom_fields (
      id TEXT PRIMARY KEY,
      friend_id TEXT NOT NULL,
      label TEXT NOT NULL,
      value TEXT NOT NULL,
      created_at TEXT NOT NULL,
      include_in_timeline INTEGER NOT NULL DEFAULT 0,
      semantic_type TEXT NOT NULL DEFAULT 'note',
      temporal_scope TEXT NOT NULL DEFAULT 'stable',
      extraction_method TEXT NOT NULL DEFAULT 'manual',
      source_text TEXT NOT NULL DEFAULT '',
      event_time_text TEXT,
      FOREIGN KEY (friend_id) REFERENCES friends(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS memorial_days (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      name TEXT NOT NULL,
      month_day TEXT NOT NULL,
      note TEXT,
      recommendation_json TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS memorial_day_friends (
      memorial_day_id TEXT NOT NULL,
      friend_id TEXT NOT NULL,
      PRIMARY KEY (memorial_day_id, friend_id),
      FOREIGN KEY (memorial_day_id) REFERENCES memorial_days(id) ON DELETE CASCADE,
      FOREIGN KEY (friend_id) REFERENCES friends(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS products (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      category TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'draft',
      price_bucket TEXT NOT NULL,
      price_label TEXT NOT NULL DEFAULT '',
      attributes_json TEXT NOT NULL DEFAULT '[]',
      tags_json TEXT NOT NULL DEFAULT '[]',
      match_dimensions_json TEXT NOT NULL DEFAULT '[]',
      target_relationships_json TEXT NOT NULL DEFAULT '[]',
      gift_scenes_json TEXT NOT NULL DEFAULT '[]',
      recipient_styles_json TEXT NOT NULL DEFAULT '[]',
      risk_level TEXT NOT NULL DEFAULT 'medium',
      link TEXT NOT NULL DEFAULT '',
      summary TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS system_config (
      config_key TEXT PRIMARY KEY,
      value_json TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS recommendation_snapshots (
      id TEXT PRIMARY KEY,
      friend_id TEXT,
      memorial_day_id TEXT,
      occasion_type TEXT NOT NULL,
      recommendation_json TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (friend_id) REFERENCES friends(id) ON DELETE CASCADE,
      FOREIGN KEY (memorial_day_id) REFERENCES memorial_days(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS ai_request_logs (
      id TEXT PRIMARY KEY,
      scene TEXT NOT NULL,
      provider TEXT,
      model TEXT,
      request_json TEXT,
      response_preview TEXT,
      error_message TEXT,
      status TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_products_status ON products(status);
    CREATE INDEX IF NOT EXISTS idx_friends_name ON friends(name);
    CREATE INDEX IF NOT EXISTS idx_memorial_days_month_day ON memorial_days(month_day);
    CREATE INDEX IF NOT EXISTS idx_ai_request_logs_created_at ON ai_request_logs(created_at);
  `);

  ensureUsersTableShape();
  ensureProductsTableShape();

  migrateLegacyJsonData();
}

function ensureUsersTableShape() {
  addColumnIfMissing('users', 'username', 'TEXT');
  addColumnIfMissing('users', 'is_member', 'INTEGER NOT NULL DEFAULT 0');
  addColumnIfMissing('users', 'password_hash', 'TEXT');
  addColumnIfMissing('users', 'security_question_1', 'TEXT');
  addColumnIfMissing('users', 'security_answer_hash_1', 'TEXT');
  addColumnIfMissing('users', 'security_question_2', 'TEXT');
  addColumnIfMissing('users', 'security_answer_hash_2', 'TEXT');
  addColumnIfMissing('users', 'security_question_3', 'TEXT');
  addColumnIfMissing('users', 'security_answer_hash_3', 'TEXT');
  addColumnIfMissing('users', 'wechat_open_id', 'TEXT');
  addColumnIfMissing('users', 'qq_open_id', 'TEXT');
  addColumnIfMissing('users', 'updated_at', "TEXT NOT NULL DEFAULT ''");
  db.exec('CREATE UNIQUE INDEX IF NOT EXISTS idx_users_username_unique ON users(username);');
  db.exec('CREATE UNIQUE INDEX IF NOT EXISTS idx_users_phone_unique ON users(phone);');
  db.exec('CREATE UNIQUE INDEX IF NOT EXISTS idx_users_wechat_open_id_unique ON users(wechat_open_id);');
  db.exec('CREATE UNIQUE INDEX IF NOT EXISTS idx_users_qq_open_id_unique ON users(qq_open_id);');
}

function ensureProductsTableShape() {
  addColumnIfMissing('products', 'attributes_json', "TEXT NOT NULL DEFAULT '[]'");
  addColumnIfMissing('products', 'tags_json', "TEXT NOT NULL DEFAULT '[]'");
  addColumnIfMissing('products', 'match_dimensions_json', "TEXT NOT NULL DEFAULT '[]'");
  addColumnIfMissing('products', 'target_relationships_json', "TEXT NOT NULL DEFAULT '[]'");
  addColumnIfMissing('products', 'gift_scenes_json', "TEXT NOT NULL DEFAULT '[]'");
  addColumnIfMissing('products', 'recipient_styles_json', "TEXT NOT NULL DEFAULT '[]'");
  addColumnIfMissing('products', 'risk_level', "TEXT NOT NULL DEFAULT 'medium'");
}

function addColumnIfMissing(tableName, columnName, definition) {
  const columns = db.prepare(`PRAGMA table_info(${tableName})`).all();
  if (columns.some((column) => column.name === columnName)) {
    return;
  }

  db.exec(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${definition};`);
}

function migrateLegacyJsonData() {
  migrateProductsFromJson();
  migrateSystemConfigFromJson();
}

function migrateProductsFromJson() {
  const hasProducts = db.prepare('SELECT COUNT(*) AS count FROM products').get().count > 0;
  if (hasProducts) {
    return;
  }

  const legacyProducts = readJsonFile('products.json', []);
  if (!Array.isArray(legacyProducts) || legacyProducts.length === 0) {
    return;
  }

  const insert = db.prepare(`
    INSERT INTO products (
      id, title, category, status, price_bucket, price_label, attributes_json, tags_json,
      match_dimensions_json, target_relationships_json, gift_scenes_json, recipient_styles_json,
      risk_level, link, summary, created_at, updated_at
    ) VALUES (
      @id, @title, @category, @status, @price_bucket, @price_label, @attributes_json, @tags_json,
      @match_dimensions_json, @target_relationships_json, @gift_scenes_json, @recipient_styles_json,
      @risk_level, @link, @summary, @created_at, @updated_at
    )
  `);

  runInTransaction(() => {
    for (const item of legacyProducts) {
      insert.run({
        id: item.id,
        title: item.title || '',
        category: item.category || 'other',
        status: item.status || 'draft',
        price_bucket: item.priceBucket || '100to300',
        price_label: item.priceLabel || '',
        attributes_json: JSON.stringify(item.attributes || []),
        tags_json: JSON.stringify(item.tags || []),
        match_dimensions_json: JSON.stringify(item.matchDimensions || []),
        target_relationships_json: JSON.stringify(item.targetRelationships || []),
        gift_scenes_json: JSON.stringify(item.giftScenes || []),
        recipient_styles_json: JSON.stringify(item.recipientStyles || []),
        risk_level: item.riskLevel || 'medium',
        link: item.link || '',
        summary: item.summary || '',
        created_at: item.createdAt || new Date().toISOString(),
        updated_at: item.updatedAt || new Date().toISOString(),
      });
    }
  });
  archiveLegacyFile('products.json');
}

function migrateSystemConfigFromJson() {
  const hasSystemConfig = db.prepare('SELECT COUNT(*) AS count FROM system_config').get().count > 0;
  if (hasSystemConfig) {
    return;
  }

  const legacyConfig = readJsonFile('system.json', null);
  if (!legacyConfig) {
    return;
  }

  saveConfigRow('app', legacyConfig, legacyConfig.updatedAt || new Date().toISOString());
  archiveLegacyFile('system.json');
}

function archiveLegacyFile(filename) {
  const path = join(dataDir, filename);
  if (!existsSync(path)) {
    return;
  }

  const backupPath = `${path}.migrated`;
  if (existsSync(backupPath)) {
    writeFileSync(backupPath, readFileSync(path));
  } else {
    renameSync(path, backupPath);
  }
}

export function getConfigRow(key, fallbackValue) {
  const row = db.prepare('SELECT value_json FROM system_config WHERE config_key = ?').get(key);
  if (!row) {
    return fallbackValue;
  }

  try {
    return JSON.parse(row.value_json);
  } catch {
    return fallbackValue;
  }
}

export function saveConfigRow(key, value, updatedAt = new Date().toISOString()) {
  db.prepare(`
    INSERT INTO system_config (config_key, value_json, updated_at)
    VALUES (?, ?, ?)
    ON CONFLICT(config_key) DO UPDATE SET
      value_json = excluded.value_json,
      updated_at = excluded.updated_at
  `).run(key, JSON.stringify(value), updatedAt);

  return value;
}
