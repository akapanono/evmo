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
  const db = database.getDb();

  function hydrateFriend(friend) {
    const preferenceItems = db.prepare(`
      SELECT id, category, value
      FROM friend_preference_items
      WHERE friend_id = ?
      ORDER BY created_at ASC
    `).all(friend.id);

    const basicInfoFields = db.prepare(`
      SELECT id, label, value, created_at, source_text
      FROM friend_basic_info_fields
      WHERE friend_id = ?
      ORDER BY created_at ASC
    `).all(friend.id).map((row) => ({
      id: row.id,
      label: row.label,
      value: row.value,
      createdAt: row.created_at,
      sourceText: row.source_text || row.value,
    }));

    const customFields = db.prepare(`
      SELECT
        id, label, value, created_at, include_in_timeline,
        semantic_type, temporal_scope, extraction_method,
        source_text, event_time_text
      FROM friend_custom_fields
      WHERE friend_id = ?
      ORDER BY created_at ASC
    `).all(friend.id).map((row) => ({
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
    list() {
      const rows = db.prepare(`
        SELECT *
        FROM friends
        ORDER BY is_important DESC, datetime(updated_at) DESC, datetime(created_at) DESC
      `).all();

      return rows.map((row) => hydrateFriend(mapFriendRow(row)));
    },

    listByUserId(userId) {
      const rows = db.prepare(`
        SELECT *
        FROM friends
        WHERE user_id = ?
        ORDER BY is_important DESC, datetime(updated_at) DESC, datetime(created_at) DESC
      `).all(userId);

      return rows.map((row) => hydrateFriend(mapFriendRow(row)));
    },

    getById(id) {
      const row = db.prepare('SELECT * FROM friends WHERE id = ?').get(id);
      return row ? hydrateFriend(mapFriendRow(row)) : undefined;
    },

    save(friend) {
      database.runInTransaction(() => {
        db.prepare(`
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
          ON CONFLICT(id) DO UPDATE SET
            user_id = excluded.user_id,
            name = excluded.name,
            nickname = excluded.nickname,
            relationship = excluded.relationship,
            birthday = excluded.birthday,
            gender = excluded.gender,
            age = excluded.age,
            height_cm = excluded.height_cm,
            weight_kg = excluded.weight_kg,
            city = excluded.city,
            hometown = excluded.hometown,
            occupation = excluded.occupation,
            company = excluded.company,
            school = excluded.school,
            major = excluded.major,
            avatar_color = excluded.avatar_color,
            avatar_preset = excluded.avatar_preset,
            avatar_image = excluded.avatar_image,
            last_contact_date = excluded.last_contact_date,
            last_viewed_at = excluded.last_viewed_at,
            is_important = excluded.is_important,
            notes = excluded.notes,
            preferences_json = excluded.preferences_json,
            birthday_recommendation_json = excluded.birthday_recommendation_json,
            ai_profile_json = excluded.ai_profile_json,
            contact_count = excluded.contact_count,
            created_at = excluded.created_at,
            updated_at = excluded.updated_at
        `).run({
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

        db.prepare('DELETE FROM friend_preference_items WHERE friend_id = ?').run(friend.id);
        db.prepare('DELETE FROM friend_basic_info_fields WHERE friend_id = ?').run(friend.id);
        db.prepare('DELETE FROM friend_custom_fields WHERE friend_id = ?').run(friend.id);

        const insertPreferenceItem = db.prepare(`
          INSERT INTO friend_preference_items (id, friend_id, category, value, created_at)
          VALUES (@id, @friend_id, @category, @value, @created_at)
        `);
        for (const item of friend.preferenceItems || []) {
          insertPreferenceItem.run({
            id: item.id,
            friend_id: friend.id,
            category: item.category,
            value: item.value,
            created_at: item.createdAt || friend.updatedAt || new Date().toISOString(),
          });
        }

        const insertBasicInfoField = db.prepare(`
          INSERT INTO friend_basic_info_fields (id, friend_id, label, value, created_at, source_text)
          VALUES (@id, @friend_id, @label, @value, @created_at, @source_text)
        `);
        for (const field of friend.basicInfoFields || []) {
          insertBasicInfoField.run({
            id: field.id,
            friend_id: friend.id,
            label: field.label,
            value: field.value,
            created_at: field.createdAt || friend.updatedAt || new Date().toISOString(),
            source_text: field.sourceText || field.value,
          });
        }

        const insertCustomField = db.prepare(`
          INSERT INTO friend_custom_fields (
            id, friend_id, label, value, created_at, include_in_timeline,
            semantic_type, temporal_scope, extraction_method, source_text, event_time_text
          ) VALUES (
            @id, @friend_id, @label, @value, @created_at, @include_in_timeline,
            @semantic_type, @temporal_scope, @extraction_method, @source_text, @event_time_text
          )
        `);
        for (const field of friend.customFields || []) {
          insertCustomField.run({
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

    remove(id) {
      db.prepare('DELETE FROM friends WHERE id = ?').run(id);
    },

    replaceAllForUser(userId, friends) {
      db.prepare('DELETE FROM friends WHERE user_id = ?').run(userId);
      for (const friend of friends) {
        this.save({
          ...friend,
          userId,
        });
      }
    },
  };
}
