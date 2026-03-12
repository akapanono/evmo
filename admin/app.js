const PRODUCT_CATEGORIES = [
  { value: 'food', label: '饮食' },
  { value: 'entertainment', label: '娱乐' },
  { value: 'life', label: '生活' },
  { value: 'social', label: '社交' },
  { value: 'travel', label: '出行' },
  { value: 'shopping', label: '消费' },
  { value: 'ritual', label: '仪式' },
  { value: 'other', label: '其他' },
];

const PRICE_BUCKETS = [
  { value: 'under50', label: '50 元以内' },
  { value: '50to100', label: '50-100 元' },
  { value: '100to300', label: '100-300 元' },
  { value: '300to1000', label: '300-1000 元' },
  { value: '1000plus', label: '1000 元以上' },
];

const PRODUCT_STATUS = [
  { value: 'active', label: '上架' },
  { value: 'draft', label: '草稿' },
  { value: 'archived', label: '归档' },
];

const ATTRIBUTE_OPTIONS = [
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
  { value: 'social', label: '聚会分享' },
  { value: 'handmade', label: '手作定制' },
  { value: 'cute', label: '可爱' },
  { value: 'premium', label: '精致' },
];

const ATTRIBUTE_LABELS = new Map(ATTRIBUTE_OPTIONS.map((item) => [item.value, item.label]));
const DIMENSION_LABELS = {
  stimulation: '刺激度',
  refinement: '精致感',
  ritualSense: '仪式感',
  companionship: '陪伴感',
  practicality: '实用度',
  aesthetics: '审美度',
  relaxation: '松弛感',
  exploration: '探索欲',
  sweetPreference: '甜感偏好',
  spicyPreference: '辣感偏好',
};

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
  { pattern: /旅行|露营|酒店|机票/i, attributes: ['travel'] },
  { pattern: /手作|定制|照片|相册/i, attributes: ['handmade', 'collectible'] },
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
  productDerivedTags: document.querySelector('#productDerivedTags'),
  productDerivedDimensions: document.querySelector('#productDerivedDimensions'),
  productDerivedRelationships: document.querySelector('#productDerivedRelationships'),
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
    if (!response.ok || !payload.ok) throw new Error(payload.error || '登录失败');
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
  if (!response.ok || !payload.ok) throw new Error(payload.error || '请求失败');
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
    els.userList.innerHTML = '<div class="empty-state">没有找到符合条件的用户。</div>';
    return;
  }

  for (const user of state.filteredUsers) {
    const item = document.createElement('article');
    item.className = 'card user-item';
    item.innerHTML = `
      <div class="user-item-head">
        <div>
          <strong>${escapeHtml(user.name || '未命名用户')}</strong>
          <div class="muted">${escapeHtml(user.phone || '未填写手机号')}</div>
        </div>
        <button class="ghost-btn" data-detail="${escapeHtml(user.id)}">查看详情</button>
      </div>
      <div class="pill-row">
        <span class="pill">朋友 ${user.friendCount}</span>
        <span class="pill">纪念日 ${user.memorialDayCount}</span>
        <span class="pill">会员 是</span>
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

  els.userDetailTitle.textContent = detail.user.name || '未命名用户';
  els.userMeta.innerHTML = '';

  const metaItems = [
    ['用户 ID', detail.user.id],
    ['昵称', detail.user.name || '-'],
    ['手机号', detail.user.phone || '-'],
    ['邮箱', detail.user.email || '-'],
    ['会员', '是'],
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
          <strong>${escapeHtml(friend.name || '未命名朋友')}</strong>
          <div class="muted">${escapeHtml(friend.relationship || '未填写关系')}</div>
        </article>
      `).join('')
    : '<div class="empty-state">还没有朋友数据。</div>';

  els.userMemorialDays.innerHTML = detail.memorialDays.length
    ? detail.memorialDays.map((item) => `
        <article class="sub-item">
          <strong>${escapeHtml(item.name || '未命名纪念日')}</strong>
          <div class="muted">${escapeHtml(item.monthDay || '-')}</div>
        </article>
      `).join('')
    : '<div class="empty-state">还没有纪念日数据。</div>';
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
      ].join(' ').toLowerCase();
      return haystack.includes(keyword);
    });
  renderProducts();
}

async function loadSystemConfig() {
  state.systemConfig = await api('/api/system/config');
  const provider = state.systemConfig?.aiProvider ?? {};
  els.aiBaseUrl.value = provider.baseUrl || '';
  els.aiApiKey.value = provider.apiKey || '';
  els.aiModel.value = provider.model || '';
}

function renderProducts() {
  els.productList.innerHTML = '';
  if (!state.filteredProducts.length) {
    els.productList.innerHTML = '<div class="empty-state">没有找到符合条件的商品。</div>';
    return;
  }

  for (const product of state.filteredProducts) {
    const item = document.createElement('article');
    item.className = 'card product-item';
    item.innerHTML = `
      <div class="product-item-head">
        <div>
          <strong>${escapeHtml(product.title)}</strong>
          <div class="muted">${escapeHtml(product.summary || '未填写简介')}</div>
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
  els.productLink.value = product.link || '';
  els.productSummary.value = product.summary || '';
}

function clearProductForm() {
  els.productTitle.value = '';
  els.productCategory.value = 'other';
  els.productPriceBucket.value = '100to300';
  els.productStatus.value = 'active';
  setCheckedValues(els.productAttributes, []);
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
  const selectedAttributes = Array.isArray(input.attributes) ? input.attributes.map(String) : [];
  const inferredAttributes = [...selectedAttributes];

  for (const rule of TEXT_RULES) {
    if (rule.pattern.test(text)) inferredAttributes.push(...rule.attributes);
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

  return { attributes, tags, matchDimensions, targetRelationships };
}

function renderDerivedProductPreview() {
  const derived = deriveProductMetadata({
    title: els.productTitle.value.trim(),
    summary: els.productSummary.value.trim(),
    category: els.productCategory.value,
    attributes: getCheckedValues(els.productAttributes),
  });

  renderPills(els.productDerivedTags, derived.tags);
  renderPills(els.productDerivedDimensions, derived.matchDimensions.map((key) => DIMENSION_LABELS[key] || key));
  renderPills(els.productDerivedRelationships, derived.targetRelationships);
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
  });

  const body = {
    title: els.productTitle.value.trim(),
    category: els.productCategory.value,
    priceBucket: els.productPriceBucket.value,
    status: els.productStatus.value,
    attributes: derived.attributes,
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
    await api('/api/ai/test', { method: 'POST', body: JSON.stringify({}) });
    els.systemMessage.textContent = '连接成功。';
  } catch (error) {
    els.systemMessage.textContent = `连接失败：${error.message}`;
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
