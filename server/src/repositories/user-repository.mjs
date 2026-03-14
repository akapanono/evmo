import { buildOrderByRecent, buildUpsertClause } from '../database/sql-helpers.mjs';

function normalizeProvider(provider) {
  return provider === 'wechat' ? 'wechat' : provider === 'qq' ? 'qq' : '';
}

function getProviderColumn(provider) {
  const normalized = normalizeProvider(provider);
  return normalized ? `${normalized}_open_id` : '';
}

export function createUserRepository(database) {
  function mapUser(row) {
    return row
      ? {
          id: row.id,
          name: row.name || '',
          phone: row.phone || '',
          email: row.email || '',
          status: row.status || 'active',
          passwordHash: row.password_hash || '',
          wechatOpenId: row.wechat_open_id || '',
          qqOpenId: row.qq_open_id || '',
          createdAt: row.created_at,
          updatedAt: row.updated_at,
        }
      : undefined;
  }

  return {
    async list() {
      return (await database.queryAll(`
        SELECT *
        FROM users
        ORDER BY ${buildOrderByRecent(database, ['updated_at', 'created_at'])}
      `)).map(mapUser);
    },

    async getById(id) {
      return mapUser(await database.queryOne('SELECT * FROM users WHERE id = ?', [id]));
    },

    async getByPhone(phone) {
      return mapUser(await database.queryOne('SELECT * FROM users WHERE phone = ?', [phone]));
    },

    async getByProvider(provider, providerId) {
      const column = getProviderColumn(provider);
      if (!column || !providerId) {
        return undefined;
      }

      return mapUser(await database.queryOne(`SELECT * FROM users WHERE ${column} = ?`, [providerId]));
    },

    async save(user) {
      await database.execute(`
        INSERT INTO users (
          id, name, phone, email, status, password_hash, wechat_open_id, qq_open_id, created_at, updated_at
        ) VALUES (
          @id, @name, @phone, @email, @status, @password_hash, @wechat_open_id, @qq_open_id, @created_at, @updated_at
        )
        ${buildUpsertClause(database, ['id'], [
          'name',
          'phone',
          'email',
          'status',
          'password_hash',
          'wechat_open_id',
          'qq_open_id',
          'created_at',
          'updated_at',
        ])}
      `, {
        id: user.id,
        name: user.name || '',
        phone: user.phone || '',
        email: user.email || '',
        status: user.status || 'active',
        password_hash: user.passwordHash || '',
        wechat_open_id: user.wechatOpenId || '',
        qq_open_id: user.qqOpenId || '',
        created_at: user.createdAt || new Date().toISOString(),
        updated_at: user.updatedAt || new Date().toISOString(),
      });

      return this.getById(user.id);
    },
  };
}
