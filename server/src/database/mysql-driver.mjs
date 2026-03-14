import mysql from 'mysql2/promise';
import { config } from '../config.mjs';

const pool = mysql.createPool({
  host: config.database.host,
  port: config.database.port,
  user: config.database.user,
  password: config.database.password,
  database: config.database.name,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  namedPlaceholders: true,
  charset: 'utf8mb4',
});

function normalizeRows(rows) {
  return Array.isArray(rows) ? rows : [];
}

const MYSQL_MIGRATIONS = [
  `CREATE TABLE IF NOT EXISTS admins (
    id VARCHAR(64) PRIMARY KEY,
    username VARCHAR(191) NOT NULL UNIQUE,
    role VARCHAR(64) NOT NULL DEFAULT 'super_admin',
    is_active TINYINT(1) NOT NULL DEFAULT 1,
    created_at VARCHAR(40) NOT NULL,
    updated_at VARCHAR(40) NOT NULL
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
  `CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(191),
    phone VARCHAR(64),
    email VARCHAR(191),
    status VARCHAR(32) NOT NULL DEFAULT 'active',
    password_hash VARCHAR(255),
    wechat_open_id VARCHAR(191),
    qq_open_id VARCHAR(191),
    created_at VARCHAR(40) NOT NULL,
    updated_at VARCHAR(40) NOT NULL,
    UNIQUE KEY idx_users_phone_unique (phone),
    UNIQUE KEY idx_users_wechat_open_id_unique (wechat_open_id),
    UNIQUE KEY idx_users_qq_open_id_unique (qq_open_id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
  `CREATE TABLE IF NOT EXISTS user_settings (
    user_id VARCHAR(64) PRIMARY KEY,
    settings_json LONGTEXT NOT NULL,
    created_at VARCHAR(40) NOT NULL,
    updated_at VARCHAR(40) NOT NULL,
    CONSTRAINT fk_user_settings_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
  `CREATE TABLE IF NOT EXISTS friends (
    id VARCHAR(64) PRIMARY KEY,
    user_id VARCHAR(64),
    name VARCHAR(191) NOT NULL,
    nickname VARCHAR(191),
    relationship VARCHAR(64),
    birthday VARCHAR(32),
    gender VARCHAR(32),
    age INT,
    height_cm INT,
    weight_kg INT,
    city VARCHAR(191),
    hometown VARCHAR(191),
    occupation VARCHAR(191),
    company VARCHAR(191),
    school VARCHAR(191),
    major VARCHAR(191),
    avatar_color VARCHAR(64),
    avatar_preset VARCHAR(64),
    avatar_image LONGTEXT,
    last_contact_date VARCHAR(40),
    last_viewed_at VARCHAR(40),
    is_important TINYINT(1) NOT NULL DEFAULT 0,
    notes LONGTEXT NOT NULL,
    preferences_json LONGTEXT NOT NULL,
    birthday_recommendation_json LONGTEXT,
    ai_profile_json LONGTEXT NOT NULL,
    contact_count INT NOT NULL DEFAULT 0,
    created_at VARCHAR(40) NOT NULL,
    updated_at VARCHAR(40) NOT NULL,
    KEY idx_friends_name (name),
    CONSTRAINT fk_friends_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
  `CREATE TABLE IF NOT EXISTS friend_preference_items (
    id VARCHAR(64) PRIMARY KEY,
    friend_id VARCHAR(64) NOT NULL,
    category VARCHAR(64) NOT NULL,
    value LONGTEXT NOT NULL,
    created_at VARCHAR(40) NOT NULL,
    CONSTRAINT fk_friend_preference_items_friend FOREIGN KEY (friend_id) REFERENCES friends(id) ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
  `CREATE TABLE IF NOT EXISTS friend_basic_info_fields (
    id VARCHAR(64) PRIMARY KEY,
    friend_id VARCHAR(64) NOT NULL,
    label VARCHAR(191) NOT NULL,
    value LONGTEXT NOT NULL,
    created_at VARCHAR(40) NOT NULL,
    source_text LONGTEXT NOT NULL,
    CONSTRAINT fk_friend_basic_info_fields_friend FOREIGN KEY (friend_id) REFERENCES friends(id) ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
  `CREATE TABLE IF NOT EXISTS friend_custom_fields (
    id VARCHAR(64) PRIMARY KEY,
    friend_id VARCHAR(64) NOT NULL,
    label VARCHAR(191) NOT NULL,
    value LONGTEXT NOT NULL,
    created_at VARCHAR(40) NOT NULL,
    include_in_timeline TINYINT(1) NOT NULL DEFAULT 0,
    semantic_type VARCHAR(64) NOT NULL DEFAULT 'note',
    temporal_scope VARCHAR(64) NOT NULL DEFAULT 'stable',
    extraction_method VARCHAR(64) NOT NULL DEFAULT 'manual',
    source_text LONGTEXT NOT NULL,
    event_time_text VARCHAR(191),
    CONSTRAINT fk_friend_custom_fields_friend FOREIGN KEY (friend_id) REFERENCES friends(id) ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
  `CREATE TABLE IF NOT EXISTS memorial_days (
    id VARCHAR(64) PRIMARY KEY,
    user_id VARCHAR(64),
    name VARCHAR(191) NOT NULL,
    month_day VARCHAR(16) NOT NULL,
    note LONGTEXT,
    recommendation_json LONGTEXT,
    created_at VARCHAR(40) NOT NULL,
    updated_at VARCHAR(40) NOT NULL,
    KEY idx_memorial_days_month_day (month_day),
    CONSTRAINT fk_memorial_days_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
  `CREATE TABLE IF NOT EXISTS memorial_day_friends (
    memorial_day_id VARCHAR(64) NOT NULL,
    friend_id VARCHAR(64) NOT NULL,
    PRIMARY KEY (memorial_day_id, friend_id),
    CONSTRAINT fk_memorial_day_friends_memorial FOREIGN KEY (memorial_day_id) REFERENCES memorial_days(id) ON DELETE CASCADE,
    CONSTRAINT fk_memorial_day_friends_friend FOREIGN KEY (friend_id) REFERENCES friends(id) ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
  `CREATE TABLE IF NOT EXISTS products (
    id VARCHAR(64) PRIMARY KEY,
    title VARCHAR(191) NOT NULL,
    category VARCHAR(64) NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'draft',
    price_bucket VARCHAR(64) NOT NULL,
    price_label VARCHAR(64) NOT NULL DEFAULT '',
    attributes_json LONGTEXT NOT NULL,
    tags_json LONGTEXT NOT NULL,
    match_dimensions_json LONGTEXT NOT NULL,
    target_relationships_json LONGTEXT NOT NULL,
    gift_scenes_json LONGTEXT NOT NULL,
    recipient_styles_json LONGTEXT NOT NULL,
    risk_level VARCHAR(32) NOT NULL DEFAULT 'medium',
    link LONGTEXT NOT NULL,
    summary LONGTEXT NOT NULL,
    created_at VARCHAR(40) NOT NULL,
    updated_at VARCHAR(40) NOT NULL,
    KEY idx_products_status (status)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
  `CREATE TABLE IF NOT EXISTS system_config (
    config_key VARCHAR(128) PRIMARY KEY,
    value_json LONGTEXT NOT NULL,
    updated_at VARCHAR(40) NOT NULL
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
  `CREATE TABLE IF NOT EXISTS recommendation_snapshots (
    id VARCHAR(64) PRIMARY KEY,
    friend_id VARCHAR(64),
    memorial_day_id VARCHAR(64),
    occasion_type VARCHAR(64) NOT NULL,
    recommendation_json LONGTEXT NOT NULL,
    created_at VARCHAR(40) NOT NULL,
    updated_at VARCHAR(40) NOT NULL,
    CONSTRAINT fk_recommendation_snapshots_friend FOREIGN KEY (friend_id) REFERENCES friends(id) ON DELETE CASCADE,
    CONSTRAINT fk_recommendation_snapshots_memorial FOREIGN KEY (memorial_day_id) REFERENCES memorial_days(id) ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
  `CREATE TABLE IF NOT EXISTS ai_request_logs (
    id VARCHAR(64) PRIMARY KEY,
    scene VARCHAR(64) NOT NULL,
    provider VARCHAR(128),
    model VARCHAR(191),
    request_json LONGTEXT,
    response_preview LONGTEXT,
    error_message LONGTEXT,
    status VARCHAR(32) NOT NULL,
    created_at VARCHAR(40) NOT NULL,
    KEY idx_ai_request_logs_created_at (created_at)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
];

async function withConnection(callback) {
  const connection = await pool.getConnection();
  try {
    return await callback(connection);
  } finally {
    connection.release();
  }
}

function normalizeSqlParams(sql, params = []) {
  if (!params || Array.isArray(params) || typeof params !== 'object') {
    return { sql, values: params };
  }

  const values = [];
  const normalizedSql = sql.replace(/@([a-zA-Z0-9_]+)/g, (_, key) => {
    values.push(params[key] ?? null);
    return '?';
  });

  return {
    sql: normalizedSql,
    values,
  };
}

async function queryWithNamedParams(connection, sql, params = []) {
  const normalized = normalizeSqlParams(sql, params);
  return connection.query(normalized.sql, normalized.values);
}

async function executeWithNamedParams(connection, sql, params = []) {
  const normalized = normalizeSqlParams(sql, params);
  return connection.execute(normalized.sql, normalized.values);
}


export function getDb() {
  return pool;
}

export async function queryAll(sql, params = []) {
  const [rows] = await pool.query(sql, params);
  return normalizeRows(rows);
}

export async function queryOne(sql, params = []) {
  const rows = await queryAll(sql, params);
  return rows[0];
}

export async function execute(sql, params = []) {
  const [result] = await pool.execute(sql, params);
  return result;
}

export async function runInTransaction(callback) {
  return withConnection(async (connection) => {
    await connection.beginTransaction();
    try {
      const scope = {
        queryAll: async (sql, params = []) => {
          const [rows] = await queryWithNamedParams(connection, sql, params);
          return normalizeRows(rows);
        },
        queryOne: async (sql, params = []) => {
          const [rows] = await queryWithNamedParams(connection, sql, params);
          return normalizeRows(rows)[0];
        },
        execute: async (sql, params = []) => {
          const [result] = await executeWithNamedParams(connection, sql, params);
          return result;
        },
      };

      const result = await callback(scope);
      await connection.commit();
      return result;
    } catch (error) {
      await connection.rollback();
      throw error;
    }
  });
}


export async function runMigrations() {
  for (const statement of MYSQL_MIGRATIONS) {
    await pool.query(statement);
  }
}

export async function getConfigRow(key, fallbackValue) {
  const row = await queryOne(`
    SELECT value_json
    FROM system_config
    WHERE config_key = ?
  `, [key]);

  if (!row?.value_json) {
    return fallbackValue;
  }

  try {
    return JSON.parse(row.value_json);
  } catch {
    return fallbackValue;
  }
}

export async function saveConfigRow(key, value, updatedAt = new Date().toISOString()) {
  await execute(`
    INSERT INTO system_config (config_key, value_json, updated_at)
    VALUES (?, ?, ?)
    ON DUPLICATE KEY UPDATE
      value_json = VALUES(value_json),
      updated_at = VALUES(updated_at)
  `, [key, JSON.stringify(value), updatedAt]);

  return value;
}
