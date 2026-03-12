const PRODUCT_CATEGORIES = [
  { value: 'food', label: '饮食' },
  { value: 'entertainment', label: '娱乐' },
  { value: 'life', label: '生活' },
  { value: 'social', label: '社交' },
  { value: 'travel', label: '出行' },
  { value: 'shopping', label: '消费' },
  { value: 'ritual', label: '仪式感' },
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
  { value: 'active', label: '上架中' },
  { value: 'draft', label: '草稿' },
  { value: 'archived', label: '已归档' },
];

const DIMENSION_OPTIONS = [
  { value: 'stimulation', label: '刺激度' },
  { value: 'refinement', label: '精致感' },
  { value: 'ritualSense', label: '仪式感' },
  { value: 'companionship', label: '陪伴感' },
  { value: 'practicality', label: '实用度' },
  { value: 'aesthetics', label: '审美度' },
  { value: 'relaxation', label: '松弛感' },
  { value: 'exploration', label: '探索欲' },
  { value: 'sweetPreference', label: '甜感偏好' },
  { value: 'spicyPreference', label: '辣感偏好' },
];

const RELATIONSHIP_OPTIONS = [
  { value: '恋人', label: '恋人' },
  { value: '家人', label: '家人' },
  { value: '朋友', label: '朋友' },
  { value: '同事', label: '同事' },
  { value: '同学', label: '同学' },
  { value: '客户', label: '客户' },
  { value: '长辈', label: '长辈' },
  { value: '其他', label: '其他' },
];

const TAG_OPTIONS = [
  { value: '治愈', label: '治愈' },
  { value: '陪伴', label: '陪伴' },
  { value: '实用', label: '实用' },
  { value: '仪式感', label: '仪式感' },
  { value: '游戏', label: '游戏' },
  { value: '香氛', label: '香氛' },
  { value: '美食', label: '美食' },
  { value: '纪念', label: '纪念' },
  { value: '收藏', label: '收藏' },
  { value: '数码', label: '数码' },
];

const state = {
  token: '',
  users: [],
  filteredUsers: [],
  userDetail: null,
  products: [],
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
  productDimensions: document.querySelector('#productDimensions'),
  productRelationships: document.querySelector('#productRelationships'),
  productTags: document.querySelector('#productTags'),
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
  renderOptionGroup(els.productDimensions, 'productDimension', DIMENSION_OPTIONS);
  renderOptionGroup(els.productRelationships, 'productRelationship', RELATIONSHIP_OPTIONS);
  renderOptionGroup(els.productTags, 'productTag', TAG_OPTIONS);
  bindMenu();
  bindAuth();
  bindUsers();
  bindProducts();
  bindSystem();
}

function fillSelect(select, options) {
  select.innerHTML = options.map((option) => `<option value="${escapeHtml(option.value)}">${escapeHtml(option.label)}</option>`).join('');
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
}

function bindSystem() {
  els.saveSystemBtn.addEventListener('click', saveSystemConfig);
  els.testAiBtn.addEventListener('click', testAiConnection);
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

function activatePanel(panel) {
  state.activePanel = panel;
  document.querySelectorAll('.menu-item').forEach((item) => {
    item.classList.toggle('is-active', item.dataset.panel === panel);
  });
  document.querySelectorAll('.panel-view').forEach((view) => {
    view.classList.toggle('hidden', view.dataset.view !== panel);
  });
  if (panel !== 'users') {
    els.userDetailPanel.classList.add('hidden');
  }
  if (panel !== 'products') {
    els.productEditorPanel.classList.add('hidden');
  }
  if (panel === 'users' && state.token) {
    void loadUsers();
  }
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
  if (!keyword) {
    state.filteredUsers = [...state.users];
  } else {
    state.filteredUsers = state.users.filter((user) =>
      String(user.name || '').toLowerCase().includes(keyword)
      || String(user.phone || '').toLowerCase().includes(keyword)
      || String(user.id || '').toLowerCase().includes(keyword)
    );
  }
  renderUsers();
}

async function loadUserDetail(userId) {
  state.userDetail = await api(`/api/admin/users/${userId}`);
  renderUserDetail();
}

function renderUsers() {
  els.userList.innerHTML = '';
  if (!state.filteredUsers.length) {
    els.userList.innerHTML = '<div class="empty-state">没有匹配到用户</div>';
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
  if (!detail) {
    return;
  }

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
    : '<div class="empty-state">暂无朋友数据</div>';

  els.userMemorialDays.innerHTML = detail.memorialDays.length
    ? detail.memorialDays.map((item) => `
        <article class="sub-item">
          <strong>${escapeHtml(item.name || '未命名纪念日')}</strong>
          <div class="muted">${escapeHtml(item.monthDay || '-')}</div>
        </article>
      `).join('')
    : '<div class="empty-state">暂无纪念日数据</div>';
}

async function loadProducts() {
  state.products = await api('/api/products');
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
  for (const product of state.products) {
    const item = document.createElement('article');
    item.className = 'card product-item';
    item.innerHTML = `
      <div class="product-item-head">
        <div>
          <strong>${escapeHtml(product.title)}</strong>
          <div class="muted">${escapeHtml(product.summary || '暂无简介')}</div>
        </div>
        <button class="ghost-btn" data-edit="${escapeHtml(product.id)}">编辑</button>
      </div>
      <div class="pill-row">
        <span class="pill">${escapeHtml(getLabel(PRODUCT_CATEGORIES, product.category))}</span>
        <span class="pill">${escapeHtml(product.priceLabel || getLabel(PRICE_BUCKETS, product.priceBucket))}</span>
        <span class="pill">${escapeHtml(getLabel(PRODUCT_STATUS, product.status))}</span>
      </div>
    `;
    item.querySelector('[data-edit]').addEventListener('click', () => openProductEditor(product));
    els.productList.appendChild(item);
  }
}

function openProductEditor(product = null) {
  state.editingProductId = product?.id || '';
  els.productEditorTitle.textContent = product ? '编辑商品' : '新增商品';
  if (product) {
    fillProductForm(product);
  } else {
    clearProductForm();
  }
  document.querySelectorAll('.panel-view').forEach((view) => view.classList.add('hidden'));
  els.productEditorPanel.classList.remove('hidden');
  document.querySelectorAll('.menu-item').forEach((item) => {
    item.classList.toggle('is-active', item.dataset.panel === 'products');
  });
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
  setCheckedValues(els.productDimensions, product.matchDimensions || []);
  setCheckedValues(els.productRelationships, product.targetRelationships || []);
  setCheckedValues(els.productTags, product.tags || []);
  els.productLink.value = product.link || '';
  els.productSummary.value = product.summary || '';
}

function clearProductForm() {
  els.productTitle.value = '';
  els.productCategory.value = 'other';
  els.productPriceBucket.value = '100to300';
  els.productStatus.value = 'active';
  setCheckedValues(els.productDimensions, []);
  setCheckedValues(els.productRelationships, []);
  setCheckedValues(els.productTags, []);
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

async function saveProduct() {
  els.productMessage.textContent = '保存中...';
  const body = {
    title: els.productTitle.value.trim(),
    category: els.productCategory.value,
    priceBucket: els.productPriceBucket.value,
    status: els.productStatus.value,
    matchDimensions: getCheckedValues(els.productDimensions),
    targetRelationships: getCheckedValues(els.productRelationships),
    tags: getCheckedValues(els.productTags),
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
    els.productMessage.textContent = '商品已保存';
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
    els.systemMessage.textContent = '配置已保存';
  } catch (error) {
    els.systemMessage.textContent = error.message;
  }
}

async function testAiConnection() {
  els.systemMessage.textContent = '测试中...';
  try {
    await api('/api/ai/test', { method: 'POST', body: JSON.stringify({}) });
    els.systemMessage.textContent = '连接成功';
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
  if (!value) {
    return '-';
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleString('zh-CN', { hour12: false });
}

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}
