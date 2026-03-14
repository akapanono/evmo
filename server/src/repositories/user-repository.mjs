import crypto from 'node:crypto';
import { buildOrderByRecent, buildUpsertClause } from '../database/sql-helpers.mjs';

export function createUserRepository(database) {
  function mapUser(row) {
    return row
      ? {
          id: row.id,
          username: row.username || '',
          name: row.name || '',
          email: row.email || '',
          status: row.status || 'active',
          passwordHash: row.password_hash || '',
          securityQuestion1: row.security_question_1 || '',
          securityAnswerHash1: row.security_answer_hash_1 || '',
          securityQuestion2: row.security_question_2 || '',
          securityAnswerHash2: row.security_answer_hash_2 || '',
          securityQuestion3: row.security_question_3 || '',
          securityAnswerHash3: row.security_answer_hash_3 || '',
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

    async getByUsername(username) {
      return mapUser(await database.queryOne('SELECT * FROM users WHERE username = ?', [username]));
    },

    async save(user) {
      const userId = user.id || crypto.randomUUID();

      await database.execute(`
        INSERT INTO users (
          id, username, name, email, status, password_hash,
          security_question_1, security_answer_hash_1,
          security_question_2, security_answer_hash_2,
          security_question_3, security_answer_hash_3,
          created_at, updated_at
        ) VALUES (
          @id, @username, @name, @email, @status, @password_hash,
          @security_question_1, @security_answer_hash_1,
          @security_question_2, @security_answer_hash_2,
          @security_question_3, @security_answer_hash_3,
          @created_at, @updated_at
        )
        ${buildUpsertClause(database, ['id'], [
          'username',
          'name',
          'email',
          'status',
          'password_hash',
          'security_question_1',
          'security_answer_hash_1',
          'security_question_2',
          'security_answer_hash_2',
          'security_question_3',
          'security_answer_hash_3',
          'created_at',
          'updated_at',
        ])}
      `, {
        id: userId,
        username: user.username || '',
        name: user.name || '',
        email: user.email || '',
        status: user.status || 'active',
        password_hash: user.passwordHash || '',
        security_question_1: user.securityQuestion1 || '',
        security_answer_hash_1: user.securityAnswerHash1 || '',
        security_question_2: user.securityQuestion2 || '',
        security_answer_hash_2: user.securityAnswerHash2 || '',
        security_question_3: user.securityQuestion3 || '',
        security_answer_hash_3: user.securityAnswerHash3 || '',
        created_at: user.createdAt || new Date().toISOString(),
        updated_at: user.updatedAt || new Date().toISOString(),
      });

      return this.getById(userId);
    },
  };
}
