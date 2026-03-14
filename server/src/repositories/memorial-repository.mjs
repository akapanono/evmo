import { buildOrderByRecent, buildUpsertClause } from '../database/sql-helpers.mjs';

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
    userId: row.user_id || undefined,
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
  async function getFriendIds(memorialDayId) {
    return (await database.queryAll(`
      SELECT friend_id
      FROM memorial_day_friends
      WHERE memorial_day_id = ?
      ORDER BY friend_id ASC
    `, [memorialDayId])).map((row) => row.friend_id);
  }

  return {
    async list() {
      const rows = await database.queryAll(`
        SELECT *
        FROM memorial_days
        ORDER BY month_day ASC, ${buildOrderByRecent(database, ['updated_at'])}
      `);

      return Promise.all(rows.map(async (row) => mapMemorialRow(row, await getFriendIds(row.id))));
    },

    async listByUserId(userId) {
      const rows = await database.queryAll(`
        SELECT *
        FROM memorial_days
        WHERE user_id = ?
        ORDER BY month_day ASC, ${buildOrderByRecent(database, ['updated_at'])}
      `, [userId]);

      return Promise.all(rows.map(async (row) => mapMemorialRow(row, await getFriendIds(row.id))));
    },

    async getById(id) {
      const row = await database.queryOne('SELECT * FROM memorial_days WHERE id = ?', [id]);
      return row ? mapMemorialRow(row, await getFriendIds(id)) : undefined;
    },

    async save(memorialDay) {
      await database.runInTransaction(async (tx = database) => {
        await tx.execute(`
          INSERT INTO memorial_days (
            id, user_id, name, month_day, note, recommendation_json, created_at, updated_at
          ) VALUES (
            @id, @user_id, @name, @month_day, @note, @recommendation_json, @created_at, @updated_at
          )
          ${buildUpsertClause(database, ['id'], [
            'user_id',
            'name',
            'month_day',
            'note',
            'recommendation_json',
            'created_at',
            'updated_at',
          ])}
        `, {
          id: memorialDay.id,
          user_id: memorialDay.userId || null,
          name: memorialDay.name || '',
          month_day: memorialDay.monthDay,
          note: memorialDay.note || null,
          recommendation_json: memorialDay.recommendation ? JSON.stringify(memorialDay.recommendation) : null,
          created_at: memorialDay.createdAt || new Date().toISOString(),
          updated_at: memorialDay.updatedAt || new Date().toISOString(),
        });

        await tx.execute('DELETE FROM memorial_day_friends WHERE memorial_day_id = ?', [memorialDay.id]);
        for (const friendId of memorialDay.friendIds || []) {
          await tx.execute(`
            INSERT INTO memorial_day_friends (memorial_day_id, friend_id)
            VALUES (?, ?)
          `, [memorialDay.id, friendId]);
        }
      });

      return this.getById(memorialDay.id);
    },

    async remove(id) {
      await database.execute('DELETE FROM memorial_days WHERE id = ?', [id]);
    },

    async replaceAllForUser(userId, memorialDays) {
      await database.execute('DELETE FROM memorial_days WHERE user_id = ?', [userId]);
      for (const memorialDay of memorialDays) {
        await this.save({
          ...memorialDay,
          userId,
        });
      }
    },
  };
}
