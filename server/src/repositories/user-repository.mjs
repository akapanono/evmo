export function createUserRepository(database) {
  const db = database.getDb();

  function mapUser(row) {
    return row
      ? {
          id: row.id,
          name: row.name || '',
          phone: row.phone || '',
          email: row.email || '',
          status: row.status || 'active',
          passwordHash: row.password_hash || '',
          createdAt: row.created_at,
          updatedAt: row.updated_at,
        }
      : undefined;
  }

  return {
    list() {
      return db.prepare(`
        SELECT *
        FROM users
        ORDER BY datetime(updated_at) DESC, datetime(created_at) DESC
      `).all().map(mapUser);
    },

    getById(id) {
      return mapUser(db.prepare('SELECT * FROM users WHERE id = ?').get(id));
    },

    getByPhone(phone) {
      return mapUser(db.prepare('SELECT * FROM users WHERE phone = ?').get(phone));
    },

    save(user) {
      db.prepare(`
        INSERT INTO users (
          id, name, phone, email, status, password_hash, created_at, updated_at
        ) VALUES (
          @id, @name, @phone, @email, @status, @password_hash, @created_at, @updated_at
        )
        ON CONFLICT(id) DO UPDATE SET
          name = excluded.name,
          phone = excluded.phone,
          email = excluded.email,
          status = excluded.status,
          password_hash = excluded.password_hash,
          created_at = excluded.created_at,
          updated_at = excluded.updated_at
      `).run({
        id: user.id,
        name: user.name || '',
        phone: user.phone || '',
        email: user.email || '',
        status: user.status || 'active',
        password_hash: user.passwordHash || '',
        created_at: user.createdAt || new Date().toISOString(),
        updated_at: user.updatedAt || new Date().toISOString(),
      });

      return this.getById(user.id);
    },
  };
}
