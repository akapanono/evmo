import type { Friend, PreferenceCategory, PreferenceItem } from '@/types/friend';

export const PREFERENCE_CATEGORY_OPTIONS: Array<{ value: PreferenceCategory; label: string }> = [
  { value: 'food', label: '饮食' },
  { value: 'entertainment', label: '娱乐' },
  { value: 'lifestyle', label: '生活' },
  { value: 'social', label: '社交' },
  { value: 'travel', label: '出行' },
  { value: 'shopping', label: '消费' },
  { value: 'other', label: '其他' },
];

export function getPreferenceCategoryLabel(category: PreferenceCategory): string {
  return PREFERENCE_CATEGORY_OPTIONS.find((item) => item.value === category)?.label ?? '其他';
}

export function normalizePreferenceTokens(value: string): string[] {
  return value
    .split(/[，,、；;\n]+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

export function normalizePreferenceItems(
  items: PreferenceItem[] | undefined,
  fallbackPreferences: string[] = [],
): PreferenceItem[] {
  const normalizedItems = Array.isArray(items)
    ? items
      .filter((item) => item && typeof item.value === 'string')
      .map((item) => ({
        id: item.id || crypto.randomUUID(),
        category: normalizePreferenceCategory(item.category),
        value: item.value.trim(),
      }))
      .filter((item) => item.value)
    : [];

  if (normalizedItems.length > 0) {
    return dedupePreferenceItems(normalizedItems);
  }

  return dedupePreferenceItems(
    fallbackPreferences
      .map((value) => String(value).trim())
      .filter(Boolean)
      .map((value) => ({
        id: crypto.randomUUID(),
        category: inferPreferenceCategory(value),
        value: normalizePreferenceValueByCategory(value, inferPreferenceCategory(value)),
      })),
  );
}

export function flattenPreferenceItems(items: PreferenceItem[]): string[] {
  return Array.from(new Set(items.map((item) => item.value.trim()).filter(Boolean)));
}

export function groupPreferenceItems(items: PreferenceItem[]): Record<PreferenceCategory, PreferenceItem[]> {
  return {
    food: items.filter((item) => item.category === 'food'),
    entertainment: items.filter((item) => item.category === 'entertainment'),
    lifestyle: items.filter((item) => item.category === 'lifestyle'),
    social: items.filter((item) => item.category === 'social'),
    travel: items.filter((item) => item.category === 'travel'),
    shopping: items.filter((item) => item.category === 'shopping'),
    other: items.filter((item) => item.category === 'other'),
  };
}

export function getFriendPreferenceItems(friend: Friend): PreferenceItem[] {
  return normalizePreferenceItems(friend.preferenceItems, friend.preferences);
}

export function buildPreferenceInputs(items: PreferenceItem[]): Record<PreferenceCategory, string> {
  const grouped = groupPreferenceItems(items);
  return {
    food: grouped.food.map((item) => item.value).join('，'),
    entertainment: grouped.entertainment.map((item) => item.value).join('，'),
    lifestyle: grouped.lifestyle.map((item) => item.value).join('，'),
    social: grouped.social.map((item) => item.value).join('，'),
    travel: grouped.travel.map((item) => item.value).join('，'),
    shopping: grouped.shopping.map((item) => item.value).join('，'),
    other: grouped.other.map((item) => item.value).join('，'),
  };
}

export function parsePreferenceInputs(
  inputs: Record<PreferenceCategory, string>,
  existingItems: PreferenceItem[] = [],
): PreferenceItem[] {
  const nextItems: PreferenceItem[] = [];

  for (const option of PREFERENCE_CATEGORY_OPTIONS) {
    const category = option.value;
    const existingByValue = new Map(
      existingItems
        .filter((item) => item.category === category)
        .map((item) => [item.value, item.id]),
    );

    for (const value of normalizePreferenceTokens(inputs[category] ?? '')) {
      nextItems.push({
        id: existingByValue.get(value) ?? crypto.randomUUID(),
        category,
        value,
      });
    }
  }

  return dedupePreferenceItems(nextItems);
}

export function inferPreferenceCategory(value: string): PreferenceCategory {
  const text = value.trim();

  if (/吃|喝|口味|甜|辣|咸|酸|苦|清淡|重口|火锅|烧烤|烤肉|日料|西餐|中餐|川菜|湘菜|粤菜|面食|米饭|粥|包子|饺子|面条|粉|麻辣烫|炸鸡|汉堡|披萨|水果|蔬菜|沙拉|零食|奶茶|咖啡|茶|果汁|啤酒|红酒|白酒|忌口|香菜|葱|蒜|姜/.test(text)) {
    return 'food';
  }

  if (/玩|打|电影|电视剧|综艺|动漫|二次元|游戏|英雄联盟|LOL|王者荣耀|金铲铲|和平精英|原神|Steam|主机|桌游|密室|K歌|唱歌|音乐|演出|live|乐队|小说|看书|阅读|追剧|摄影|画画|手工/.test(text)) {
    return 'entertainment';
  }

  if (/早睡|晚睡|健身|运动|跑步|瑜伽|游泳|羽毛球|篮球|足球|徒步|作息|收纳|整理|家居|做饭|下厨|安静|通风|干净|整洁|香味|宠物|猫|狗|居家|独处|养生/.test(text)) {
    return 'lifestyle';
  }

  if (/聚会|社交|聊天|熟人|生人|慢热|外向|内向|独处|热闹|安静局|饭局|酒局|局|见面|约饭|约会|尬聊|表达|直球|委婉|礼貌|边界感|陪伴/.test(text)) {
    return 'social';
  }

  if (/旅行|旅游|出行|自驾|打车|高铁|飞机|海边|海岛|爬山|露营|citywalk|散步|酒店|民宿|赶行程|慢旅行|攻略|景点|周边游/.test(text)) {
    return 'travel';
  }

  if (/礼物|送礼|购物|逛街|买|品牌|香薰|香水|数码|电子|手机|耳机|键盘|实用|消费|花钱|衣服|穿搭|首饰|鞋|包|护肤|彩妆|家电|手办/.test(text)) {
    return 'shopping';
  }

  return 'other';
}

export function buildPreferenceItemsFromValues(
  values: string[],
  existingItems: PreferenceItem[] = [],
): PreferenceItem[] {
  const existingByKey = new Map(
    existingItems.map((item) => [`${item.category}:${item.value}`, item.id]),
  );
  const nextItems: PreferenceItem[] = [];

  for (const rawValue of values) {
    const splitValues = splitNaturalPreferenceValues(rawValue);

    for (const splitValue of splitValues) {
      const category = inferPreferenceCategory(splitValue);
      const normalizedValue = normalizePreferenceValueByCategory(splitValue, category);
      if (!normalizedValue) {
        continue;
      }

      const key = `${category}:${normalizedValue}`;
      nextItems.push({
        id: existingByKey.get(key) ?? crypto.randomUUID(),
        category,
        value: normalizedValue,
      });
    }
  }

  return normalizePreferenceItems(nextItems);
}

export function extractCategorizedPreferenceItems(
  text: string,
  existingItems: PreferenceItem[] = [],
): PreferenceItem[] {
  const categoryAliasMap: Array<{ aliases: string[]; category: PreferenceCategory }> = [
    { aliases: ['饮食', '美食', '吃喝', '口味'], category: 'food' },
    { aliases: ['娱乐', '休闲'], category: 'entertainment' },
    { aliases: ['生活', '日常'], category: 'lifestyle' },
    { aliases: ['社交', '相处'], category: 'social' },
    { aliases: ['出行', '旅行', '旅游'], category: 'travel' },
    { aliases: ['消费', '购物', '礼物'], category: 'shopping' },
    { aliases: ['其他'], category: 'other' },
  ];

  const existingByKey = new Map(
    existingItems.map((item) => [`${item.category}:${item.value}`, item.id]),
  );
  const nextItems: PreferenceItem[] = [];

  for (const item of extractFoodPreferenceItems(text, existingByKey)) {
    nextItems.push(item);
  }

  for (const entry of categoryAliasMap) {
    const aliasPattern = entry.aliases.join('|');
    const pattern = new RegExp(`(?:^|[\\n；;。])\\s*(?:${aliasPattern})\\s*[：:]\\s*([^\\n；;。]+)`, 'g');
    const matches = Array.from(text.matchAll(pattern));

    for (const match of matches) {
      const rawValue = match[1]?.trim();
      if (!rawValue) {
        continue;
      }

      for (const value of splitNaturalPreferenceValues(rawValue)) {
        const normalizedValue = normalizePreferenceValueByCategory(value, entry.category);
        const key = `${entry.category}:${normalizedValue}`;
        nextItems.push({
          id: existingByKey.get(key) ?? crypto.randomUUID(),
          category: entry.category,
          value: normalizedValue,
        });
      }
    }
  }

  return normalizePreferenceItems(nextItems);
}

function extractFoodPreferenceItems(
  text: string,
  existingByKey: Map<string, string>,
): PreferenceItem[] {
  const results: PreferenceItem[] = [];
  const patterns = [
    /喜欢吃([^，。；;\n]+)/g,
    /爱吃([^，。；;\n]+)/g,
    /喜欢喝([^，。；;\n]+)/g,
    /爱喝([^，。；;\n]+)/g,
    /吃([^，。；;\n]+)/g,
    /喝([^，。；;\n]+)/g,
  ];

  for (const pattern of patterns) {
    const matches = Array.from(text.matchAll(pattern));
    for (const match of matches) {
      const rawValue = match[1]?.trim();
      if (!rawValue) {
        continue;
      }

      for (const value of splitNaturalPreferenceValues(rawValue)) {
        const normalizedValue = normalizePreferenceValueByCategory(value, 'food');
        if (!normalizedValue) {
          continue;
        }

        const key = `food:${normalizedValue}`;
        results.push({
          id: existingByKey.get(key) ?? crypto.randomUUID(),
          category: 'food',
          value: normalizedValue,
        });
      }
    }
  }

  return results;
}

function splitNaturalPreferenceValues(value: string): string[] {
  return value
    .split(/[，,、；;\n]|(?:和|及|以及|还有)/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function normalizePreferenceValueByCategory(value: string, category: PreferenceCategory): string {
  const normalized = value.trim();

  if (category === 'food') {
    return normalized
      .replace(/^(喜欢|爱吃|想吃|常吃|平时爱|比较爱)/, '')
      .replace(/^(吃|喝|口味偏|口味是)/, '')
      .trim();
  }

  if (category === 'entertainment') {
    return normalized
      .replace(/^(喜欢|爱|常|最近爱|平时爱|比较爱)/, '')
      .replace(/^(玩|打|看|追|听|唱|刷)/, '')
      .trim();
  }

  if (category === 'lifestyle') {
    return normalized
      .replace(/^(喜欢|爱|习惯|平时|比较)/, '')
      .replace(/^(用|住|养|做)/, '')
      .trim();
  }

  if (category === 'social') {
    return normalized
      .replace(/^(喜欢|爱|更喜欢|比较喜欢|偏向)/, '')
      .replace(/^(和人|跟人)/, '')
      .trim();
  }

  if (category === 'travel') {
    return normalized
      .replace(/^(喜欢|爱|更喜欢|比较喜欢|偏好)/, '')
      .replace(/^(去|坐|住)/, '')
      .trim();
  }

  if (category === 'shopping') {
    return normalized
      .replace(/^(喜欢|爱|更喜欢|比较喜欢|买东西爱)/, '')
      .replace(/^(买|用|收)/, '')
      .trim();
  }

  return normalized;
}

function normalizePreferenceCategory(value: unknown): PreferenceCategory {
  return value === 'food'
    || value === 'entertainment'
    || value === 'lifestyle'
    || value === 'social'
    || value === 'travel'
    || value === 'shopping'
    || value === 'other'
    ? value
    : 'other';
}

function dedupePreferenceItems(items: PreferenceItem[]): PreferenceItem[] {
  const seen = new Set<string>();

  return items.filter((item) => {
    const key = `${item.category}:${item.value}`;
    if (!item.value || seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
}
