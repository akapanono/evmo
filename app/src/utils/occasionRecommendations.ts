import type { Friend } from '@/types/friend';
import type { MemorialDay } from '@/types/memorial';
import type {
  GiftSuggestionBucket,
  GiftSuggestionItem,
  OccasionRecommendation,
  RecommendationScore,
} from '@/types/recommendation';

interface ScoreSignal {
  text: string;
  source: 'preference' | 'basic' | 'stable' | 'relationship' | 'persona' | 'memorial';
}

interface DimensionRule {
  key: string;
  label: string;
  patterns: RegExp[];
  previewGifts: string[];
  bucketTemplates: Record<GiftSuggestionBucket['key'], Array<{ title: string; reason: string }>>;
}

const CATEGORY_LABELS: Record<string, string> = {
  food: '饮食',
  entertainment: '娱乐',
  lifestyle: '生活',
  social: '社交',
  travel: '出行',
  shopping: '消费',
  other: '其他',
};

const SOURCE_WEIGHT: Record<ScoreSignal['source'], number> = {
  preference: 18,
  stable: 15,
  memorial: 14,
  relationship: 13,
  persona: 11,
  basic: 9,
};

const PRICE_BUCKETS: Array<{ key: GiftSuggestionBucket['key']; label: string; priceLabel: string }> = [
  { key: 'under50', label: '50元以内', priceLabel: '50元以内' },
  { key: '50to100', label: '50-100元', priceLabel: '50-100元' },
  { key: '100to300', label: '100-300元', priceLabel: '100-300元' },
  { key: '300to1000', label: '300-1000元', priceLabel: '300-1000元' },
  { key: '1000plus', label: '1000元以上', priceLabel: '1000元以上' },
];

const DIMENSION_RULES: DimensionRule[] = [
  {
    key: 'stimulation',
    label: '刺激度',
    patterns: [/电竞|对抗|竞技|冒险|密室|剧本杀|英雄联盟|王者|金铲铲|摇滚|livehouse|烈酒|过山车|蹦极/i],
    previewGifts: ['游戏点卡包', '桌游礼盒', '限定周边'],
    bucketTemplates: {
      under50: [{ title: '竞技主题徽章组', reason: '刺激度高，适合即时反馈强的兴趣礼物。' }],
      '50to100': [{ title: '桌游入门包', reason: '更适合带一点互动和对抗感的礼物。' }],
      '100to300': [{ title: '游戏点卡包', reason: '直接命中高刺激娱乐偏好。' }],
      '300to1000': [{ title: '联名外设套装', reason: '更适合投入型、参与感强的礼物。' }],
      '1000plus': [{ title: '高阶设备升级券', reason: '适合高预算的沉浸式娱乐路线。' }],
    },
  },
  {
    key: 'maleLean',
    label: '男频倾向',
    patterns: [/球鞋|机甲|数码|显卡|外设|主机|电竞|模型|汽车|篮球|足球|钓鱼/i],
    previewGifts: ['数码桌搭套装', '球鞋护理礼盒', '模型周边'],
    bucketTemplates: {
      under50: [{ title: '数码配件收纳包', reason: '偏男频兴趣更明显，适合功能型周边。' }],
      '50to100': [{ title: '模型周边礼盒', reason: '更适合兴趣明确的内容型礼物。' }],
      '100to300': [{ title: '球鞋护理套装', reason: '适合兼顾使用感和兴趣表达。' }],
      '300to1000': [{ title: '数码桌搭组合', reason: '偏男频路线更适合设备型升级。' }],
      '1000plus': [{ title: '高端外设券包', reason: '适合高预算的数码兴趣路线。' }],
    },
  },
  {
    key: 'femaleLean',
    label: '精致感',
    patterns: [/护肤|美妆|香薰|花|首饰|穿搭|包包|香水|拍照|发饰|甜品|可爱/i],
    previewGifts: ['香氛礼盒', '设计感配件', '花束礼盒'],
    bucketTemplates: {
      under50: [{ title: '香氛蜡片礼盒', reason: '偏女频审美兴趣，适合轻盈表达型礼物。' }],
      '50to100': [{ title: '花束礼盒', reason: '更适合氛围和表达感强的礼物。' }],
      '100to300': [{ title: '香氛护手套装', reason: '兼顾审美和日常使用。' }],
      '300to1000': [{ title: '美妆香氛组合', reason: '适合更完整的美感型礼物。' }],
      '1000plus': [{ title: '品牌配饰券包', reason: '适合高预算的风格表达路线。' }],
    },
  },
  {
    key: 'sweetPreference',
    label: '甜感偏好',
    patterns: [/甜|奶茶|蛋糕|甜品|巧克力|布丁|冰淇淋|水果茶|草莓|芋泥/i],
    previewGifts: ['甜品礼盒', '精品巧克力', '下午茶双人券'],
    bucketTemplates: {
      under50: [{ title: '手工曲奇礼盒', reason: '甜感偏好明显，适合轻松不出错的小礼物。' }],
      '50to100': [{ title: '甜品尝鲜盒', reason: '更适合直接命中口味偏好的礼物。' }],
      '100to300': [{ title: '精品巧克力礼盒', reason: '适合做有仪式感的甜口路线。' }],
      '300to1000': [{ title: '下午茶双人券', reason: '更适合升级成体验型甜口礼物。' }],
      '1000plus': [{ title: '高端甜点定制礼', reason: '适合高预算精致路线。' }],
    },
  },
  {
    key: 'spicyPreference',
    label: '辣感偏好',
    patterns: [/辣|火锅|烧烤|串串|川菜|湘菜|麻辣|重口|啤酒|夜宵/i],
    previewGifts: ['风味调味礼盒', '火锅礼券', '精酿啤酒套装'],
    bucketTemplates: {
      under50: [{ title: '下饭风味酱礼盒', reason: '辣感偏好明显，适合强风味路线。' }],
      '50to100': [{ title: '精酿啤酒小套装', reason: '适合偏重口味和聚会型礼物。' }],
      '100to300': [{ title: '火锅礼券', reason: '直接命中辣感和聚餐场景。' }],
      '300to1000': [{ title: '烧烤餐叙体验券', reason: '更适合升级为体验型礼物。' }],
      '1000plus': [{ title: '私宴重口料理券', reason: '适合高预算风味体验路线。' }],
    },
  },
  {
    key: 'ritualSense',
    label: '仪式感',
    patterns: [/生日|纪念日|庆祝|惊喜|浪漫|花|拍照|纪念|心意|节日|过节|一起/i],
    previewGifts: ['纪念相框', '手写卡片礼盒', '定制花束'],
    bucketTemplates: {
      under50: [{ title: '手写卡片礼盒', reason: '仪式感高时，情绪价值往往比价格更重要。' }],
      '50to100': [{ title: '纪念相框', reason: '适合有节点感的小预算纪念礼物。' }],
      '100to300': [{ title: '主题庆祝礼盒', reason: '更适合节日或纪念日场景。' }],
      '300to1000': [{ title: '定制纪念套装', reason: '适合关系更近、重表达的路线。' }],
      '1000plus': [{ title: '高定纪念系列', reason: '适合高预算纪念型礼物。' }],
    },
  },
  {
    key: 'companionship',
    label: '陪伴感',
    patterns: [/一起|陪|约饭|见面|散步|聊天|旅行|双人|约会|陪伴|看电影|晚饭/i],
    previewGifts: ['双人体验礼盒', '约会晚餐券', '陪伴手账'],
    bucketTemplates: {
      under50: [{ title: '双人饮品券', reason: '陪伴感强时，适合能马上一起使用的礼物。' }],
      '50to100': [{ title: '双人小食券', reason: '更适合轻量但有互动场景的礼物。' }],
      '100to300': [{ title: '双人体验礼盒', reason: '适合把礼物做成共同经历。' }],
      '300to1000': [{ title: '约会晚餐券', reason: '陪伴感较高，更适合场景型礼物。' }],
      '1000plus': [{ title: '短途双人体验券', reason: '适合高预算共同体验路线。' }],
    },
  },
  {
    key: 'practicality',
    label: '实用度',
    patterns: [/实用|方便|需要|办公|通勤|效率|电脑|桌面|日常|必备|收纳|保温|护眼/i],
    previewGifts: ['办公好物盒', '效率工具包', '桌面补给套装'],
    bucketTemplates: {
      under50: [{ title: '桌面整理包', reason: '实用度高时，优先考虑高频使用的小物。' }],
      '50to100': [{ title: '办公好物盒', reason: '适合稳妥、不容易出错的礼物。' }],
      '100to300': [{ title: '效率工具礼盒', reason: '兼顾实用和质感。' }],
      '300to1000': [{ title: '数码办公套装', reason: '适合升级成中高价位耐用品。' }],
      '1000plus': [{ title: '高配桌面组合', reason: '适合高预算的实用路线。' }],
    },
  },
  {
    key: 'aesthetics',
    label: '审美度',
    patterns: [/设计|好看|质感|风格|审美|香水|配色|穿搭|摄影|首饰|品牌|家居美学/i],
    previewGifts: ['设计感配件', '生活美学套装', '香氛礼盒'],
    bucketTemplates: {
      under50: [{ title: '设计感钥匙扣', reason: '审美度高时，小物件也能很出彩。' }],
      '50to100': [{ title: '香氛蜡烛礼盒', reason: '适合氛围感和质感路线。' }],
      '100to300': [{ title: '设计师配件套装', reason: '适合兼顾风格与实用。' }],
      '300to1000': [{ title: '生活美学组合', reason: '更适合完整的审美型方案。' }],
      '1000plus': [{ title: '品牌单品券包', reason: '适合高预算风格表达。' }],
    },
  },
  {
    key: 'relaxation',
    label: '松弛感',
    patterns: [/安静|慢热|治愈|休息|睡眠|舒适|宅|放松|香薰|猫|狗|家居|疗愈/i],
    previewGifts: ['助眠香薰礼盒', '柔软家居套装', '疗愈小夜灯'],
    bucketTemplates: {
      under50: [{ title: '助眠香包', reason: '松弛感高时，先考虑舒缓陪伴型礼物。' }],
      '50to100': [{ title: '疗愈香薰礼盒', reason: '适合安静、居家、放松类偏好。' }],
      '100to300': [{ title: '家居舒缓套装', reason: '适合提升日常舒适度。' }],
      '300to1000': [{ title: '高阶睡眠礼盒', reason: '适合更完整的疗愈型路线。' }],
      '1000plus': [{ title: '智能舒眠家居套装', reason: '适合高预算松弛生活路线。' }],
    },
  },
  {
    key: 'exploration',
    label: '探索欲',
    patterns: [/旅行|旅游|citywalk|露营|海边|徒步|展览|新奇|尝试|探索|咖啡店|小众|自驾/i],
    previewGifts: ['旅行收纳礼盒', '城市漫游卡', '探索体验券'],
    bucketTemplates: {
      under50: [{ title: '城市探索手账', reason: '探索欲明显，适合带一点发现感的礼物。' }],
      '50to100': [{ title: '旅行分装套组', reason: '适合出行与尝新并存的路线。' }],
      '100to300': [{ title: '旅行收纳礼盒', reason: '能直接提升探索体验。' }],
      '300to1000': [{ title: '精品酒店储值卡', reason: '适合升级为体验型礼物。' }],
      '1000plus': [{ title: '旅行基金券包', reason: '适合高预算探索路线。' }],
    },
  },
];

export function buildBirthdayRecommendation(friend: Friend, updatedAt = new Date().toISOString()): OccasionRecommendation {
  const signals = collectFriendSignals(friend);
  const scoreCards = buildScoreCards(signals);

  return {
    gifts: buildPreviewGifts(scoreCards, ['生日蛋糕礼券', '纪念照片卡', '香氛小礼盒']),
    scoreCards,
    updatedAt,
    source: 'system',
  };
}

export function buildMemorialRecommendation(
  memorial: MemorialDay,
  friends: Friend[],
  updatedAt = new Date().toISOString(),
): OccasionRecommendation {
  const signals = [
    { text: memorial.name, source: 'memorial' as const },
    ...(memorial.note ? [{ text: memorial.note, source: 'memorial' as const }] : []),
    ...friends.flatMap((friend) => collectFriendSignals(friend)),
  ];
  const scoreCards = buildScoreCards(signals);

  return {
    gifts: buildPreviewGifts(scoreCards, ['纪念相框', '鲜花礼盒', '双人体验礼盒']),
    scoreCards,
    updatedAt,
    source: 'system',
  };
}

export function buildGiftSuggestionBuckets(scores: RecommendationScore[]): GiftSuggestionBucket[] {
  const primaryScores = scores.slice(0, 3);

  return PRICE_BUCKETS.map((bucket) => ({
    key: bucket.key,
    label: bucket.label,
    items: primaryScores.flatMap((score, index) => {
      const rule = DIMENSION_RULES.find((item) => item.key === score.key);
      const template = rule?.bucketTemplates[bucket.key][0];
      if (!rule || !template) {
        return [];
      }

      const itemId = `${bucket.key}-${score.key}-${index}`;
      return [{
        id: itemId,
        title: template.title,
        priceLabel: bucket.priceLabel,
        link: `https://example.com/gifts/${itemId}`,
        reason: `${template.reason} 当前更偏向 ${score.label}。`,
      }] satisfies GiftSuggestionItem[];
    }),
  })).filter((bucket) => bucket.items.length > 0);
}

export function normalizeOccasionRecommendation(raw: unknown, fallback: OccasionRecommendation): OccasionRecommendation {
  if (!raw || typeof raw !== 'object') {
    return fallback;
  }

  const candidate = raw as Partial<OccasionRecommendation>;
  return {
    gifts: fallback.gifts.map(sanitizeGiftText),
    scoreCards: fallback.scoreCards,
    updatedAt: typeof candidate.updatedAt === 'string' && candidate.updatedAt ? candidate.updatedAt : fallback.updatedAt,
    source: 'system',
  };
}

export function collectFriendSignals(friend: Friend): ScoreSignal[] {
  const values = new Map<string, ScoreSignal>();

  for (const item of friend.preferenceItems ?? []) {
    pushSignal(values, item.value, 'preference');
    if (CATEGORY_LABELS[item.category]) {
      pushSignal(values, `${CATEGORY_LABELS[item.category]} ${item.value}`, 'preference');
    }
  }

  for (const value of friend.preferences ?? []) {
    pushSignal(values, value, 'preference');
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

  if (friend.relationship) {
    pushSignal(values, friend.relationship, 'relationship');
  }

  if (friend.gender) {
    pushSignal(values, friend.gender, 'basic');
  }

  if (friend.notes) {
    pushSignal(values, friend.notes, 'stable');
  }

  if (friend.aiProfile?.overview) {
    pushSignal(values, friend.aiProfile.overview, 'persona');
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
    pushSignal(values, item, 'persona');
  }

  return Array.from(values.values());
}

function buildScoreCards(signals: ScoreSignal[]): RecommendationScore[] {
  return DIMENSION_RULES
    .map((rule) => {
      const matchedSignals = new Set<string>();
      const matchedSources = new Set<ScoreSignal['source']>();
      let score = 0;

      for (const signal of signals) {
        const matchedCount = rule.patterns.reduce((count, pattern) => count + (pattern.test(signal.text) ? 1 : 0), 0);
        if (matchedCount === 0) {
          continue;
        }

        matchedSignals.add(signal.text);
        matchedSources.add(signal.source);
        score += SOURCE_WEIGHT[signal.source] + (matchedCount - 1) * 3;
      }

      if (matchedSignals.size >= 2) {
        score += 8;
      }
      if (matchedSignals.size >= 3) {
        score += 10;
      }
      if (matchedSources.size >= 2) {
        score += 8;
      }
      if (matchedSources.size >= 3) {
        score += 10;
      }

      return {
        key: rule.key,
        label: rule.label,
        score: Math.min(Math.round(score), 100),
        matchedSignals: Array.from(matchedSignals).slice(0, 4),
      };
    })
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 6);
}

function buildPreviewGifts(scores: RecommendationScore[], fallback: string[]): string[] {
  const gifts = new Set<string>();

  for (const score of scores.slice(0, 3)) {
    const rule = DIMENSION_RULES.find((item) => item.key === score.key);
    if (!rule) {
      continue;
    }

    for (const item of rule.previewGifts) {
      gifts.add(sanitizeGiftText(item));
      if (gifts.size >= 3) {
        break;
      }
    }

    if (gifts.size >= 3) {
      break;
    }
  }

  for (const item of fallback) {
    if (gifts.size >= 3) {
      break;
    }
    gifts.add(sanitizeGiftText(item));
  }

  return Array.from(gifts).slice(0, 3);
}

function sanitizeGiftText(text: string): string {
  return text.replace(/[（(]模拟[)）]/g, '').trim();
}

function pushSignal(store: Map<string, ScoreSignal>, text: string, source: ScoreSignal['source']): void {
  const normalized = text.trim();
  if (!normalized) {
    return;
  }

  const existing = store.get(normalized);
  if (!existing || SOURCE_WEIGHT[source] > SOURCE_WEIGHT[existing.source]) {
    store.set(normalized, { text: normalized, source });
  }
}
