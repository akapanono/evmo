import { buildOrderByRecent, buildUpsertClause } from '../database/sql-helpers.mjs';

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
    giftScenes: safeParseJson(row.gift_scenes_json, []),
    recipientStyles: safeParseJson(row.recipient_styles_json, []),
    riskLevel: row.risk_level || 'medium',
    link: row.link,
    summary: row.summary,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function createProductRepository(database) {
  return {
    async list() {
      const rows = await database.queryAll(`
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
          gift_scenes_json,
          recipient_styles_json,
          risk_level,
          link,
          summary,
          created_at,
          updated_at
        FROM products
        ORDER BY ${buildOrderByRecent(database, ['updated_at', 'created_at'])}
      `);

      return rows.map(mapRow);
    },

    async saveAll(products) {
      const upsertSql = `
        INSERT INTO products (
          id, title, category, status, price_bucket, price_label, attributes_json, tags_json,
          match_dimensions_json, target_relationships_json, gift_scenes_json, recipient_styles_json,
          risk_level, link, summary, created_at, updated_at
        ) VALUES (
          @id, @title, @category, @status, @price_bucket, @price_label, @attributes_json, @tags_json,
          @match_dimensions_json, @target_relationships_json, @gift_scenes_json, @recipient_styles_json,
          @risk_level, @link, @summary, @created_at, @updated_at
        )
        ${buildUpsertClause(database, ['id'], [
          'title',
          'category',
          'status',
          'price_bucket',
          'price_label',
          'attributes_json',
          'tags_json',
          'match_dimensions_json',
          'target_relationships_json',
          'gift_scenes_json',
          'recipient_styles_json',
          'risk_level',
          'link',
          'summary',
          'created_at',
          'updated_at',
        ])}
      `;

      const incomingIds = new Set(products.map((item) => item.id));
      await database.runInTransaction(async (tx = database) => {
        for (const item of products) {
          await tx.execute(upsertSql, {
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
            gift_scenes_json: JSON.stringify(item.giftScenes || []),
            recipient_styles_json: JSON.stringify(item.recipientStyles || []),
            risk_level: item.riskLevel || 'medium',
            link: item.link || '',
            summary: item.summary || '',
            created_at: item.createdAt || new Date().toISOString(),
            updated_at: item.updatedAt || new Date().toISOString(),
          });
        }

        const existingIds = (await tx.queryAll('SELECT id FROM products')).map((row) => row.id);
        for (const existingId of existingIds) {
          if (!incomingIds.has(existingId)) {
            await tx.execute('DELETE FROM products WHERE id = ?', [existingId]);
          }
        }
      });

      return products;
    },

    async upsertMany(products) {
      const upsertSql = `
        INSERT INTO products (
          id, title, category, status, price_bucket, price_label, attributes_json, tags_json,
          match_dimensions_json, target_relationships_json, gift_scenes_json, recipient_styles_json,
          risk_level, link, summary, created_at, updated_at
        ) VALUES (
          @id, @title, @category, @status, @price_bucket, @price_label, @attributes_json, @tags_json,
          @match_dimensions_json, @target_relationships_json, @gift_scenes_json, @recipient_styles_json,
          @risk_level, @link, @summary, @created_at, @updated_at
        )
        ${buildUpsertClause(database, ['id'], [
          'title',
          'category',
          'status',
          'price_bucket',
          'price_label',
          'attributes_json',
          'tags_json',
          'match_dimensions_json',
          'target_relationships_json',
          'gift_scenes_json',
          'recipient_styles_json',
          'risk_level',
          'link',
          'summary',
          'updated_at',
        ])}
      `;

      await database.runInTransaction(async (tx = database) => {
        for (const item of products) {
          await tx.execute(upsertSql, {
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
            gift_scenes_json: JSON.stringify(item.giftScenes || []),
            recipient_styles_json: JSON.stringify(item.recipientStyles || []),
            risk_level: item.riskLevel || 'medium',
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
