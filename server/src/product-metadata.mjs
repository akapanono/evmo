const ATTRIBUTE_DEFINITIONS = [
  { value: 'sweet', label: '甜食' },
  { value: 'snack', label: '零食' },
  { value: 'drink', label: '饮品' },
  { value: 'spicy', label: '辛辣' },
  { value: 'giftBox', label: '礼盒' },
  { value: 'healing', label: '疗愈' },
  { value: 'fragrance', label: '香氛' },
  { value: 'beauty', label: '美妆护肤' },
  { value: 'digital', label: '数码' },
  { value: 'game', label: '游戏' },
  { value: 'anime', label: '动漫周边' },
  { value: 'sports', label: '运动' },
  { value: 'home', label: '家居' },
  { value: 'practical', label: '实用' },
  { value: 'collectible', label: '收藏' },
  { value: 'travel', label: '出游' },
  { value: 'social', label: '聚会' },
  { value: 'handmade', label: '手作' },
  { value: 'cute', label: '可爱' },
  { value: 'premium', label: '精致' },
];

const ATTRIBUTE_MAP = new Map(ATTRIBUTE_DEFINITIONS.map((item) => [item.value, item.label]));

const ATTRIBUTE_RULES = {
  sweet: {
    tags: ['甜食', '零食'],
    dimensions: ['sweetPreference', 'companionship'],
    relationships: ['恋人', '朋友', '家人'],
  },
  snack: {
    tags: ['零食', '分享'],
    dimensions: ['companionship', 'relaxation'],
    relationships: ['朋友', '同事', '家人'],
  },
  drink: {
    tags: ['饮品', '日常'],
    dimensions: ['relaxation', 'companionship'],
    relationships: ['朋友', '同事', '家人'],
  },
  spicy: {
    tags: ['重口味', '零食'],
    dimensions: ['spicyPreference', 'stimulation'],
    relationships: ['朋友', '同事'],
  },
  giftBox: {
    tags: ['礼盒', '送礼'],
    dimensions: ['ritualSense', 'refinement'],
    relationships: ['恋人', '家人', '朋友'],
  },
  healing: {
    tags: ['疗愈', '放松'],
    dimensions: ['relaxation', 'companionship'],
    relationships: ['恋人', '朋友', '家人'],
  },
  fragrance: {
    tags: ['香氛', '氛围'],
    dimensions: ['aesthetics', 'relaxation'],
    relationships: ['恋人', '朋友', '家人'],
  },
  beauty: {
    tags: ['护肤', '精致'],
    dimensions: ['aesthetics', 'refinement'],
    relationships: ['恋人', '闺蜜', '家人'],
  },
  digital: {
    tags: ['数码', '潮流'],
    dimensions: ['practicality', 'exploration'],
    relationships: ['朋友', '同事', '恋人'],
  },
  game: {
    tags: ['游戏', '娱乐'],
    dimensions: ['stimulation', 'companionship'],
    relationships: ['朋友', '恋人'],
  },
  anime: {
    tags: ['周边', '收藏'],
    dimensions: ['exploration', 'aesthetics'],
    relationships: ['朋友', '恋人'],
  },
  sports: {
    tags: ['运动', '健康'],
    dimensions: ['stimulation', 'practicality'],
    relationships: ['朋友', '同事', '家人'],
  },
  home: {
    tags: ['家居', '日常'],
    dimensions: ['practicality', 'relaxation'],
    relationships: ['家人', '朋友', '恋人'],
  },
  practical: {
    tags: ['实用', '日常'],
    dimensions: ['practicality'],
    relationships: ['同事', '家人', '朋友'],
  },
  collectible: {
    tags: ['收藏', '纪念'],
    dimensions: ['ritualSense', 'exploration'],
    relationships: ['恋人', '朋友'],
  },
  travel: {
    tags: ['出游', '体验'],
    dimensions: ['exploration', 'companionship'],
    relationships: ['恋人', '朋友', '家人'],
  },
  social: {
    tags: ['聚会', '分享'],
    dimensions: ['companionship', 'stimulation'],
    relationships: ['朋友', '同事'],
  },
  handmade: {
    tags: ['手作', '纪念'],
    dimensions: ['ritualSense', 'aesthetics'],
    relationships: ['恋人', '家人', '朋友'],
  },
  cute: {
    tags: ['可爱', '氛围'],
    dimensions: ['aesthetics', 'companionship'],
    relationships: ['恋人', '闺蜜', '朋友'],
  },
  premium: {
    tags: ['精致', '高级感'],
    dimensions: ['refinement', 'ritualSense'],
    relationships: ['恋人', '客户', '家人'],
  },
};

const TEXT_RULES = [
  { pattern: /巧克力|蛋糕|糖|甜品|曲奇|布丁/i, attributes: ['sweet', 'snack'] },
  { pattern: /咖啡|奶茶|茶叶|果汁|酒|饮料/i, attributes: ['drink'] },
  { pattern: /辣条|火锅|烧烤|麻辣/i, attributes: ['spicy', 'snack'] },
  { pattern: /礼盒|套装|礼包/i, attributes: ['giftBox', 'premium'] },
  { pattern: /香薰|香水|蜡烛/i, attributes: ['fragrance', 'healing'] },
  { pattern: /口红|面膜|护肤|彩妆/i, attributes: ['beauty', 'premium'] },
  { pattern: /耳机|键盘|音箱|相机|手表|平板/i, attributes: ['digital', 'practical'] },
  { pattern: /游戏|点卡|手柄/i, attributes: ['game'] },
  { pattern: /手办|盲盒|周边|徽章/i, attributes: ['anime', 'collectible'] },
  { pattern: /瑜伽|健身|球拍|跑步/i, attributes: ['sports', 'practical'] },
  { pattern: /抱枕|水杯|床品|灯具|餐具/i, attributes: ['home', 'practical'] },
  { pattern: /旅行|露营|酒店|机票/i, attributes: ['travel', 'companionship'] },
  { pattern: /手作|定制|照片|相册/i, attributes: ['handmade', 'collectible'] },
];

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

export function getProductAttributeOptions() {
  return ATTRIBUTE_DEFINITIONS;
}

export function deriveProductMetadata(input = {}) {
  const text = `${input.title || ''} ${input.summary || ''}`.trim();
  const category = String(input.category || '').trim();
  const selectedAttributes = Array.isArray(input.attributes) ? input.attributes.map(String) : [];
  const inferredAttributes = [...selectedAttributes];

  for (const rule of TEXT_RULES) {
    if (rule.pattern.test(text)) {
      inferredAttributes.push(...rule.attributes);
    }
  }

  if (category === 'food') inferredAttributes.push('snack');
  if (category === 'entertainment') inferredAttributes.push('game');
  if (category === 'life') inferredAttributes.push('home');
  if (category === 'travel') inferredAttributes.push('travel');
  if (category === 'ritual') inferredAttributes.push('giftBox');

  const attributes = unique(inferredAttributes);
  const tags = unique(attributes.flatMap((attribute) => ATTRIBUTE_RULES[attribute]?.tags || []).concat(
    attributes.map((attribute) => ATTRIBUTE_MAP.get(attribute) || attribute),
  ));
  const matchDimensions = unique(attributes.flatMap((attribute) => ATTRIBUTE_RULES[attribute]?.dimensions || []));
  const targetRelationships = unique(attributes.flatMap((attribute) => ATTRIBUTE_RULES[attribute]?.relationships || []));

  return {
    attributes,
    tags,
    matchDimensions,
    targetRelationships,
  };
}
