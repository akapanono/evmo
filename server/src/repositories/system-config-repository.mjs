export function createSystemConfigRepository(database, fallbackValue) {
  const db = database.getDb();

  return {
    getAppConfig() {
      return database.getConfigRow('app', fallbackValue);
    },

    saveAppConfig(nextConfig) {
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

      database.saveConfigRow('app', value, value.updatedAt);
      return value;
    },

    getUserSettings(userId, fallbackSettings = {}) {
      const row = db.prepare(`
        SELECT settings_json
        FROM user_settings
        WHERE user_id = ?
      `).get(userId);

      if (!row?.settings_json) {
        return fallbackSettings;
      }

      try {
        return JSON.parse(row.settings_json);
      } catch {
        return fallbackSettings;
      }
    },

    saveUserSettings(userId, settings) {
      const now = new Date().toISOString();
      db.prepare(`
        INSERT INTO user_settings (user_id, settings_json, created_at, updated_at)
        VALUES (?, ?, ?, ?)
        ON CONFLICT(user_id) DO UPDATE SET
          settings_json = excluded.settings_json,
          updated_at = excluded.updated_at
      `).run(userId, JSON.stringify(settings ?? {}), now, now);

      return settings;
    },
  };
}
