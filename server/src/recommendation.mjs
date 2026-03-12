const SOURCE_WEIGHT = {
  preference: 18,
  stable: 15,
  memorial: 14,
  relationship: 13,
  persona: 11,
  basic: 9,
};

const DIMENSION_RULES = [
  { key: 'stimulation', label: '刺激度', patterns: [/游戏|电竞|livehouse|演出|竞技|王者|英雄联盟|金铲铲|剧本杀|桌游/i], fallbackGifts: ['游戏点卡包', '联名周边', '演出体验券'] },
  { key: 'refinement', label: '精致感', patterns: [/香水|香薰|护肤|首饰|花束|拍照|穿搭|美妆|精致|质感/i], fallbackGifts: ['香薰礼盒', '花艺礼盒', '质感配饰'] },
  { key: 'sweetPreference', label: '甜感偏好', patterns: [/甜品|蛋糕|巧克力|奶茶|甜|布丁|冰淇淋/i], fallbackGifts: ['甜品礼盒', '巧克力礼盒', '蛋糕券'] },
  { key: 'spicyPreference', label: '辣感偏好', patterns: [/火锅|烧烤|辣|川菜|湘菜|麻辣|串串/i], fallbackGifts: ['火锅礼券', '风味调料礼盒', '烧烤体验券'] },
  { key: 'ritualSense', label: '仪式感', patterns: [/生日|纪念日|仪式感|庆祝|鲜花|拍立得|纪念|礼物/i], fallbackGifts: ['纪念相框', '定制贺卡礼盒', '仪式感花束'] },
  { key: 'companionship', label: '陪伴感', patterns: [/陪伴|一起|约饭|见面|聊天|聚会|相处|约会/i], fallbackGifts: ['双人体验券', '桌游礼盒', '陪伴型礼盒'] },
  { key: 'practicality', label: '实用度', patterns: [/实用|办公|收纳|效率|通勤|日常|方便|家居/i], fallbackGifts: ['办公好物盒', '收纳礼盒', '通勤实用套装'] },
  { key: 'aesthetics', label: '审美度', patterns: [/设计|艺术|展览|摄影|审美|家居|配色|手作/i], fallbackGifts: ['设计摆件', '艺术展门票', '手作礼盒'] },
  { key: 'relaxation', label: '松弛感', patterns: [/安静|咖啡|茶|露营|放松|疗愈|舒服|宅|阅读/i], fallbackGifts: ['咖啡礼盒', '茶具小礼盒', '阅读放松套装'] },
  { key: 'exploration', label: '探索欲', patterns: [/旅行|旅游|citywalk|新鲜|体验|探索|尝试|逛展/i], fallbackGifts: ['城市漫游礼盒', '旅行收纳包', '体验券合集'] },
];

const PRICE_BUCKETS = [
  { key: 'under50', label: '50元以内' },
  { key: '50to100', label: '50-100元' },
  { key: '100to300', label: '100-300元' },
  { key: '300to1000', label: '300-1000元' },
  { key: '1000plus', label: '1000元以上' },
];

export function buildOccasionRecommendation({ friend, memorial, products, topScoreLimit = 6, previewGiftLimit = 3 }) {
  const signals = collectSignals(friend, memorial);
  const scoreCards = DIMENSION_RULES
    .map((rule) => {
      const matchedSignals = [];
      const matchedSources = new Set();
      let score = 0;

      for (const signal of signals) {
        const matched = rule.patterns.some((pattern) => pattern.test(signal.text));
        if (!matched) continue;
        if (!matchedSignals.includes(signal.text)) matchedSignals.push(signal.text);
        matchedSources.add(signal.source);
        score += SOURCE_WEIGHT[signal.source] ?? 8;
      }

      if (matchedSignals.length >= 2) score += 8;
      if (matchedSignals.length >= 3) score += 10;
      if (matchedSources.size >= 2) score += 8;

      return {
        key: rule.key,
        label: rule.label,
        score: Math.min(Math.round(score), 100),
        matchedSignals: matchedSignals.slice(0, 4),
      };
    })
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, topScoreLimit);

  return {
    gifts: buildPreviewGifts(scoreCards, products, previewGiftLimit),
    scoreCards,
    buckets: buildBuckets(scoreCards, products),
    updatedAt: new Date().toISOString(),
    source: 'system',
  };
}

function collectSignals(friend = {}, memorial = null) {
  const values = [];
  pushValues(values, friend.relationship, 'relationship');
  pushValues(values, friend.gender, 'basic');
  pushValues(values, friend.notes, 'stable');

  for (const item of friend.preferences ?? []) pushValues(values, item, 'preference');
  for (const item of friend.preferenceItems ?? []) pushValues(values, item.value, 'preference');
  for (const field of friend.basicInfoFields ?? []) pushValues(values, `${field.label} ${field.value}`, 'basic');
  for (const field of friend.customFields ?? []) {
    if (field.temporalScope === 'stable') {
      pushValues(values, field.value, 'stable');
      pushValues(values, `${field.label} ${field.value}`, 'stable');
    }
  }
  for (const item of friend.aiProfile?.traits ?? []) pushValues(values, item, 'persona');
  for (const item of friend.aiProfile?.tasteProfile ?? []) pushValues(values, item, 'persona');
  for (const item of friend.aiProfile?.interactionStyle ?? []) pushValues(values, item, 'persona');

  if (memorial) {
    pushValues(values, memorial.name, 'memorial');
    pushValues(values, memorial.note, 'memorial');
  }
  return values;
}

function pushValues(values, text, source) {
  if (typeof text !== 'string') return;
  const normalized = text.trim();
  if (!normalized) return;
  values.push({ text: normalized, source });
}

function buildPreviewGifts(scores, products, limit) {
  const selected = [];
  for (const score of scores) {
    const product = products.find((item) =>
      item.status === 'active'
      && Array.isArray(item.matchDimensions)
      && item.matchDimensions.includes(score.key),
    );
    if (product && !selected.includes(product.title)) selected.push(product.title);
    if (selected.length >= limit) return selected;
  }

  for (const score of scores) {
    const rule = DIMENSION_RULES.find((item) => item.key === score.key);
    if (!rule) continue;
    for (const gift of rule.fallbackGifts) {
      if (!selected.includes(gift)) selected.push(gift);
      if (selected.length >= limit) return selected;
    }
  }
  return selected;
}

function buildBuckets(scores, products) {
  return PRICE_BUCKETS.map((bucket) => {
    const items = [];
    for (const score of scores.slice(0, 3)) {
      const matchedProducts = products.filter((item) =>
        item.status === 'active'
        && item.priceBucket === bucket.key
        && Array.isArray(item.matchDimensions)
        && item.matchDimensions.includes(score.key),
      );
      for (const product of matchedProducts) {
        items.push({
          id: product.id,
          title: product.title,
          priceLabel: product.priceLabel || bucket.label,
          link: product.link || '',
          reason: `当前更偏向 ${score.label}，所以把 ${product.title} 放在这个价位推荐里。`,
        });
      }
    }

    return {
      key: bucket.key,
      label: bucket.label,
      items,
    };
  }).filter((bucket) => bucket.items.length > 0);
}
