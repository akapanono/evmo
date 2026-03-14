import mysql from 'mysql2/promise';
import { DatabaseSync } from 'node:sqlite';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { config, dataDir } from '../src/config.mjs';
import { runMigrations as runMySqlMigrations } from '../src/database/mysql-driver.mjs';

const SQLITE_FILENAME = 'youji.sqlite';
const sqlitePath = join(dataDir, SQLITE_FILENAME);
const shouldReset = process.argv.includes('--reset');

const TABLES = [
  { name: 'admins', columns: ['id', 'username', 'role', 'is_active', 'created_at', 'updated_at'] },
  { name: 'users', columns: ['id', 'name', 'phone', 'email', 'status', 'password_hash', 'created_at', 'updated_at'] },
  { name: 'user_settings', columns: ['user_id', 'settings_json', 'created_at', 'updated_at'] },
  {
    name: 'friends',
    columns: [
      'id', 'user_id', 'name', 'nickname', 'relationship', 'birthday', 'gender', 'age', 'height_cm', 'weight_kg',
      'city', 'hometown', 'occupation', 'company', 'school', 'major', 'avatar_color', 'avatar_preset',
      'avatar_image', 'last_contact_date', 'last_viewed_at', 'is_important', 'notes', 'preferences_json',
      'birthday_recommendation_json', 'ai_profile_json', 'contact_count', 'created_at', 'updated_at',
    ],
  },
  { name: 'friend_preference_items', columns: ['id', 'friend_id', 'category', 'value', 'created_at'] },
  { name: 'friend_basic_info_fields', columns: ['id', 'friend_id', 'label', 'value', 'created_at', 'source_text'] },
  {
    name: 'friend_custom_fields',
    columns: [
      'id', 'friend_id', 'label', 'value', 'created_at', 'include_in_timeline',
      'semantic_type', 'temporal_scope', 'extraction_method', 'source_text', 'event_time_text',
    ],
  },
  { name: 'memorial_days', columns: ['id', 'user_id', 'name', 'month_day', 'note', 'recommendation_json', 'created_at', 'updated_at'] },
  { name: 'memorial_day_friends', columns: ['memorial_day_id', 'friend_id'] },
  {
    name: 'products',
    columns: [
      'id', 'title', 'category', 'status', 'price_bucket', 'price_label', 'attributes_json', 'tags_json',
      'match_dimensions_json', 'target_relationships_json', 'gift_scenes_json', 'recipient_styles_json',
      'risk_level', 'link', 'summary', 'created_at', 'updated_at',
    ],
  },
  { name: 'system_config', columns: ['config_key', 'value_json', 'updated_at'] },
  {
    name: 'recommendation_snapshots',
    columns: ['id', 'friend_id', 'memorial_day_id', 'occasion_type', 'recommendation_json', 'created_at', 'updated_at'],
  },
  {
    name: 'ai_request_logs',
    columns: ['id', 'scene', 'provider', 'model', 'request_json', 'response_preview', 'error_message', 'status', 'created_at'],
  },
];

function buildInsertSql(table) {
  const columnList = table.columns.join(', ');
  const placeholders = table.columns.map(() => '?').join(', ');
  const updateList = table.columns.map((column) => `${column} = VALUES(${column})`).join(', ');
  return `INSERT INTO ${table.name} (${columnList}) VALUES (${placeholders}) ON DUPLICATE KEY UPDATE ${updateList}`;
}

function buildSelectSql(table) {
  return `SELECT ${table.columns.join(', ')} FROM ${table.name}`;
}

async function main() {
  if (config.database.client !== 'mysql') {
    throw new Error('Set DATABASE_CLIENT=mysql before running the SQLite -> MySQL migration script.');
  }

  if (!existsSync(sqlitePath)) {
    throw new Error(`SQLite database not found: ${sqlitePath}`);
  }

  const sqlite = new DatabaseSync(sqlitePath);
  const pool = mysql.createPool({
    host: config.database.host,
    port: config.database.port,
    user: config.database.user,
    password: config.database.password,
    database: config.database.name,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    charset: 'utf8mb4',
  });

  try {
    await runMySqlMigrations();

    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      await connection.query('SET FOREIGN_KEY_CHECKS = 0');

      if (shouldReset) {
        for (const table of [...TABLES].reverse()) {
          await connection.query(`DELETE FROM ${table.name}`);
        }
      }

      for (const table of TABLES) {
        const rows = sqlite.prepare(buildSelectSql(table)).all();
        if (rows.length === 0) {
          console.log(`[skip] ${table.name}: 0 rows`);
          continue;
        }

        const insertSql = buildInsertSql(table);
        for (const row of rows) {
          const values = table.columns.map((column) => row[column] ?? null);
          await connection.execute(insertSql, values);
        }

        console.log(`[ok] ${table.name}: ${rows.length} rows`);
      }

      await connection.query('SET FOREIGN_KEY_CHECKS = 1');
      await connection.commit();
      console.log('SQLite -> MySQL migration completed.');
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  } finally {
    await pool.end();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
