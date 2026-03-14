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

function mapFriendRow(row) {
  return {
    id: row.id,
    userId: row.user_id || undefined,
    name: row.name,
    nickname: row.nickname || '',
    relationship: row.relationship || '',
    birthday: row.birthday || undefined,
    gender: row.gender || '',
    age: row.age ?? undefined,
    heightCm: row.height_cm ?? undefined,
    weightKg: row.weight_kg ?? undefined,
    city: row.city || '',
    hometown: row.hometown || '',
    occupation: row.occupation || '',
    company: row.company || '',
    school: row.school || '',
    major: row.major || '',
    avatarColor: row.avatar_color || 'coral',
    avatarPreset: row.avatar_preset || 'initial',
    avatarImage: row.avatar_image || undefined,
    lastContactDate: row.last_contact_date || undefined,
    lastViewedAt: row.last_viewed_at || undefined,
    isImportant: Boolean(row.is_important),
    preferences: safeParseJson(row.preferences_json, []),
    preferenceItems: [],
    notes: row.notes || '',
    birthdayRecommendation: safeParseJson(row.birthday_recommendation_json, undefined),
    basicInfoFields: [],
    customFields: [],
    aiProfile: safeParseJson(row.ai_profile_json, {}),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    contactCount: row.contact_count ?? 0,
  };
}

export function createFriendRepository(database) {
  async function hydrateFriend(friend) {
    const preferenceItems = await database.queryAll(`
      SELECT id, category, value
      FROM friend_preference_items
      WHERE friend_id = ?
      ORDER BY created_at ASC
    `, [friend.id]);

    const basicInfoFields = await database.queryAll(`
      SELECT id, label, value, created_at, source_text
      FROM friend_basic_info_fields
      WHERE friend_id = ?
      ORDER BY created_at ASC
    `, [friend.id]).map((row) => ({
      id: row.id,
      label: row.label,
      value: row.value,
      createdAt: row.created_at,
      sourceText: row.source_text || row.value,
    }));

    const customFields = await database.queryAll(`
      SELECT
        id, label, value, created_at, include_in_timeline,
        semantic_type, temporal_scope, extraction_method,
        source_text, event_time_text
      FROM friend_custom_fields
      WHERE friend_id = ?
      ORDER BY created_at ASC
    `, [friend.id]).map((row) => ({
      id: row.id,
      label: row.label,
      value: row.value,
      createdAt: row.created_at,
      includeInTimeline: Boolean(row.include_in_timeline),
      semanticType: row.semantic_type,
      temporalScope: row.temporal_scope,
      extractionMethod: row.extraction_method,
      sourceText: row.source_text || row.value,
      eventTimeText: row.event_time_text || undefined,
    }));

    return {
      ...friend,
      preferenceItems,
      basicInfoFields,
      customFields,
    };
  }

  return {
    async list() {
      const rows = await database.queryAll(`
        SELECT *
        FROM friends
        ORDER BY is_important DESC, ${buildOrderByRecent(database, ['updated_at', 'created_at'])}
      `);

      return Promise.all(rows.map((row) => hydrateFriend(mapFriendRow(row))));
    },

    async listByUserId(userId) {
      const rows = await database.queryAll(`
        SELECT *
        FROM friends
        WHERE user_id = ?
        ORDER BY is_important DESC, ${buildOrderByRecent(database, ['updated_at', 'created_at'])}
      `, [userId]);

      return Promise.all(rows.map((row) => hydrateFriend(mapFriendRow(row))));
    },

    async getById(id) {
      const row = await database.queryOne('SELECT * FROM friends WHERE id = ?', [id]);
      return row ? hydrateFriend(mapFriendRow(row)) : undefined;
    },

    async save(friend) {
      await database.runInTransaction(async (tx = database) => {
        await tx.execute(`
          INSERT INTO friends (
            id, user_id, name, nickname, relationship, birthday, gender, age, height_cm, weight_kg,
            city, hometown, occupation, company, school, major, avatar_color, avatar_preset,
            avatar_image, last_contact_date, last_viewed_at, is_important, notes, preferences_json,
            birthday_recommendation_json, ai_profile_json, contact_count, created_at, updated_at
          ) VALUES (
            @id, @user_id, @name, @nickname, @relationship, @birthday, @gender, @age, @height_cm, @weight_kg,
            @city, @hometown, @occupation, @company, @school, @major, @avatar_color, @avatar_preset,
            @avatar_image, @last_contact_date, @last_viewed_at, @is_important, @notes, @preferences_json,
            @birthday_recommendation_json, @ai_profile_json, @contact_count, @created_at, @updated_at
          )
          ${buildUpsertClause(database, ['id'], [
            'user_id',
            'name',
            'nickname',
            'relationship',
            'birthday',
            'gender',
            'age',
            'height_cm',
            'weight_kg',
            'city',
            'hometown',
            'occupation',
            'company',
            'school',
            'major',
            'avatar_color',
            'avatar_preset',
            'avatar_image',
            'last_contact_date',
            'last_viewed_at',
            'is_important',
            'notes',
            'preferences_json',
            'birthday_recommendation_json',
            'ai_profile_json',
            'contact_count',
            'created_at',
            'updated_at',
          ])}
        `, {
          id: friend.id,
          user_id: friend.userId || null,
          name: friend.name || '',
          nickname: friend.nickname || '',
          relationship: friend.relationship || '',
          birthday: friend.birthday || null,
          gender: friend.gender || '',
          age: friend.age ?? null,
          height_cm: friend.heightCm ?? null,
          weight_kg: friend.weightKg ?? null,
          city: friend.city || '',
          hometown: friend.hometown || '',
          occupation: friend.occupation || '',
          company: friend.company || '',
          school: friend.school || '',
          major: friend.major || '',
          avatar_color: friend.avatarColor || 'coral',
          avatar_preset: friend.avatarPreset || 'initial',
          avatar_image: friend.avatarImage || null,
          last_contact_date: friend.lastContactDate || null,
          last_viewed_at: friend.lastViewedAt || null,
          is_important: friend.isImportant ? 1 : 0,
          notes: friend.notes || '',
          preferences_json: JSON.stringify(friend.preferences || []),
          birthday_recommendation_json: friend.birthdayRecommendation ? JSON.stringify(friend.birthdayRecommendation) : null,
          ai_profile_json: JSON.stringify(friend.aiProfile || {}),
          contact_count: friend.contactCount ?? 0,
          created_at: friend.createdAt || new Date().toISOString(),
          updated_at: friend.updatedAt || new Date().toISOString(),
        });

        await tx.execute('DELETE FROM friend_preference_items WHERE friend_id = ?', [friend.id]);
        await tx.execute('DELETE FROM friend_basic_info_fields WHERE friend_id = ?', [friend.id]);
        await tx.execute('DELETE FROM friend_custom_fields WHERE friend_id = ?', [friend.id]);

        for (const item of friend.preferenceItems || []) {
          await tx.execute(`
            INSERT INTO friend_preference_items (id, friend_id, category, value, created_at)
            VALUES (@id, @friend_id, @category, @value, @created_at)
          `, {
            id: item.id,
            friend_id: friend.id,
            category: item.category,
            value: item.value,
            created_at: item.createdAt || friend.updatedAt || new Date().toISOString(),
          });
        }

        for (const field of friend.basicInfoFields || []) {
          await tx.execute(`
            INSERT INTO friend_basic_info_fields (id, friend_id, label, value, created_at, source_text)
            VALUES (@id, @friend_id, @label, @value, @created_at, @source_text)
          `, {
            id: field.id,
            friend_id: friend.id,
            label: field.label,
            value: field.value,
            created_at: field.createdAt || friend.updatedAt || new Date().toISOString(),
            source_text: field.sourceText || field.value,
          });
        }

        for (const field of friend.customFields || []) {
          await tx.execute(`
            INSERT INTO friend_custom_fields (
              id, friend_id, label, value, created_at, include_in_timeline,
              semantic_type, temporal_scope, extraction_method, source_text, event_time_text
            ) VALUES (
              @id, @friend_id, @label, @value, @created_at, @include_in_timeline,
              @semantic_type, @temporal_scope, @extraction_method, @source_text, @event_time_text
            )
          `, {
            id: field.id,
            friend_id: friend.id,
            label: field.label,
            value: field.value,
            created_at: field.createdAt || friend.updatedAt || new Date().toISOString(),
            include_in_timeline: field.includeInTimeline ? 1 : 0,
            semantic_type: field.semanticType || 'note',
            temporal_scope: field.temporalScope || 'stable',
            extraction_method: field.extractionMethod || 'manual',
            source_text: field.sourceText || field.value,
            event_time_text: field.eventTimeText || null,
          });
        }
      });

      return this.getById(friend.id);
    },

    async remove(id) {
      await database.execute('DELETE FROM friends WHERE id = ?', [id]);
    },

    async replaceAllForUser(userId, friends) {
      await database.execute('DELETE FROM friends WHERE user_id = ?', [userId]);
      for (const friend of friends) {
        await this.save({
          ...friend,
          userId,
        });
      }
    },
  };
}
