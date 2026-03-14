import { buildUpsertClause } from '../database/sql-helpers.mjs';

export function createSystemConfigRepository(database, fallbackValue) {
  return {
    async getAppConfig() {
      return database.getConfigRow('app', fallbackValue);
    },

    async saveAppConfig(nextConfig) {
      const value = {
        ...fallbackValue,
        ...nextConfig,
        aiProvider: {
          ...fallbackValue.aiProvider,
          ...(nextConfig?.aiProvider ?? {}),
        },
        recommendation: {
          ...fallbackValue.recommendation,
          ...(nextConfig?.recommendation ?? {}),
        },
        updatedAt: new Date().toISOString(),
      };

      await database.saveConfigRow('app', value, value.updatedAt);
      return value;
    },

    async getUserSettings(userId, fallbackSettings = {}) {
      const row = await database.queryOne(`
        SELECT settings_json
        FROM user_settings
        WHERE user_id = ?
      `, [userId]);

      if (!row?.settings_json) {
        return fallbackSettings;
      }

      try {
        return JSON.parse(row.settings_json);
      } catch {
        return fallbackSettings;
      }
    },

    async saveUserSettings(userId, settings) {
      const now = new Date().toISOString();
      await database.execute(`
        INSERT INTO user_settings (user_id, settings_json, created_at, updated_at)
        VALUES (?, ?, ?, ?)
        ${buildUpsertClause(database, ['user_id'], ['settings_json', 'updated_at'])}
      `, [userId, JSON.stringify(settings ?? {}), now, now]);

      return settings;
    },
  };
}
