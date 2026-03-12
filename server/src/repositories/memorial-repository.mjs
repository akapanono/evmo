function safeParseJson(value, fallback) {
  if (!value) {
    return fallback;
  }

  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function mapMemorialRow(row, friendIds) {
  return {
    id: row.id,
    name: row.name,
    monthDay: row.month_day,
    friendIds,
    note: row.note || undefined,
    recommendation: safeParseJson(row.recommendation_json, undefined),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function createMemorialRepository(database) {
  const db = database.getDb();

  function getFriendIds(memorialDayId) {
    return db.prepare(`
      SELECT friend_id
      FROM memorial_day_friends
      WHERE memorial_day_id = ?
      ORDER BY friend_id ASC
    `).all(memorialDayId).map((row) => row.friend_id);
  }

  return {
    list() {
      const rows = db.prepare(`
        SELECT *
        FROM memorial_days
        ORDER BY month_day ASC, datetime(updated_at) DESC
      `).all();

      return rows.map((row) => mapMemorialRow(row, getFriendIds(row.id)));
    },

    listByUserId(userId) {
      const rows = db.prepare(`
        SELECT *
        FROM memorial_days
        WHERE user_id = ?
        ORDER BY month_day ASC, datetime(updated_at) DESC
      `).all(userId);

      return rows.map((row) => mapMemorialRow(row, getFriendIds(row.id)));
    },

    getById(id) {
      const row = db.prepare('SELECT * FROM memorial_days WHERE id = ?').get(id);
      return row ? mapMemorialRow(row, getFriendIds(id)) : undefined;
    },

    save(memorialDay) {
      database.runInTransaction(() => {
        db.prepare(`
          INSERT INTO memorial_days (
            id, user_id, name, month_day, note, recommendation_json, created_at, updated_at
          ) VALUES (
            @id, @user_id, @name, @month_day, @note, @recommendation_json, @created_at, @updated_at
          )
          ON CONFLICT(id) DO UPDATE SET
            user_id = excluded.user_id,
            name = excluded.name,
            month_day = excluded.month_day,
            note = excluded.note,
            recommendation_json = excluded.recommendation_json,
            created_at = excluded.created_at,
            updated_at = excluded.updated_at
        `).run({
          id: memorialDay.id,
          user_id: memorialDay.userId || null,
          name: memorialDay.name || '',
          month_day: memorialDay.monthDay,
          note: memorialDay.note || null,
          recommendation_json: memorialDay.recommendation ? JSON.stringify(memorialDay.recommendation) : null,
          created_at: memorialDay.createdAt || new Date().toISOString(),
          updated_at: memorialDay.updatedAt || new Date().toISOString(),
        });

        db.prepare('DELETE FROM memorial_day_friends WHERE memorial_day_id = ?').run(memorialDay.id);
        const insertFriendLink = db.prepare(`
          INSERT INTO memorial_day_friends (memorial_day_id, friend_id)
          VALUES (?, ?)
        `);
        for (const friendId of memorialDay.friendIds || []) {
          insertFriendLink.run(memorialDay.id, friendId);
        }
      });

      return this.getById(memorialDay.id);
    },

    remove(id) {
      db.prepare('DELETE FROM memorial_days WHERE id = ?').run(id);
    },

    replaceAllForUser(userId, memorialDays) {
      db.prepare('DELETE FROM memorial_days WHERE user_id = ?').run(userId);
      for (const memorialDay of memorialDays) {
        this.save({
          ...memorialDay,
          userId,
        });
      }
    },
  };
}
