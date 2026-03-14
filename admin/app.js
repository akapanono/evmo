const PRODUCT_CATEGORIES = [
  { value: 'food', label: '食品饮料' },
  { value: 'entertainment', label: '娱乐兴趣' },
  { value: 'life', label: '生活家居' },
  { value: 'social', label: '社交聚会' },
  { value: 'travel', label: '旅行出游' },
  { value: 'shopping', label: '精致消费' },
  { value: 'ritual', label: '仪式送礼' },
  { value: 'other', label: '其他' },
];

const PRICE_BUCKETS = [
  { value: 'under50', label: '50 元以下' },
  { value: '50to100', label: '50-100 元' },
  { value: '100to300', label: '100-300 元' },
  { value: '300to1000', label: '300-1000 元' },
  { value: '1000plus', label: '1000 元以上' },
];

const PRODUCT_STATUS = [
  { value: 'active', label: '启用中' },
  { value: 'draft', label: '草稿' },
  { value: 'archived', label: '已归档' },
];

const GIFT_SCENE_OPTIONS = [
  { value: 'birthday', label: '生日' },
  { value: 'anniversary', label: '纪念日' },
  { value: 'gathering', label: '聚会见面' },
  { value: 'travel', label: '旅行出游' },
  { value: 'dailyCare', label: '日常关心' },
  { value: 'safeChoice', label: '稳妥通用' },
];

const RECIPIENT_STYLE_OPTIONS = [
  { value: 'practical', label: '偏实用' },
  { value: 'ritual', label: '偏仪式感' },
  { value: 'experience', label: '偏体验型' },
  { value: 'refined', label: '偏精致审美' },
  { value: 'social', label: '偏社交氛围' },
  { value: 'easygoing', label: '偏轻松治愈' },
];

const ATTRIBUTE_OPTIONS = [
  { value: 'sweet', label: '甜口' },
  { value: 'snack', label: '零食' },
  { value: 'drink', label: '饮品' },
  { value: 'spicy', label: '辣味' },
  { value: 'giftBox', label: '礼盒' },
  { value: 'healing', label: '治愈感' },
  { value: 'fragrance', label: '香氛' },
  { value: 'beauty', label: '美妆护理' },
  { value: 'digital', label: '数码' },
  { value: 'game', label: '游戏' },
  { value: 'anime', label: '二次元' },
  { value: 'sports', label: '运动' },
  { value: 'home', label: '家居' },
  { value: 'practical', label: '实用' },
  { value: 'collectible', label: '收藏向' },
  { value: 'travel', label: '旅行' },
  { value: 'social', label: '社交分享' },
  { value: 'handmade', label: '手作定制' },
  { value: 'cute', label: '可爱治愈' },
  { value: 'premium', label: '品质感' },
];

const ATTRIBUTE_LABELS = new Map(ATTRIBUTE_OPTIONS.map((item) => [item.value, item.label]));

const DIMENSION_LABELS = {
  sweetPreference: '甜口偏好',
  spicyPreference: '辣味偏好',
  practicality: '实用导向',
  ritualSense: '仪式感',
  aesthetics: '审美表达',
  companionship: '陪伴互动',
  exploration: '体验探索',
  relaxation: '放松治愈',
  stimulation: '新鲜刺激',
  refinement: '精致品质',
};

const ATTRIBUTE_RULES = {
  sweet: {
    tags: ['甜口', '治愈小食'],
    dimensions: ['sweetPreference', 'companionship'],
    relationships: ['朋友', '对象', '家人'],
  },
  snack: {
    tags: ['零食', '分享型'],
    dimensions: ['companionship', 'relaxation'],
    relationships: ['朋友', '同事', '家人'],
  },
  drink: {
    tags: ['饮品', '轻松氛围'],
    dimensions: ['relaxation', 'companionship'],
    relationships: ['朋友', '同事', '家人'],
  },
  spicy: {
    tags: ['辣味', '重口偏好'],
    dimensions: ['spicyPreference', 'stimulation'],
    relationships: ['朋友', '同事'],
  },
  giftBox: {
    tags: ['礼盒', '送礼感'],
    dimensions: ['ritualSense', 'refinement'],
    relationships: ['对象', '家人', '朋友'],
  },
  healing: {
    tags: ['治愈感', '舒缓'],
    dimensions: ['relaxation', 'companionship'],
    relationships: ['对象', '朋友', '家人'],
  },
  fragrance: {
    tags: ['香氛', '氛围感'],
    dimensions: ['aesthetics', 'relaxation'],
    relationships: ['对象', '朋友', '家人'],
  },
  beauty: {
    tags: ['美妆护理', '精致感'],
    dimensions: ['aesthetics', 'refinement'],
    relationships: ['对象', '闺蜜', '家人'],
  },
  digital: {
    tags: ['数码', '效率工具'],
    dimensions: ['practicality', 'exploration'],
    relationships: ['朋友', '同事', '对象'],
  },
  game: {
    tags: ['游戏', '互动感'],
    dimensions: ['stimulation', 'companionship'],
    relationships: ['朋友', '对象'],
  },
  anime: {
    tags: ['二次元', '收藏向'],
    dimensions: ['exploration', 'aesthetics'],
    relationships: ['朋友', '对象'],
  },
  sports: {
    tags: ['运动', '活力'],
    dimensions: ['stimulation', 'practicality'],
    relationships: ['朋友', '同事', '家人'],
  },
  home: {
    tags: ['家居', '生活感'],
    dimensions: ['practicality', 'relaxation'],
    relationships: ['家人', '对象', '朋友'],
  },
  practical: {
    tags: ['实用', '低风险'],
    dimensions: ['practicality'],
    relationships: ['同事', '家人', '朋友'],
  },
  collectible: {
    tags: ['收藏向', '纪念意义'],
    dimensions: ['ritualSense', 'exploration'],
    relationships: ['对象', '朋友'],
  },
  travel: {
    tags: ['旅行', '探索欲'],
    dimensions: ['exploration', 'companionship'],
    relationships: ['对象', '朋友', '家人'],
  },
  social: {
    tags: ['社交分享', '聚会氛围'],
    dimensions: ['companionship', 'stimulation'],
    relationships: ['朋友', '同事'],
  },
  handmade: {
    tags: ['手作定制', '专属感'],
    dimensions: ['ritualSense', 'aesthetics'],
    relationships: ['对象', '家人', '朋友'],
  },
  cute: {
    tags: ['可爱治愈', '轻松感'],
    dimensions: ['aesthetics', 'companionship'],
    relationships: ['对象', '闺蜜', '朋友'],
  },
  premium: {
    tags: ['品质感', '高级感'],
    dimensions: ['refinement', 'ritualSense'],
    relationships: ['对象', '长辈', '家人'],
  },
};

const TEXT_RULES = [
  { pattern: /蛋糕|巧克力|甜点|饼干|糖果/i, attributes: ['sweet', 'snack'] },
  { pattern: /咖啡|茶|奶茶|酒|饮料/i, attributes: ['drink'] },
  { pattern: /火锅|烧烤|麻辣|川味/i, attributes: ['spicy', 'snack'] },
  { pattern: /礼盒|礼物|伴手礼/i, attributes: ['giftBox', 'premium'] },
  { pattern: /香薰|香氛|蜡烛/i, attributes: ['fragrance', 'healing'] },
  { pattern: /护肤|彩妆|口红|面霜/i, attributes: ['beauty', 'premium'] },
  { pattern: /耳机|键盘|音箱|数码|充电/i, attributes: ['digital', 'practical'] },
  { pattern: /游戏|桌游|手办|模型/i, attributes: ['game'] },
  { pattern: /动漫|周边|二次元/i, attributes: ['anime', 'collectible'] },
  { pattern: /运动|球鞋|健身|户外/i, attributes: ['sports', 'practical'] },
  { pattern: /家居|抱枕|收纳|小夜灯|香薰机/i, attributes: ['home', 'practical'] },
  { pattern: /旅行|出游|citywalk|露营/i, attributes: ['travel'] },
  { pattern: /手作|定制|刻字/i, attributes: ['handmade', 'collectible'] },
  { pattern: /可爱|治愈|毛绒/i, attributes: ['cute', 'healing'] },
];

const state = {
  token: '',
  users: [],
  filteredUsers: [],
  userDetail: null,
  products: [],
  filteredProducts: [],
  systemConfig: null,
  editingProductId: '',
  activePanel: 'overview',
};

const els = {
  loginPanel: document.querySelector('#loginPanel'),
  loginForm: document.querySelector('#loginForm'),
  dashboardPanel: document.querySelector('#dashboardPanel'),
  loginMessage: document.querySelector('#loginMessage'),
  usernameInput: document.querySelector('#usernameInput'),
  passwordInput: document.querySelector('#passwordInput'),
  logoutBtn: document.querySelector('#logoutBtn'),
  userCount: document.querySelector('#userCount'),
  productCount: document.querySelector('#productCount'),
  aiStatus: document.querySelector('#aiStatus'),
  userSearchInput: document.querySelector('#userSearchInput'),
  userList: document.querySelector('#userList'),
  userDetailPanel: document.querySelector('#userDetailPanel'),
  userDetailTitle: document.querySelector('#userDetailTitle'),
  userMeta: document.querySelector('#userMeta'),
  userFriends: document.querySelector('#userFriends'),
  userMemorialDays: document.querySelector('#userMemorialDays'),
  backToUsersBtn: document.querySelector('#backToUsersBtn'),
  productSearchInput: document.querySelector('#productSearchInput'),
  productList: document.querySelector('#productList'),
  productEditorTitle: document.querySelector('#productEditorTitle'),
  productEditorPanel: document.querySelector('#productEditorPanel'),
  newProductBtn: document.querySelector('#newProductBtn'),
  backToProductsBtn: document.querySelector('#backToProductsBtn'),
  saveProductBtn: document.querySelector('#saveProductBtn'),
  productMessage: document.querySelector('#productMessage'),
  productTitle: document.querySelector('#productTitle'),
  productCategory: document.querySelector('#productCategory'),
  productPriceBucket: document.querySelector('#productPriceBucket'),
  productStatus: document.querySelector('#productStatus'),
  productAttributes: document.querySelector('#productAttributes'),
  productGiftScenes: document.querySelector('#productGiftScenes'),
  productRecipientStyles: document.querySelector('#productRecipientStyles'),
  productDerivedTags: document.querySelector('#productDerivedTags'),
  productDerivedDimensions: document.querySelector('#productDerivedDimensions'),
  productDerivedRelationships: document.querySelector('#productDerivedRelationships'),
  productDerivedScenes: document.querySelector('#productDerivedScenes'),
  productDerivedStyles: document.querySelector('#productDerivedStyles'),
  productLink: document.querySelector('#productLink'),
  productSummary: document.querySelector('#productSummary'),
  aiBaseUrl: document.querySelector('#aiBaseUrl'),
  aiApiKey: document.querySelector('#aiApiKey'),
  aiModel: document.querySelector('#aiModel'),
  saveSystemBtn: document.querySelector('#saveSystemBtn'),
  testAiBtn: document.querySelector('#testAiBtn'),
  systemMessage: document.querySelector('#systemMessage'),
};

init();

function init() {
  fillSelect(els.productCategory, PRODUCT_CATEGORIES);
  fillSelect(els.productPriceBucket, PRICE_BUCKETS);
  fillSelect(els.productStatus, PRODUCT_STATUS);
  renderOptionGroup(els.productAttributes, 'productAttribute', ATTRIBUTE_OPTIONS);
  renderOptionGroup(els.productGiftScenes, 'productGiftScene', GIFT_SCENE_OPTIONS);
  renderOptionGroup(els.productRecipientStyles, 'productRecipientStyle', RECIPIENT_STYLE_OPTIONS);
  bindMenu();
  bindAuth();
  bindUsers();
  bindProducts();
  bindSystem();
  renderDerivedProductPreview();
}

function fillSelect(select, options) {
  select.innerHTML = options.map((option) => `<option value="${escapeHtml(option.value)}">${escapeHtml(option.label)}</option>`).join('');
}

function renderOptionGroup(container, name, options) {
  container.innerHTML = '';
  for (const option of options) {
    const label = document.createElement('label');
    label.className = 'option-pill';
    label.innerHTML = `
      <input type="checkbox" name="${name}" value="${escapeHtml(option.value)}" />
      <span>${escapeHtml(option.label)}</span>
    `;
    container.appendChild(label);
  }
}

function bindMenu() {
  document.querySelectorAll('.menu-item').forEach((button) => {
    button.addEventListener('click', () => activatePanel(button.dataset.panel || 'overview'));
  });
}

function bindAuth() {
  els.loginForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    await login();
  });

  els.logoutBtn.addEventListener('click', () => {
    state.token = '';
    state.userDetail = null;
    renderAuth();
  });
}

function bindUsers() {
  els.backToUsersBtn.addEventListener('click', () => {
    state.userDetail = null;
    activatePanel('users');
  });
  els.userSearchInput.addEventListener('input', filterUsers);
}

function bindProducts() {
  els.newProductBtn.addEventListener('click', () => openProductEditor());
  els.backToProductsBtn.addEventListener('click', closeProductEditor);
  els.saveProductBtn.addEventListener('click', saveProduct);
  els.productSearchInput.addEventListener('input', filterProducts);
  els.productTitle.addEventListener('input', renderDerivedProductPreview);
  els.productSummary.addEventListener('input', renderDerivedProductPreview);
  els.productCategory.addEventListener('change', renderDerivedProductPreview);
  els.productAttributes.addEventListener('change', renderDerivedProductPreview);
  els.productGiftScenes.addEventListener('change', renderDerivedProductPreview);
  els.productRecipientStyles.addEventListener('change', renderDerivedProductPreview);
}

function bindSystem() {
  els.saveSystemBtn.addEventListener('click', saveSystemConfig);
  els.testAiBtn.addEventListener('click', testAiConnection);
}

function activatePanel(panel) {
  state.activePanel = panel;
  document.querySelectorAll('.menu-item').forEach((item) => {
    item.classList.toggle('is-active', item.dataset.panel === panel);
  });
  document.querySelectorAll('.panel-view').forEach((view) => {
    view.classList.toggle('hidden', view.dataset.view !== panel);
  });
  if (panel !== 'users') els.userDetailPanel.classList.add('hidden');
  if (panel !== 'products') els.productEditorPanel.classList.add('hidden');
  if (panel === 'users' && state.token) void loadUsers();
  if (panel === 'products' && state.token) void loadProducts();
}

async function login() {
  els.loginMessage.textContent = '登录中...';
  try {
    const response = await fetch('/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: els.usernameInput.value.trim(),
        password: els.passwordInput.value,
      }),
    });
    const payload = await response.json();
    if (!response.ok || !payload.ok) {
      throw new Error(payload.error || '登录失败');
    }
    state.token = payload.data.token;
    els.loginMessage.textContent = '';
    renderAuth();
    await loadDashboard();
  } catch (error) {
    els.loginMessage.textContent = error.message;
  }
}

function renderAuth() {
  const loggedIn = Boolean(state.token);
  els.loginPanel.classList.toggle('hidden', loggedIn);
  els.dashboardPanel.classList.toggle('hidden', !loggedIn);
}

async function loadDashboard() {
  await Promise.all([loadUsers(), loadProducts(), loadSystemConfig()]);
  renderStats();
  activatePanel(state.activePanel);
}

async function api(path, options = {}) {
  const response = await fetch(path, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: state.token ? `Bearer ${state.token}` : '',
      ...(options.headers ?? {}),
    },
  });
  const payload = await response.json();
  if (!response.ok || !payload.ok) {
    throw new Error(payload.error || '请求失败');
  }
  return payload.data;
}

async function loadUsers() {
  state.users = await api('/api/admin/users');
  filterUsers();
}

function filterUsers() {
  const keyword = els.userSearchInput.value.trim().toLowerCase();
  state.filteredUsers = !keyword
    ? [...state.users]
    : state.users.filter((user) =>
      String(user.name || '').toLowerCase().includes(keyword)
      || String(user.phone || '').toLowerCase().includes(keyword)
      || String(user.id || '').toLowerCase().includes(keyword));
  renderUsers();
}

async function loadUserDetail(userId) {
  state.userDetail = await api(`/api/admin/users/${userId}`);
  renderUserDetail();
}

function renderUsers() {
  els.userList.innerHTML = '';
  if (!state.filteredUsers.length) {
    els.userList.innerHTML = '<div class="empty-state">没有找到匹配的用户。</div>';
    return;
  }

  for (const user of state.filteredUsers) {
    const item = document.createElement('article');
    item.className = 'card user-item';
    item.innerHTML = `
      <div class="user-item-head">
        <div>
          <strong>${escapeHtml(user.name || '未命名用户')}</strong>
          <div class="muted">${escapeHtml(user.phone || '未绑定手机号')}</div>
        </div>
        <button class="ghost-btn" data-detail="${escapeHtml(user.id)}">查看详情</button>
      </div>
      <div class="pill-row">
        <span class="pill">好友 ${user.friendCount}</span>
        <span class="pill">纪念日 ${user.memorialDayCount}</span>
        <span class="pill">${user.bindings?.wechat ? '已绑微信' : '未绑微信'}</span>
        <span class="pill">${user.bindings?.qq ? '已绑QQ' : '未绑QQ'}</span>
      </div>
    `;
    item.querySelector('[data-detail]').addEventListener('click', async () => {
      await loadUserDetail(user.id);
      document.querySelectorAll('.panel-view').forEach((view) => view.classList.add('hidden'));
      els.userDetailPanel.classList.remove('hidden');
      document.querySelectorAll('.menu-item').forEach((menuItem) => {
        menuItem.classList.toggle('is-active', menuItem.dataset.panel === 'users');
      });
    });
    els.userList.appendChild(item);
  }
}

function renderUserDetail() {
  const detail = state.userDetail;
  if (!detail) return;

  els.userDetailTitle.textContent = detail.user.name || '查看用户';
  els.userMeta.innerHTML = '';

  const metaItems = [
    ['用户 ID', detail.user.id],
    ['昵称', detail.user.name || '-'],
    ['手机号', detail.user.phone || '-'],
    ['邮箱', detail.user.email || '-'],
    ['状态', detail.user.status || '-'],
    ['创建时间', formatDateTime(detail.user.createdAt)],
    ['更新时间', formatDateTime(detail.user.updatedAt)],
  ];

  for (const [label, value] of metaItems) {
    const row = document.createElement('div');
    row.className = 'meta-row';
    row.innerHTML = `<span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong>`;
    els.userMeta.appendChild(row);
  }

  els.userFriends.innerHTML = detail.friends.length
    ? detail.friends.map((friend) => `
        <article class="sub-item">
          <strong>${escapeHtml(friend.name || '未命名好友')}</strong>
          <div class="muted">${escapeHtml(friend.relationship || '未填写关系')}</div>
        </article>
      `).join('')
    : '<div class="empty-state">该用户还没有好友数据。</div>';

  els.userMemorialDays.innerHTML = detail.memorialDays.length
    ? detail.memorialDays.map((item) => `
        <article class="sub-item">
          <strong>${escapeHtml(item.name || '未命名纪念日')}</strong>
          <div class="muted">${escapeHtml(item.monthDay || '-')}</div>
        </article>
      `).join('')
    : '<div class="empty-state">该用户还没有纪念日数据。</div>';
}

async function loadProducts() {
  state.products = await api('/api/products');
  filterProducts();
}

function filterProducts() {
  const keyword = els.productSearchInput.value.trim().toLowerCase();
  state.filteredProducts = !keyword
    ? [...state.products]
    : state.products.filter((product) => {
      const haystack = [
        product.title,
        product.summary,
        product.category,
        ...(product.tags || []),
        ...(product.attributes || []),
        ...(product.giftScenes || []),
        ...(product.recipientStyles || []),
      ].join(' ').toLowerCase();
      return haystack.includes(keyword);
    });
  renderProducts();
}

function renderProducts() {
  els.productList.innerHTML = '';
  if (!state.filteredProducts.length) {
    els.productList.innerHTML = '<div class="empty-state">没有找到匹配的商品。</div>';
    return;
  }

  for (const product of state.filteredProducts) {
    const item = document.createElement('article');
    item.className = 'card product-item';
    item.innerHTML = `
      <div class="product-item-head">
        <div>
          <strong>${escapeHtml(product.title)}</strong>
          <div class="muted">${escapeHtml(product.summary || '暂无摘要')}</div>
        </div>
        <button class="ghost-btn" data-edit="${escapeHtml(product.id)}">编辑</button>
      </div>
      <div class="pill-row">
        <span class="pill">${escapeHtml(getLabel(PRODUCT_CATEGORIES, product.category))}</span>
        <span class="pill">${escapeHtml(product.priceLabel || getLabel(PRICE_BUCKETS, product.priceBucket))}</span>
        <span class="pill">${escapeHtml(getLabel(PRODUCT_STATUS, product.status))}</span>
      </div>
      <div class="pill-row">
        ${(product.tags || []).slice(0, 4).map((tag) => `<span class="pill">${escapeHtml(tag)}</span>`).join('')}
      </div>
    `;
    item.querySelector('[data-edit]').addEventListener('click', () => openProductEditor(product));
    els.productList.appendChild(item);
  }
}

function openProductEditor(product = null) {
  state.editingProductId = product?.id || '';
  els.productEditorTitle.textContent = product ? '编辑商品' : '新增商品';
  if (product) fillProductForm(product);
  else clearProductForm();
  document.querySelectorAll('.panel-view').forEach((view) => view.classList.add('hidden'));
  els.productEditorPanel.classList.remove('hidden');
  document.querySelectorAll('.menu-item').forEach((item) => {
    item.classList.toggle('is-active', item.dataset.panel === 'products');
  });
  renderDerivedProductPreview();
}

function closeProductEditor() {
  activatePanel('products');
  clearProductForm();
  state.editingProductId = '';
  els.productMessage.textContent = '';
}

function fillProductForm(product) {
  els.productTitle.value = product.title || '';
  els.productCategory.value = product.category || 'other';
  els.productPriceBucket.value = product.priceBucket || '100to300';
  els.productStatus.value = product.status || 'active';
  setCheckedValues(els.productAttributes, product.attributes || []);
  setCheckedValues(els.productGiftScenes, product.giftScenes || []);
  setCheckedValues(els.productRecipientStyles, product.recipientStyles || []);
  els.productLink.value = product.link || '';
  els.productSummary.value = product.summary || '';
}

function clearProductForm() {
  els.productTitle.value = '';
  els.productCategory.value = 'other';
  els.productPriceBucket.value = '100to300';
  els.productStatus.value = 'active';
  setCheckedValues(els.productAttributes, []);
  setCheckedValues(els.productGiftScenes, []);
  setCheckedValues(els.productRecipientStyles, []);
  els.productLink.value = '';
  els.productSummary.value = '';
}

function setCheckedValues(container, values) {
  const selected = new Set(values);
  container.querySelectorAll('input[type="checkbox"]').forEach((input) => {
    input.checked = selected.has(input.value);
  });
}

function getCheckedValues(container) {
  return Array.from(container.querySelectorAll('input[type="checkbox"]:checked')).map((input) => input.value);
}

function deriveProductMetadata(input = {}) {
  const text = `${input.title || ''} ${input.summary || ''}`.trim();
  const category = String(input.category || '').trim();
  const inferredAttributes = [...new Set(Array.isArray(input.attributes) ? input.attributes.map(String) : [])];

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
    attributes.map((attribute) => ATTRIBUTE_LABELS.get(attribute) || attribute),
  ));
  const matchDimensions = unique(attributes.flatMap((attribute) => ATTRIBUTE_RULES[attribute]?.dimensions || []));
  const targetRelationships = unique(attributes.flatMap((attribute) => ATTRIBUTE_RULES[attribute]?.relationships || []));
  const giftScenes = inferGiftScenes({ category, attributes, input, text });
  const recipientStyles = inferRecipientStyles({ category, attributes, input, text });

  return {
    attributes,
    tags,
    matchDimensions,
    targetRelationships,
    giftScenes,
    recipientStyles,
  };
}

function inferGiftScenes({ category, attributes, input, text }) {
  const scenes = new Set(Array.isArray(input.giftScenes) ? input.giftScenes.map(String) : []);
  const normalized = text.toLowerCase();

  if (category === 'ritual' || attributes.includes('giftBox') || normalized.includes('生日')) scenes.add('birthday');
  if (normalized.includes('纪念') || normalized.includes('周年')) scenes.add('anniversary');
  if (attributes.includes('social') || attributes.includes('drink')) scenes.add('gathering');
  if (attributes.includes('travel')) scenes.add('travel');
  if (attributes.includes('home') || attributes.includes('practical') || attributes.includes('healing')) scenes.add('dailyCare');
  if (category === 'other' || attributes.includes('giftBox')) scenes.add('safeChoice');

  return unique([...scenes]);
}

function inferRecipientStyles({ category, attributes, input, text }) {
  const styles = new Set(Array.isArray(input.recipientStyles) ? input.recipientStyles.map(String) : []);
  const normalized = text.toLowerCase();

  if (attributes.includes('practical') || attributes.includes('home') || category === 'life') styles.add('practical');
  if (attributes.includes('giftBox') || attributes.includes('handmade') || category === 'ritual') styles.add('ritual');
  if (attributes.includes('travel') || attributes.includes('game') || normalized.includes('体验')) styles.add('experience');
  if (attributes.includes('premium') || attributes.includes('beauty') || attributes.includes('fragrance')) styles.add('refined');
  if (attributes.includes('social') || attributes.includes('drink')) styles.add('social');
  if (attributes.includes('cute') || attributes.includes('healing')) styles.add('easygoing');

  return unique([...styles]);
}

function renderDerivedProductPreview() {
  const derived = deriveProductMetadata({
    title: els.productTitle.value.trim(),
    summary: els.productSummary.value.trim(),
    category: els.productCategory.value,
    attributes: getCheckedValues(els.productAttributes),
    giftScenes: getCheckedValues(els.productGiftScenes),
    recipientStyles: getCheckedValues(els.productRecipientStyles),
  });

  renderPills(els.productDerivedTags, derived.tags);
  renderPills(els.productDerivedDimensions, derived.matchDimensions.map((key) => DIMENSION_LABELS[key] || key));
  renderPills(els.productDerivedRelationships, derived.targetRelationships);
  renderPills(els.productDerivedScenes, derived.giftScenes.map((key) => getLabel(GIFT_SCENE_OPTIONS, key)));
  renderPills(els.productDerivedStyles, derived.recipientStyles.map((key) => getLabel(RECIPIENT_STYLE_OPTIONS, key)));
}

function renderPills(container, values) {
  container.innerHTML = values.length
    ? values.map((value) => `<span class="pill">${escapeHtml(value)}</span>`).join('')
    : '<span class="muted">暂无</span>';
}

async function saveProduct() {
  els.productMessage.textContent = '保存中...';

  const derived = deriveProductMetadata({
    title: els.productTitle.value.trim(),
    summary: els.productSummary.value.trim(),
    category: els.productCategory.value,
    attributes: getCheckedValues(els.productAttributes),
    giftScenes: getCheckedValues(els.productGiftScenes),
    recipientStyles: getCheckedValues(els.productRecipientStyles),
  });

  const body = {
    title: els.productTitle.value.trim(),
    category: els.productCategory.value,
    priceBucket: els.productPriceBucket.value,
    status: els.productStatus.value,
    attributes: derived.attributes,
    giftScenes: derived.giftScenes,
    recipientStyles: derived.recipientStyles,
    link: els.productLink.value.trim(),
    summary: els.productSummary.value.trim(),
    priceLabel: getLabel(PRICE_BUCKETS, els.productPriceBucket.value),
  };

  try {
    if (state.editingProductId) {
      await api(`/api/products/${state.editingProductId}`, {
        method: 'PUT',
        body: JSON.stringify(body),
      });
    } else {
      await api('/api/products', {
        method: 'POST',
        body: JSON.stringify(body),
      });
    }

    await loadProducts();
    renderStats();
    els.productMessage.textContent = '商品已保存。';
    closeProductEditor();
  } catch (error) {
    els.productMessage.textContent = error.message;
  }
}

async function loadSystemConfig() {
  state.systemConfig = await api('/api/system/config');
  const provider = state.systemConfig?.aiProvider ?? {};
  els.aiBaseUrl.value = provider.baseUrl || '';
  els.aiApiKey.value = provider.apiKey || '';
  els.aiModel.value = provider.model || '';
}

async function saveSystemConfig() {
  els.systemMessage.textContent = '保存中...';
  try {
    state.systemConfig = await api('/api/system/config', {
      method: 'PUT',
      body: JSON.stringify({
        ...state.systemConfig,
        aiProvider: {
          baseUrl: els.aiBaseUrl.value.trim(),
          apiKey: els.aiApiKey.value.trim(),
          model: els.aiModel.value.trim(),
        },
      }),
    });
    renderStats();
    els.systemMessage.textContent = '配置已保存。';
  } catch (error) {
    els.systemMessage.textContent = error.message;
  }
}

async function testAiConnection() {
  els.systemMessage.textContent = '测试中...';
  try {
    await api('/api/ai/test', {
      method: 'POST',
      body: JSON.stringify({}),
    });
    els.systemMessage.textContent = '连接测试通过。';
  } catch (error) {
    els.systemMessage.textContent = `连接测试失败：${error.message}`;
  }
}

function renderStats() {
  els.userCount.textContent = String(state.users.length);
  els.productCount.textContent = String(state.products.length);
  const provider = state.systemConfig?.aiProvider ?? {};
  els.aiStatus.textContent = provider.baseUrl && provider.apiKey && provider.model ? '已配置' : '未配置';
}

function getLabel(options, value) {
  return options.find((item) => item.value === value)?.label || value;
}

function formatDateTime(value) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('zh-CN', { hour12: false });
}

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}
