const SOURCE_WEIGHT = {
  preference: 18,
  stable: 15,
  memorial: 14,
  relationship: 13,
  persona: 11,
  basic: 9,
};

const PRICE_BUCKETS = [
  { key: 'under50', label: '50元以内' },
  { key: '50to100', label: '50-100元' },
  { key: '100to300', label: '100-300元' },
  { key: '300to1000', label: '300-1000元' },
  { key: '1000plus', label: '1000元以上' },
];

const DIMENSION_RULES = [
  {
    key: 'stimulation',
    label: '刺激度',
    keywords: ['游戏', '电竞', '开黑', '英雄联盟', '王者', '第五人格', '桌游', '牌', '竞技', 'livehouse', '蹦迪'],
  },
  {
    key: 'refinement',
    label: '精致感',
    keywords: ['香氛', '香水', '蜡烛', '护肤', '化妆', '口红', '饰品', '质感', '高级', '精致', '审美'],
  },
  {
    key: 'sweetPreference',
    label: '甜感偏好',
    keywords: ['甜', '巧克力', '蛋糕', '奶茶', '零食', '水果', '糖', '布丁', '甜品'],
  },
  {
    key: 'spicyPreference',
    label: '辣感偏好',
    keywords: ['辣', '火锅', '串串', '烧烤', '麻辣', '川菜', '湘菜'],
  },
  {
    key: 'ritualSense',
    label: '仪式感',
    keywords: ['生日', '纪念日', '礼盒', '鲜花', '相册', '照片', '纪念', '惊喜', '庆祝', '仪式感'],
  },
  {
    key: 'companionship',
    label: '陪伴感',
    keywords: ['一起', '陪', '聚会', '约饭', '聊天', '见面', '分享', '朋友', '相处', '桌游'],
  },
  {
    key: 'practicality',
    label: '实用度',
    keywords: ['实用', '通勤', '办公', '收纳', '杯子', '数码', '键盘', '耳机', '家用', '出行'],
  },
  {
    key: 'aesthetics',
    label: '审美度',
    keywords: ['好看', '拍照', '穿搭', '设计', '颜值', '风格', '艺术', '音乐', '周边'],
  },
  {
    key: 'relaxation',
    label: '松弛感',
    keywords: ['放松', '安静', '助眠', '香薰', '泡澡', '疗愈', '舒缓', '咖啡', '茶'],
  },
  {
    key: 'exploration',
    label: '探索欲',
    keywords: ['旅行', '旅游', '露营', 'citywalk', '飞机', '新鲜', '尝试', '体验', '打卡'],
  },
];

const CATEGORY_KEYWORDS = {
  food: ['吃', '喝', '水果', '零食', '蔬菜', '酒席', '奶茶', '火锅', '咖啡', '甜品'],
  entertainment: ['游戏', '英雄联盟', '第五人格', '桌游', '牌', '音乐', '电影', '周边', '动漫'],
  life: ['生活', '香薰', '助眠', '家居', '收纳', '舒适', '放松'],
  social: ['聚会', '见面', '约饭', '分享', '朋友', '社交', '啤酒'],
  travel: ['旅行', '露营', '飞机', '出行', '打卡', 'citywalk'],
  shopping: ['护肤', '化妆', '精致', '饰品', '高级', '奢侈品'],
  ritual: ['生日', '纪念日', '礼物', '礼盒', '相册', '鲜花', '纪念'],
  other: ['解压', '陪伴', '心意'],
};

export function buildOccasionRecommendation({
  friend,
  memorial,
  products,
  topScoreLimit = 6,
  previewGiftLimit = 3,
}) {
  const signals = collectSignals(friend, memorial);
  const scoreCards = buildScoreCards(signals, topScoreLimit);
  const rankedProducts = rankProducts(products, scoreCards, signals, friend, memorial);

  return {
    gifts: rankedProducts.slice(0, Math.max(previewGiftLimit, 12)).map((item) => item.title),
    scoreCards,
    buckets: buildBuckets(rankedProducts),
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

function buildScoreCards(signals, topScoreLimit) {
  return DIMENSION_RULES
    .map((rule) => {
      const matchedSignals = [];
      const matchedSources = new Set();
      let score = 0;

      for (const signal of signals) {
        const matchedKeywords = rule.keywords.filter((keyword) => signal.text.includes(keyword));
        if (matchedKeywords.length === 0) continue;
        matchedSources.add(signal.source);
        if (!matchedSignals.includes(signal.raw)) {
          matchedSignals.push(signal.raw);
        }
        score += (SOURCE_WEIGHT[signal.source] ?? 8) * matchedKeywords.length;
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
}

function mergeFriendsForRecommendation(friends) {
  return {
    relationship: friends.map((item) => item.relationship).filter(Boolean).join(' '),
    gender: friends.map((item) => item.gender).filter(Boolean).join(' '),
    notes: friends.map((item) => item.notes).filter(Boolean).join(' '),
    preferences: friends.flatMap((item) => item.preferences ?? []),
    preferenceItems: friends.flatMap((item) => item.preferenceItems ?? []),
    basicInfoFields: friends.flatMap((item) => item.basicInfoFields ?? []),
    customFields: friends.flatMap((item) => item.customFields ?? []),
    aiProfile: {
      traits: friends.flatMap((item) => item.aiProfile?.traits ?? []),
      tasteProfile: friends.flatMap((item) => item.aiProfile?.tasteProfile ?? []),
      interactionStyle: friends.flatMap((item) => item.aiProfile?.interactionStyle ?? []),
    },
  };
}

function collectSignals(friend = {}, memorial = null) {
  const values = [];
  pushSignal(values, friend.relationship, 'relationship');
  pushSignal(values, friend.gender, 'basic');
  pushSignal(values, friend.notes, 'stable');

  for (const item of friend.preferences ?? []) {
    pushSignal(values, item, 'preference');
  }
  for (const item of friend.preferenceItems ?? []) {
    pushSignal(values, item.value, 'preference');
  }
  for (const field of friend.basicInfoFields ?? []) {
    pushSignal(values, `${field.label} ${field.value}`, 'basic');
  }
  for (const field of friend.customFields ?? []) {
    if (field.temporalScope === 'stable') {
      pushSignal(values, field.value, 'stable');
      pushSignal(values, `${field.label} ${field.value}`, 'stable');
    }
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

  if (memorial) {
    pushSignal(values, memorial.name, 'memorial');
    pushSignal(values, memorial.note, 'memorial');
  }

  return values;
}

function collectPreferenceSignals(friend = {}, memorial = null) {
  const values = [];

  for (const item of friend.preferences ?? []) {
    pushSignal(values, item, 'preference');
  }
  for (const item of friend.preferenceItems ?? []) {
    pushSignal(values, item.value, 'preference');
  }

  if (memorial?.name) {
    pushSignal(values, memorial.name, 'memorial');
  }

  return values;
}

function pushSignal(values, text, source) {
  if (typeof text !== 'string') return;
  const raw = text.trim();
  if (!raw) return;
  values.push({
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

function splitKeywords(text) {
  return normalizeText(text)
    .split(/\s+/)
    .map((item) => item.trim())
    .filter((item) => item.length >= 2);
}

function buildKeywordPool(signals, scoreCards, friend = {}, memorial = null) {
  const keywords = new Set();

  for (const signal of signals) {
    if (signal.text && signal.text.length <= 16) keywords.add(signal.text);
    for (const keyword of splitKeywords(signal.raw)) {
      keywords.add(keyword);
    }
  }

  for (const score of scoreCards) {
    keywords.add(normalizeText(score.label));
    for (const signal of score.matchedSignals ?? []) {
      for (const keyword of splitKeywords(signal)) {
        keywords.add(keyword);
      }
    }
  }

  for (const item of friend.preferenceItems ?? []) {
    if (item.value) keywords.add(normalizeText(item.value));
    if (item.category) keywords.add(normalizeText(item.category));
  }

  if (memorial?.name) {
    const normalizedName = normalizeText(memorial.name);
    if (normalizedName.length <= 16) {
      keywords.add(normalizedName);
    }
  }
  if (memorial?.note) {
    for (const keyword of splitKeywords(memorial.note)) {
      keywords.add(keyword);
    }
  }

  return [...keywords]
    .filter((item) => item && item.length >= 2 && item.length <= 16)
    .slice(0, 40);
}

function buildRelationshipKeywords(friend = {}) {
  const relationship = normalizeText(friend.relationship);
  if (!relationship) return [];
  return [...new Set([relationship, ...splitKeywords(relationship)])];
}

function buildSearchText(product) {
  return [
    product.title,
    product.summary,
    ...(product.tags ?? []),
    ...(product.attributes ?? []),
    ...(CATEGORY_KEYWORDS[product.category] ?? []),
  ]
    .map(normalizeText)
    .filter(Boolean)
    .join(' ');
}

function getDimensionScoreMap(scoreCards) {
  return new Map(scoreCards.map((item) => [item.key, item]));
}

function rankProducts(products, scoreCards, signals, friend = {}, memorial = null) {
  const activeProducts = Array.isArray(products) ? products.filter((item) => item?.status === 'active') : [];
  if (activeProducts.length === 0) {
    return [];
  }

  const preferenceSignals = collectPreferenceSignals(friend, memorial);
  const preferenceKeywordPool = buildKeywordPool(preferenceSignals, scoreCards, friend, memorial);
  const keywordPool = buildKeywordPool(signals, scoreCards, friend, memorial);
  const relationshipKeywords = buildRelationshipKeywords(friend);
  const dimensionMap = getDimensionScoreMap(scoreCards);
  const featureProfile = buildFeatureProfile(scoreCards, signals, friend, memorial);
  const candidates = generateCandidates(activeProducts, keywordPool, relationshipKeywords, dimensionMap, featureProfile);

  const ranked = candidates
    .map((product) => {
      const matchedDimensions = Array.isArray(product.matchDimensions)
        ? product.matchDimensions
            .map((item) => dimensionMap.get(item))
            .filter(Boolean)
            .sort((a, b) => b.score - a.score)
        : [];

      const dimensionScore = matchedDimensions.reduce(
        (total, item) => total + Math.max(10, Math.round(item.score * 0.55)),
        0,
      );

      let keywordScore = 0;
      const matchedKeywords = [];
      for (const keyword of keywordPool) {
        if (!keyword || keyword.length < 2) continue;
        if (!product._searchText.includes(keyword)) continue;
        matchedKeywords.push(keyword);
        keywordScore += keyword.length >= 4 ? 14 : 8;
      }

      const matchedPreferenceKeywords = [];
      for (const keyword of preferenceKeywordPool) {
        if (!keyword || keyword.length < 2) continue;
        if (!product._searchText.includes(keyword)) continue;
        matchedPreferenceKeywords.push(keyword);
      }

      let relationshipScore = 0;
      if (Array.isArray(product.targetRelationships) && product.targetRelationships.length > 0) {
        for (const keyword of relationshipKeywords) {
          if (product.targetRelationships.some((item) => normalizeText(item) === keyword)) {
            relationshipScore += 12;
          }
        }
      }

      const categoryScore = (CATEGORY_KEYWORDS[product.category] ?? []).reduce((total, keyword) => (
        keywordPool.includes(normalizeText(keyword)) ? total + 4 : total
      ), 0);
      const featureScore = (featureProfile.categoryWeights[product.category] ?? 0) * 6;

      const totalScore = dimensionScore + keywordScore + relationshipScore + categoryScore + featureScore;
      const leadDimension = matchedDimensions[0];
      const leadReason = matchedPreferenceKeywords.slice(0, 3).join(' / ')
        || matchedKeywords.slice(0, 3).join(' / ')
        || '关键词';

      return {
        ...product,
        _score: totalScore,
        _reason: leadDimension
          ? `更偏向 ${leadDimension.label}，参考了 ${leadReason}`
          : `和 ${leadReason} 更相关`,
      };
    })
    .filter((item) => item._score > 0)
    .sort((a, b) => {
      if (b._score !== a._score) return b._score - a._score;
      return String(a.title).localeCompare(String(b.title), 'zh-CN');
    });

  return rerankForDiversity(ranked).map(({ _searchText, ...item }) => item);
}

function buildBuckets(rankedProducts) {
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
        })),
    }))
    .filter((bucket) => bucket.items.length > 0);
}

function generateCandidates(products, keywordPool, relationshipKeywords, dimensionMap, featureProfile) {
  return products
    .map((product) => {
      const searchText = buildSearchText(product);
      const dimensionHits = Array.isArray(product.matchDimensions)
        ? product.matchDimensions.filter((item) => dimensionMap.has(item)).length
        : 0;
      const keywordHits = keywordPool.reduce((count, keyword) => (
        keyword && searchText.includes(keyword) ? count + 1 : count
      ), 0);
      const relationshipHits = Array.isArray(product.targetRelationships)
        ? relationshipKeywords.reduce((count, keyword) => (
            product.targetRelationships.some((item) => normalizeText(item) === keyword) ? count + 1 : count
          ), 0)
        : 0;
      const featureHits = featureProfile.categoryWeights[product.category] ?? 0;

      return {
        ...product,
        _searchText: searchText,
        _candidateScore: (dimensionHits * 16) + (keywordHits * 12) + (relationshipHits * 10) + (featureHits * 8),
      };
    })
    .filter((product) => product._candidateScore > 0)
    .sort((a, b) => b._candidateScore - a._candidateScore)
    .slice(0, 120);
}

function buildFeatureProfile(scoreCards, signals, friend = {}, memorial = null) {
  const categoryWeights = {
    food: 0,
    entertainment: 0,
    life: 0,
    social: 0,
    travel: 0,
    shopping: 0,
    ritual: 0,
    other: 0,
  };

  for (const item of friend.preferenceItems ?? []) {
    if (item.category === 'food') categoryWeights.food += 2;
    if (item.category === 'entertainment') categoryWeights.entertainment += 2;
    if (item.category === 'lifestyle') categoryWeights.life += 2;
    if (item.category === 'social') categoryWeights.social += 2;
    if (item.category === 'travel') categoryWeights.travel += 2;
    if (item.category === 'shopping') categoryWeights.shopping += 2;
    if (item.category === 'other') categoryWeights.other += 1;
  }

  for (const score of scoreCards) {
    if (score.key === 'sweetPreference' || score.key === 'spicyPreference') categoryWeights.food += 2;
    if (score.key === 'stimulation') categoryWeights.entertainment += 2;
    if (score.key === 'companionship') categoryWeights.social += 2;
    if (score.key === 'practicality' || score.key === 'relaxation') categoryWeights.life += 2;
    if (score.key === 'exploration') categoryWeights.travel += 2;
    if (score.key === 'refinement' || score.key === 'aesthetics') categoryWeights.shopping += 2;
    if (score.key === 'ritualSense') categoryWeights.ritual += 2;
  }

  const memorialText = normalizeText(`${memorial?.name || ''} ${memorial?.note || ''}`);
  if (memorialText.includes('生日') || memorialText.includes('纪念')) {
    categoryWeights.ritual += 2;
  }

  for (const signal of signals) {
    if (signal.text.includes('水果') || signal.text.includes('零食') || signal.text.includes('蔬菜')) categoryWeights.food += 1;
    if (signal.text.includes('游戏') || signal.text.includes('英雄联盟') || signal.text.includes('第五人格')) categoryWeights.entertainment += 1;
    if (signal.text.includes('飞机') || signal.text.includes('旅行') || signal.text.includes('露营')) categoryWeights.travel += 1;
    if (signal.text.includes('音乐') || signal.text.includes('奢侈品') || signal.text.includes('护肤')) categoryWeights.shopping += 1;
  }

  return { categoryWeights };
}

function rerankForDiversity(items) {
  const categorySeen = new Map();
  const bucketSeen = new Map();

  return [...items]
    .sort((a, b) => b._score - a._score)
    .map((item) => {
      const categoryPenalty = (categorySeen.get(item.category) ?? 0) * 6;
      const bucketPenalty = (bucketSeen.get(item.priceBucket) ?? 0) * 3;
      return {
        ...item,
        _score: item._score - categoryPenalty - bucketPenalty,
      };
    })
    .sort((a, b) => b._score - a._score)
    .map((item) => {
      categorySeen.set(item.category, (categorySeen.get(item.category) ?? 0) + 1);
      bucketSeen.set(item.priceBucket, (bucketSeen.get(item.priceBucket) ?? 0) + 1);
      return item;
    });
}
