function safeParseJson(value, fallback) {
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function mapRow(row) {
  return {
    id: row.id,
    title: row.title,
    category: row.category,
    status: row.status,
    priceBucket: row.price_bucket,
    priceLabel: row.price_label,
    attributes: safeParseJson(row.attributes_json, []),
    tags: safeParseJson(row.tags_json, []),
    matchDimensions: safeParseJson(row.match_dimensions_json, []),
    targetRelationships: safeParseJson(row.target_relationships_json, []),
    link: row.link,
    summary: row.summary,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function createProductRepository(database) {
  const db = database.getDb();

  return {
    list() {
      const rows = db.prepare(`
        SELECT
          id,
          title,
          category,
          status,
          price_bucket,
          price_label,
          attributes_json,
          tags_json,
          match_dimensions_json,
          target_relationships_json,
          link,
          summary,
          created_at,
          updated_at
        FROM products
        ORDER BY datetime(updated_at) DESC, datetime(created_at) DESC
      `).all();

      return rows.map(mapRow);
    },

    saveAll(products) {
      const insert = db.prepare(`
        INSERT INTO products (
          id, title, category, status, price_bucket, price_label, attributes_json, tags_json,
          match_dimensions_json, target_relationships_json, link, summary, created_at, updated_at
        ) VALUES (
          @id, @title, @category, @status, @price_bucket, @price_label, @attributes_json, @tags_json,
          @match_dimensions_json, @target_relationships_json, @link, @summary, @created_at, @updated_at
        )
        ON CONFLICT(id) DO UPDATE SET
          title = excluded.title,
          category = excluded.category,
          status = excluded.status,
          price_bucket = excluded.price_bucket,
          price_label = excluded.price_label,
          attributes_json = excluded.attributes_json,
          tags_json = excluded.tags_json,
          match_dimensions_json = excluded.match_dimensions_json,
          target_relationships_json = excluded.target_relationships_json,
          link = excluded.link,
          summary = excluded.summary,
          created_at = excluded.created_at,
          updated_at = excluded.updated_at
      `);

      const incomingIds = new Set(products.map((item) => item.id));
      database.runInTransaction(() => {
        for (const item of products) {
          insert.run({
            id: item.id,
            title: item.title || '',
            category: item.category || 'other',
            status: item.status || 'draft',
            price_bucket: item.priceBucket || '100to300',
            price_label: item.priceLabel || '',
            attributes_json: JSON.stringify(item.attributes || []),
            tags_json: JSON.stringify(item.tags || []),
            match_dimensions_json: JSON.stringify(item.matchDimensions || []),
            target_relationships_json: JSON.stringify(item.targetRelationships || []),
            link: item.link || '',
            summary: item.summary || '',
            created_at: item.createdAt || new Date().toISOString(),
            updated_at: item.updatedAt || new Date().toISOString(),
          });
        }

        const existingIds = db.prepare('SELECT id FROM products').all().map((row) => row.id);
        for (const existingId of existingIds) {
          if (!incomingIds.has(existingId)) {
            db.prepare('DELETE FROM products WHERE id = ?').run(existingId);
          }
        }
      });

      return products;
    },

    upsertMany(products) {
      const insert = db.prepare(`
        INSERT INTO products (
          id, title, category, status, price_bucket, price_label, attributes_json, tags_json,
          match_dimensions_json, target_relationships_json, link, summary, created_at, updated_at
        ) VALUES (
          @id, @title, @category, @status, @price_bucket, @price_label, @attributes_json, @tags_json,
          @match_dimensions_json, @target_relationships_json, @link, @summary, @created_at, @updated_at
        )
        ON CONFLICT(id) DO UPDATE SET
          title = excluded.title,
          category = excluded.category,
          status = excluded.status,
          price_bucket = excluded.price_bucket,
          price_label = excluded.price_label,
          attributes_json = excluded.attributes_json,
          tags_json = excluded.tags_json,
          match_dimensions_json = excluded.match_dimensions_json,
          target_relationships_json = excluded.target_relationships_json,
          link = excluded.link,
          summary = excluded.summary,
          updated_at = excluded.updated_at
      `);

      database.runInTransaction(() => {
        for (const item of products) {
          insert.run({
            id: item.id,
            title: item.title || '',
            category: item.category || 'other',
            status: item.status || 'draft',
            price_bucket: item.priceBucket || '100to300',
            price_label: item.priceLabel || '',
            attributes_json: JSON.stringify(item.attributes || []),
            tags_json: JSON.stringify(item.tags || []),
            match_dimensions_json: JSON.stringify(item.matchDimensions || []),
            target_relationships_json: JSON.stringify(item.targetRelationships || []),
            link: item.link || '',
            summary: item.summary || '',
            created_at: item.createdAt || new Date().toISOString(),
            updated_at: item.updatedAt || new Date().toISOString(),
          });
        }
      });

      return products;
    },
  };
}
