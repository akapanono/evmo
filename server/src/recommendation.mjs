const PRICE_BUCKETS = [
  { key: 'under50', label: '50 元以下' },
  { key: '50to100', label: '50-100 元' },
  { key: '100to300', label: '100-300 元' },
  { key: '300to1000', label: '300-1000 元' },
  { key: '1000plus', label: '1000 元以上' },
];

const DIMENSION_RULES = [
  { key: 'sweetPreference', label: '甜口偏好', keywords: ['甜', '蛋糕', '巧克力', '奶茶', '甜点', '糖'] },
  { key: 'spicyPreference', label: '辣味偏好', keywords: ['辣', '火锅', '烧烤', '川菜', '麻辣'] },
  { key: 'practicality', label: '实用导向', keywords: ['实用', '办公', '效率', '日常', '家居', '收纳', '工具'] },
  { key: 'ritualSense', label: '仪式感', keywords: ['礼盒', '纪念', '花束', '惊喜', '庆祝', '仪式感'] },
  { key: 'aesthetics', label: '审美表达', keywords: ['设计', '香氛', '精致', '好看', '高级', '美感'] },
  { key: 'companionship', label: '陪伴互动', keywords: ['一起', '陪伴', '聚会', '分享', '互动', '见面'] },
  { key: 'exploration', label: '体验探索', keywords: ['旅行', '出游', '体验', '探索', '城市漫游', '尝试'] },
  { key: 'relaxation', label: '放松治愈', keywords: ['治愈', '放松', '助眠', '舒缓', '松弛', '轻松'] },
  { key: 'stimulation', label: '新鲜刺激', keywords: ['游戏', '电竞', '刺激', '潮玩', '热闹', 'livehouse'] },
  { key: 'refinement', label: '精致品质', keywords: ['品质', '高端', '质感', '定制', '收藏', '精品'] },
];

const CATEGORY_HINTS = {
  food: ['零食', '饮料', '甜点', '火锅', '咖啡', '奶茶'],
  entertainment: ['游戏', '潮玩', '桌游', '模型', '票券', '体验'],
  life: ['家居', '香薰', '收纳', '日用', '办公', '护理'],
  social: ['聚会', '分享', '多人', '见面', '社交'],
  travel: ['旅行', '出游', '户外', '漫游', '城市探索'],
  shopping: ['美妆', '配饰', '香氛', '设计感', '高级感'],
  ritual: ['礼盒', '花束', '纪念', '庆祝', '仪式感'],
  other: ['通用', '稳妥', '百搭'],
};

const SCENE_HINTS = {
  birthday: ['生日', '庆生', '蛋糕', '生日礼物'],
  anniversary: ['纪念日', '周年', '节日', '特别日子'],
  gathering: ['聚会', '见面', '一起吃', '一起玩'],
  travel: ['旅行', '出游', 'citywalk', '周末玩'],
  dailyCare: ['日常', '照顾', '关心', '陪伴'],
  safeChoice: ['通用', '稳妥', '不容易出错'],
};

const STYLE_HINTS = {
  practical: ['实用', '效率', '办公', '家居', '耐用'],
  ritual: ['仪式感', '惊喜', '浪漫', '礼物'],
  experience: ['体验', '探索', '旅行', '约会'],
  refined: ['精致', '设计感', '审美', '高级'],
  social: ['聚会', '分享', '氛围', '社交'],
  easygoing: ['轻松', '治愈', '舒服', '放松'],
};

const PRICE_RANK = new Map(PRICE_BUCKETS.map((item, index) => [item.key, index]));

export function buildOccasionRecommendation({
  friend,
  memorial,
  products,
  topScoreLimit = 6,
  previewGiftLimit = 3,
}) {
  const signals = collectSignals(friend, memorial);
  const scoreCards = buildScoreCards(signals).slice(0, topScoreLimit);
  const intentProfile = buildIntentProfile(friend, memorial, scoreCards);
  const rankedProducts = rankProducts(products, intentProfile, signals);

  return {
    gifts: rankedProducts.slice(0, Math.max(previewGiftLimit, 12)).map((item) => item.title),
    scoreCards,
    buckets: buildBuckets(rankedProducts, intentProfile),
    profile: {
      relationshipSummary: intentProfile.relationshipSummary,
      intentTags: intentProfile.intentTags,
      preferredCategories: intentProfile.preferredCategories,
      preferredPriceBuckets: intentProfile.preferredPriceBuckets,
      avoidCategories: intentProfile.avoidCategories,
    },
    updatedAt: new Date().toISOString(),
    source: 'system',
  };
}

export function buildServerOccasionRecommendation(input = {}) {
  const linkedFriends = Array.isArray(input.linkedFriends) && input.linkedFriends.length > 0
    ? input.linkedFriends
    : [input.friend ?? {}];

  return buildOccasionRecommendation({
    friend: mergeFriendsForRecommendation(linkedFriends),
    memorial: input.memorial ?? null,
    products: Array.isArray(input.products) ? input.products : [],
    topScoreLimit: typeof input.topScoreLimit === 'number' ? input.topScoreLimit : 6,
    previewGiftLimit: typeof input.previewGiftLimit === 'number' ? input.previewGiftLimit : 3,
  });
}

function mergeFriendsForRecommendation(friends) {
  return {
    relationship: friends.map((item) => item.relationship).filter(Boolean).join(' / '),
    notes: friends.map((item) => item.notes).filter(Boolean).join(' / '),
    preferences: friends.flatMap((item) => item.preferences ?? []),
    preferenceItems: friends.flatMap((item) => item.preferenceItems ?? []),
    basicInfoFields: friends.flatMap((item) => item.basicInfoFields ?? []),
    customFields: friends.flatMap((item) => item.customFields ?? []),
    aiProfile: {
      overview: friends.map((item) => item.aiProfile?.overview).filter(Boolean).join(' / '),
      traits: friends.flatMap((item) => item.aiProfile?.traits ?? []),
      tasteProfile: friends.flatMap((item) => item.aiProfile?.tasteProfile ?? []),
      interactionStyle: friends.flatMap((item) => item.aiProfile?.interactionStyle ?? []),
      boundaries: friends.flatMap((item) => item.aiProfile?.boundaries ?? []),
    },
  };
}

function collectSignals(friend = {}, memorial = null) {
  const values = [];

  pushSignal(values, friend.relationship, 'relationship');
  pushSignal(values, friend.notes, 'notes');
  pushSignal(values, friend.aiProfile?.overview, 'persona');

  for (const item of friend.preferences ?? []) {
    pushSignal(values, item, 'preference');
  }

  for (const item of friend.preferenceItems ?? []) {
    pushSignal(values, item.value, 'preference');
    pushSignal(values, item.category, 'preference');
  }

  for (const field of friend.basicInfoFields ?? []) {
    pushSignal(values, `${field.label} ${field.value}`, 'basic');
  }

  for (const field of friend.customFields ?? []) {
    pushSignal(values, `${field.label} ${field.value}`, field.temporalScope === 'stable' ? 'stable' : 'timebound');
  }

  for (const item of friend.aiProfile?.traits ?? []) {
    pushSignal(values, item, 'persona');
  }
  for (const item of friend.aiProfile?.tasteProfile ?? []) {
    pushSignal(values, item, 'persona');
  }
  for (const item of friend.aiProfile?.interactionStyle ?? []) {
    pushSignal(values, item, 'persona');
  }
  for (const item of friend.aiProfile?.boundaries ?? []) {
    pushSignal(values, item, 'boundary');
  }

  if (memorial) {
    pushSignal(values, memorial.name, 'memorial');
    pushSignal(values, memorial.note, 'memorial');
  }

  return values;
}

function pushSignal(target, text, source) {
  const raw = typeof text === 'string' ? text.trim() : '';
  if (!raw) {
    return;
  }

  target.push({
    raw,
    text: normalizeText(raw),
    source,
  });
}

function normalizeText(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]+/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function buildScoreCards(signals) {
  return DIMENSION_RULES
    .map((rule) => {
      const matchedSignals = [];
      let score = 0;

      for (const signal of signals) {
        const hitCount = rule.keywords.filter((keyword) => signal.text.includes(normalizeText(keyword))).length;
        if (hitCount === 0) {
          continue;
        }

        if (!matchedSignals.includes(signal.raw)) {
          matchedSignals.push(signal.raw);
        }

        score += hitCount * getSourceWeight(signal.source);
      }

      return {
        key: rule.key,
        label: rule.label,
        score: Math.min(score, 100),
        matchedSignals: matchedSignals.slice(0, 4),
      };
    })
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score);
}

function getSourceWeight(source) {
  if (source === 'preference') return 18;
  if (source === 'memorial') return 16;
  if (source === 'persona') return 14;
  if (source === 'relationship') return 12;
  if (source === 'stable') return 11;
  return 8;
}

function buildIntentProfile(friend = {}, memorial = null, scoreCards = []) {
  const relationshipSummary = String(friend.relationship || memorial?.name || '普通关系').trim() || '普通关系';
  const intentTags = scoreCards.slice(0, 4).map((item) => item.key);
  const preferredCategories = inferPreferredCategories(friend, memorial, intentTags);
  const preferredScenes = inferPreferredScenes(memorial, intentTags, preferredCategories);
  const preferredRecipientStyles = inferPreferredStyles(intentTags, preferredCategories);
  const preferredPriceBuckets = inferPreferredPriceBuckets(friend, memorial, preferredCategories, preferredScenes);
  const avoidCategories = inferAvoidCategories(intentTags, preferredCategories);

  return {
    relationshipSummary,
    intentTags,
    preferredCategories,
    preferredScenes,
    preferredRecipientStyles,
    preferredPriceBuckets,
    avoidCategories,
  };
}

function inferPreferredCategories(friend = {}, memorial = null, intentTags = []) {
  const scores = new Map(Object.keys(CATEGORY_HINTS).map((key) => [key, 0]));
  const combinedText = normalizeText([
    friend.relationship,
    friend.notes,
    ...(friend.preferences ?? []),
    ...(friend.preferenceItems ?? []).flatMap((item) => [item.category, item.value]),
    memorial?.name,
    memorial?.note,
  ].filter(Boolean).join(' '));

  for (const [category, keywords] of Object.entries(CATEGORY_HINTS)) {
    for (const keyword of keywords) {
      if (combinedText.includes(normalizeText(keyword))) {
        scores.set(category, (scores.get(category) ?? 0) + 2);
      }
    }
  }

  if (intentTags.includes('sweetPreference') || intentTags.includes('spicyPreference')) scores.set('food', (scores.get('food') ?? 0) + 2);
  if (intentTags.includes('practicality') || intentTags.includes('relaxation')) scores.set('life', (scores.get('life') ?? 0) + 2);
  if (intentTags.includes('ritualSense')) scores.set('ritual', (scores.get('ritual') ?? 0) + 3);
  if (intentTags.includes('companionship')) scores.set('social', (scores.get('social') ?? 0) + 2);
  if (intentTags.includes('exploration')) scores.set('travel', (scores.get('travel') ?? 0) + 2);
  if (intentTags.includes('aesthetics') || intentTags.includes('refinement')) scores.set('shopping', (scores.get('shopping') ?? 0) + 2);
  if (intentTags.includes('stimulation')) scores.set('entertainment', (scores.get('entertainment') ?? 0) + 2);

  return [...scores.entries()]
    .filter(([, score]) => score > 0)
    .sort((a, b) => b[1] - a[1])
    .map(([category]) => category)
    .slice(0, 3);
}

function inferPreferredScenes(memorial = null, intentTags = [], preferredCategories = []) {
  const text = normalizeText(`${memorial?.name || ''} ${memorial?.note || ''}`);
  const scenes = new Set(['safeChoice']);

  if (text.includes('生日')) scenes.add('birthday');
  if (text.includes('纪念') || text.includes('周年')) scenes.add('anniversary');
  if (preferredCategories.includes('social') || intentTags.includes('companionship')) scenes.add('gathering');
  if (preferredCategories.includes('travel') || intentTags.includes('exploration')) scenes.add('travel');
  if (preferredCategories.includes('life') || intentTags.includes('practicality') || intentTags.includes('relaxation')) scenes.add('dailyCare');

  return [...scenes];
}

function inferPreferredStyles(intentTags = [], preferredCategories = []) {
  const styles = new Set();

  if (preferredCategories.includes('life') || intentTags.includes('practicality')) styles.add('practical');
  if (preferredCategories.includes('ritual') || intentTags.includes('ritualSense')) styles.add('ritual');
  if (preferredCategories.includes('travel') || intentTags.includes('exploration')) styles.add('experience');
  if (preferredCategories.includes('shopping') || intentTags.includes('aesthetics') || intentTags.includes('refinement')) styles.add('refined');
  if (preferredCategories.includes('social') || intentTags.includes('companionship')) styles.add('social');
  if (intentTags.includes('relaxation')) styles.add('easygoing');

  return [...styles];
}

function inferPreferredPriceBuckets(friend = {}, memorial = null, preferredCategories = [], preferredScenes = []) {
  const buckets = new Set();
  const relationText = normalizeText(friend.relationship);
  const memorialText = normalizeText(`${memorial?.name || ''} ${memorial?.note || ''}`);

  if (preferredCategories.includes('food')) buckets.add('50to100');
  if (preferredCategories.includes('life') || preferredCategories.includes('shopping')) buckets.add('100to300');
  if (preferredCategories.includes('travel') || preferredScenes.includes('anniversary')) buckets.add('300to1000');
  if (preferredCategories.includes('ritual')) buckets.add('100to300');
  if (relationText.includes('对象') || relationText.includes('恋人') || memorialText.includes('周年')) buckets.add('300to1000');

  if (buckets.size === 0) {
    buckets.add('100to300');
  }

  return [...buckets];
}

function inferAvoidCategories(intentTags = [], preferredCategories = []) {
  const avoid = new Set();

  if (intentTags.includes('practicality')) avoid.add('ritual');
  if (intentTags.includes('relaxation')) avoid.add('entertainment');
  if (intentTags.includes('sweetPreference')) avoid.add('travel');

  return [...avoid].filter((item) => !preferredCategories.includes(item));
}

function rankProducts(products = [], intentProfile, signals = []) {
  const keywordPool = buildKeywordPool(signals);

  const ranked = products
    .filter((item) => item?.status === 'active')
    .filter((item) => passesRecommendationFilters(item, intentProfile, keywordPool))
    .map((product) => {
      const searchText = buildProductSearchText(product);
      const categoryScore = intentProfile.preferredCategories.includes(product.category) ? 24 : 0;
      const sceneScore = countMatches(product.giftScenes, intentProfile.preferredScenes) * 14;
      const styleScore = countMatches(product.recipientStyles, intentProfile.preferredRecipientStyles) * 12;
      const budgetScore = intentProfile.preferredPriceBuckets.includes(product.priceBucket) ? 12 : getBudgetDistancePenalty(product.priceBucket, intentProfile.preferredPriceBuckets);
      const keywordHits = keywordPool.filter((keyword) => searchText.includes(keyword));
      const keywordScore = keywordHits.length * 8;
      const relationScore = countMatches(product.targetRelationships, [intentProfile.relationshipSummary]) * 10;
      const avoidPenalty = intentProfile.avoidCategories.includes(product.category) ? 24 : 0;

      const totalScore = categoryScore + sceneScore + styleScore + budgetScore + keywordScore + relationScore - avoidPenalty;
      const leadReason = keywordHits.slice(0, 2).join(' / ') || '当前场景';

      return {
        ...product,
        _score: totalScore,
        _matchTags: buildMatchTags(product, intentProfile, keywordHits),
        _reason: buildReason(product, intentProfile, leadReason),
      };
    })
    .filter((item) => item._score > 0)
    .sort((a, b) => b._score - a._score || String(a.title).localeCompare(String(b.title), 'zh-CN'));

  return rerankForDiversity(ranked);
}

function buildKeywordPool(signals) {
  const keywords = new Set();

  for (const signal of signals) {
    for (const word of normalizeText(signal.raw).split(/\s+/)) {
      if (word.length >= 2) {
        keywords.add(word);
      }
    }
  }

  return [...keywords].slice(0, 30);
}

function buildProductSearchText(product) {
  return normalizeText([
    product.title,
    product.summary,
    ...(product.tags ?? []),
    ...(product.attributes ?? []),
    ...(product.giftScenes ?? []),
    ...(product.recipientStyles ?? []),
    ...(CATEGORY_HINTS[product.category] ?? []),
  ].join(' '));
}

function passesRecommendationFilters(product, intentProfile, keywordPool) {
  const scenes = Array.isArray(product.giftScenes) ? product.giftScenes : [];
  const styles = Array.isArray(product.recipientStyles) ? product.recipientStyles : [];
  const attributes = Array.isArray(product.attributes) ? product.attributes : [];
  const titleText = normalizeText(`${product.title || ''} ${product.summary || ''}`);

  if (!product.link) return false;

  if (intentProfile.preferredScenes.includes('anniversary') && !scenes.includes('anniversary') && !scenes.includes('safeChoice')) {
    return false;
  }

  if (intentProfile.preferredScenes.includes('birthday') && scenes.length > 0 && !scenes.includes('birthday') && !scenes.includes('safeChoice')) {
    return false;
  }

  if (intentProfile.preferredRecipientStyles.includes('practical') && product.category === 'ritual' && !styles.includes('practical')) {
    return false;
  }

  if (intentProfile.preferredRecipientStyles.includes('experience') && !styles.includes('experience') && product.category === 'other') {
    return false;
  }

  if (intentProfile.intentTags.includes('sweetPreference') && attributes.includes('spicy')) {
    return false;
  }

  if (intentProfile.intentTags.includes('spicyPreference') && titleText.includes('甜') && !keywordPool.includes('甜')) {
    return false;
  }

  return true;
}

function getBudgetDistancePenalty(bucket, preferredBuckets = []) {
  if (!preferredBuckets.length) return 0;

  const currentRank = PRICE_RANK.get(bucket) ?? 2;
  const nearest = preferredBuckets
    .map((item) => Math.abs((PRICE_RANK.get(item) ?? 2) - currentRank))
    .sort((a, b) => a - b)[0] ?? 0;

  return Math.max(0, 8 - nearest * 4);
}

function countMatches(left = [], right = []) {
  if (!Array.isArray(left) || !Array.isArray(right)) {
    return 0;
  }

  const rightSet = new Set(right.map((item) => normalizeText(item)));
  return left.reduce((count, item) => count + (rightSet.has(normalizeText(item)) ? 1 : 0), 0);
}

function buildMatchTags(product, intentProfile, keywordHits) {
  const tags = new Set();

  if (intentProfile.preferredCategories.includes(product.category)) tags.add(`cat:${product.category}`);
  if (intentProfile.preferredPriceBuckets.includes(product.priceBucket)) tags.add(`budget:${product.priceBucket}`);

  for (const scene of product.giftScenes ?? []) {
    if (intentProfile.preferredScenes.includes(scene)) tags.add(`scene:${scene}`);
  }

  for (const style of product.recipientStyles ?? []) {
    if (intentProfile.preferredRecipientStyles.includes(style)) tags.add(`style:${style}`);
  }

  for (const keyword of keywordHits.slice(0, 2)) {
    tags.add(`keyword:${keyword}`);
  }

  return [...tags];
}

function buildReason(product, intentProfile, leadReason) {
  const matchedScene = (product.giftScenes ?? []).find((item) => intentProfile.preferredScenes.includes(item));
  const matchedStyle = (product.recipientStyles ?? []).find((item) => intentProfile.preferredRecipientStyles.includes(item));

  if (matchedScene && matchedStyle) {
    return `适合${sceneLabel(matchedScene)}，也更贴合${styleLabel(matchedStyle)}这类偏好`;
  }

  if (matchedScene) {
    return `更适合${sceneLabel(matchedScene)}场景，并且和“${leadReason}”更相关`;
  }

  if (matchedStyle) {
    return `更贴合${styleLabel(matchedStyle)}这类偏好，整体更稳妥`;
  }

  return `和“${leadReason}”这类偏好更接近`;
}

function sceneLabel(value) {
  return {
    birthday: '生日',
    anniversary: '纪念日',
    gathering: '聚会见面',
    travel: '旅行出游',
    dailyCare: '日常关心',
    safeChoice: '通用送礼',
  }[value] || value;
}

function styleLabel(value) {
  return {
    practical: '偏实用',
    ritual: '偏仪式感',
    experience: '偏体验型',
    refined: '偏精致审美',
    social: '偏社交氛围',
    easygoing: '偏轻松治愈',
  }[value] || value;
}

function rerankForDiversity(items) {
  const categorySeen = new Map();
  const priceSeen = new Map();

  return items
    .map((item) => {
      const nextScore = item._score
        - (categorySeen.get(item.category) ?? 0) * 6
        - (priceSeen.get(item.priceBucket) ?? 0) * 3;

      categorySeen.set(item.category, (categorySeen.get(item.category) ?? 0) + 1);
      priceSeen.set(item.priceBucket, (priceSeen.get(item.priceBucket) ?? 0) + 1);

      return {
        ...item,
        _score: nextScore,
      };
    })
    .sort((a, b) => b._score - a._score || String(a.title).localeCompare(String(b.title), 'zh-CN'));
}

function buildBuckets(rankedProducts, intentProfile) {
  return PRICE_BUCKETS
    .map((bucket) => ({
      key: bucket.key,
      label: bucket.label,
      items: rankedProducts
        .filter((item) => item.priceBucket === bucket.key)
        .slice(0, 12)
        .map((product) => ({
          id: product.id,
          title: product.title,
          priceLabel: product.priceLabel || bucket.label,
          link: product.link || 'about:blank',
          reason: product._reason,
          matchTags: product._matchTags,
        })),
    }))
    .filter((bucket) => bucket.items.length > 0)
    .sort((a, b) => {
      const aPreferred = intentProfile.preferredPriceBuckets.includes(a.key) ? 1 : 0;
      const bPreferred = intentProfile.preferredPriceBuckets.includes(b.key) ? 1 : 0;
      if (bPreferred !== aPreferred) return bPreferred - aPreferred;
      return (PRICE_RANK.get(a.key) ?? 0) - (PRICE_RANK.get(b.key) ?? 0);
    });
}
