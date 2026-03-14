import crypto from 'node:crypto';
import { createServer } from 'node:http';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { config } from './config.mjs';
import {
  checkAdminPassword,
  createAdminToken,
  createUserToken,
  hashSecurityAnswer,
  hashPassword,
  verifyAdminToken,
  verifyPassword,
  verifySecurityAnswer,
  verifyUserToken,
} from './auth.mjs';
import { forwardChat, forwardChatStream, testChatConnection } from './ai-proxy.mjs';
import { database } from './database/index.mjs';
import { applyCorsHeaders, getBearerToken, json, noContent, readBody, serveStaticFile } from './http.mjs';
import { deriveProductMetadata } from './product-metadata.mjs';
import { buildServerOccasionRecommendation } from './recommendation.mjs';
import {
  deleteFriend,
  deleteMemorialDay,
  getAdminUserDetail,
  getFriendById,
  getFriendsByUserId,
  getMemorialDayById,
  getMemorialDaysByUserId,
  getProducts,
  getSystemConfig,
  getUserBackup,
  getUserById,
  getUserByUsername,
  getUsers,
  replaceUserBackup,
  saveFriend,
  saveMemorialDay,
  saveProducts,
  saveSystemConfig,
  saveUser,
} from './store.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const adminDir = join(__dirname, '..', '..', 'admin');
const rateLimitBuckets = new Map();

const USERNAME_PATTERN = /^[A-Za-z0-9]{8,30}$/;
const PASSWORD_PATTERN = /^[A-Za-z0-9]{6,15}$/;
const SECURITY_QUESTION_COUNT = 3;

function normalizeUsername(value) {
  return String(value || '').trim();
}

function isValidUsername(value) {
  return USERNAME_PATTERN.test(value);
}

function isValidPassword(value) {
  return PASSWORD_PATTERN.test(value);
}

function normalizeSecurityQuestions(value) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.slice(0, SECURITY_QUESTION_COUNT).map((item) => ({
    question: String(item?.question || '').trim(),
    answer: String(item?.answer || '').trim(),
  }));
}

function validateSecurityQuestions(questions) {
  if (questions.length !== SECURITY_QUESTION_COUNT) {
    return '请完整填写 3 个密保问题和答案。';
  }

  const questionSet = new Set();
  for (const item of questions) {
    if (!item.question || !item.answer) {
      return '请完整填写 3 个密保问题和答案。';
    }

    if (item.question.length < 2 || item.question.length > 60) {
      return '密保问题长度需在 2 到 60 个字符之间。';
    }

    if (item.answer.length < 1 || item.answer.length > 60) {
      return '密保答案长度需在 1 到 60 个字符之间。';
    }

    const normalizedQuestion = item.question.toLowerCase();
    if (questionSet.has(normalizedQuestion)) {
      return '3 个密保问题不能重复。';
    }

    questionSet.add(normalizedQuestion);
  }

  return '';
}

function getUserIdFromRequest(req) {
  return verifyUserToken(getBearerToken(req));
}

function requireUserId(req, res) {
  const userId = getUserIdFromRequest(req);
  if (!userId) {
    json(res, 401, { ok: false, error: '请先登录。' });
    return null;
  }

  return userId;
}

function buildAuthUser(user) {
  return {
    id: user.id,
    name: user.name,
    username: user.username,
    hasPassword: Boolean(user.passwordHash),
  };
}

function buildAuthSession(user) {
  return {
    token: createUserToken(user.id),
    user: buildAuthUser(user),
  };
}

function getClientIp(req) {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.trim()) {
    return forwarded.split(',')[0].trim();
  }

  return req.socket.remoteAddress || 'unknown';
}

function getRateLimitRule(url) {
  if (url.pathname.startsWith('/api/ai/')) {
    return { windowMs: config.security.rateLimitWindowMs, maxRequests: Math.max(10, Math.floor(config.security.rateLimitMaxRequests / 2)) };
  }

  if (
    url.pathname === '/api/auth/login'
    || url.pathname === '/api/auth/register'
    || url.pathname === '/api/auth/password-reset/questions'
    || url.pathname === '/api/auth/password-reset'
    || url.pathname === '/api/admin/login'
  ) {
    return { windowMs: config.security.rateLimitWindowMs, maxRequests: Math.max(5, Math.floor(config.security.rateLimitMaxRequests / 4)) };
  }

  if (url.pathname.startsWith('/api/backup/') || url.pathname === '/api/recommendations/occasion') {
    return { windowMs: config.security.rateLimitWindowMs, maxRequests: Math.max(10, Math.floor(config.security.rateLimitMaxRequests / 2)) };
  }

  if (url.pathname.startsWith('/api/')) {
    return { windowMs: config.security.rateLimitWindowMs, maxRequests: config.security.rateLimitMaxRequests };
  }

  return null;
}

function checkRateLimit(req, url) {
  const rule = getRateLimitRule(url);
  if (!rule) {
    return { allowed: true };
  }

  const now = Date.now();
  const key = `${getClientIp(req)}:${req.method}:${url.pathname}`;
  const current = rateLimitBuckets.get(key);

  if (!current || current.expiresAt <= now) {
    rateLimitBuckets.set(key, {
      count: 1,
      expiresAt: now + rule.windowMs,
    });
    return { allowed: true };
  }

  if (current.count >= rule.maxRequests) {
    return {
      allowed: false,
      retryAfterSeconds: Math.max(1, Math.ceil((current.expiresAt - now) / 1000)),
    };
  }

  current.count += 1;
  return { allowed: true };
}

function auditLog(req, event, details = {}) {
  console.info(JSON.stringify({
    time: new Date().toISOString(),
    event,
    method: req.method,
    path: req.url,
    ip: getClientIp(req),
    ...details,
  }));
}

async function handleAuthRoutes(req, res, url) {
  if (req.method === 'POST' && url.pathname === '/api/admin/login') {
    const body = await readBody(req);
    const adminUsername = String(body.username || '');

    if (!checkAdminPassword(body.username, body.password)) {
      auditLog(req, 'admin_login_failed', { status: 'failed', username: adminUsername });
      json(res, 401, { ok: false, error: 'Invalid admin credentials' });
      return true;
    }

    auditLog(req, 'admin_login_succeeded', { status: 'ok', username: config.admin.username });
    json(res, 200, {
      ok: true,
      data: {
        token: createAdminToken(),
        username: config.admin.username,
      },
    });
    return true;
  }

  if (req.method === 'POST' && url.pathname === '/api/auth/register') {
    const body = await readBody(req);
    const username = normalizeUsername(body.username);
    const password = String(body.password || '').trim();
    const confirmPassword = String(body.confirmPassword || '').trim();
    const securityQuestions = normalizeSecurityQuestions(body.securityQuestions);
    const questionsError = validateSecurityQuestions(securityQuestions);

    if (!isValidUsername(username)) {
      json(res, 400, { ok: false, error: 'Username must be 8-30 letters or digits.' });
      return true;
    }

    if (!isValidPassword(password)) {
      json(res, 400, { ok: false, error: 'Password must be 6-15 letters or digits.' });
      return true;
    }

    if (password !== confirmPassword) {
      json(res, 400, { ok: false, error: 'Passwords do not match.' });
      return true;
    }

    if (questionsError) {
      json(res, 400, { ok: false, error: questionsError });
      return true;
    }

    const existing = await getUserByUsername(username);
    if (existing) {
      auditLog(req, 'register_failed', { status: 'failed', username, reason: 'username_exists' });
      json(res, 409, { ok: false, error: 'Username already exists.' });
      return true;
    }

    const now = new Date().toISOString();
    const user = await saveUser({
      id: crypto.randomUUID(),
      username,
      name: username,
      email: '',
      status: 'active',
      passwordHash: hashPassword(password),
      securityQuestion1: securityQuestions[0].question,
      securityAnswerHash1: hashSecurityAnswer(securityQuestions[0].answer),
      securityQuestion2: securityQuestions[1].question,
      securityAnswerHash2: hashSecurityAnswer(securityQuestions[1].answer),
      securityQuestion3: securityQuestions[2].question,
      securityAnswerHash3: hashSecurityAnswer(securityQuestions[2].answer),
      createdAt: now,
      updatedAt: now,
    });

    auditLog(req, 'register_succeeded', { status: 'ok', username, userId: user.id });
    json(res, 201, { ok: true, data: buildAuthSession(user) });
    return true;
  }

  if (req.method === 'POST' && url.pathname === '/api/auth/login') {
    const body = await readBody(req);
    const username = normalizeUsername(body.username);
    const password = String(body.password || '').trim();
    const user = await getUserByUsername(username);

    if (!user || !verifyPassword(password, user.passwordHash)) {
      auditLog(req, 'login_failed', { status: 'failed', username });
      json(res, 401, { ok: false, error: 'Invalid username or password.' });
      return true;
    }

    auditLog(req, 'login_succeeded', { status: 'ok', username, userId: user.id });
    json(res, 200, { ok: true, data: buildAuthSession(user) });
    return true;
  }

  if (req.method === 'POST' && url.pathname === '/api/auth/password-reset/questions') {
    const body = await readBody(req);
    const username = normalizeUsername(body.username);

    if (!isValidUsername(username)) {
      json(res, 400, { ok: false, error: 'Username must be 8-30 letters or digits.' });
      return true;
    }

    const user = await getUserByUsername(username);
    if (!user) {
      json(res, 404, { ok: false, error: 'User not found.' });
      return true;
    }

    json(res, 200, {
      ok: true,
      data: {
        questions: [user.securityQuestion1, user.securityQuestion2, user.securityQuestion3],
      },
    });
    return true;
  }

  if (req.method === 'POST' && url.pathname === '/api/auth/password-reset') {
    const body = await readBody(req);
    const username = normalizeUsername(body.username);
    const newPassword = String(body.newPassword || '').trim();
    const confirmNewPassword = String(body.confirmNewPassword || '').trim();
    const securityAnswers = Array.isArray(body.securityAnswers) ? body.securityAnswers : [];
    const user = await getUserByUsername(username);

    if (!isValidUsername(username)) {
      json(res, 400, { ok: false, error: 'Username must be 8-30 letters or digits.' });
      return true;
    }

    if (!user) {
      auditLog(req, 'password_reset_failed', { status: 'failed', username, reason: 'user_not_found' });
      json(res, 404, { ok: false, error: 'User not found.' });
      return true;
    }

    if (!isValidPassword(newPassword)) {
      json(res, 400, { ok: false, error: 'Password must be 6-15 letters or digits.' });
      return true;
    }

    if (newPassword !== confirmNewPassword) {
      json(res, 400, { ok: false, error: 'Passwords do not match.' });
      return true;
    }

    if (securityAnswers.length !== SECURITY_QUESTION_COUNT) {
      json(res, 400, { ok: false, error: 'Please answer all three security questions.' });
      return true;
    }

    const answerOk = verifySecurityAnswer(securityAnswers[0], user.securityAnswerHash1)
      && verifySecurityAnswer(securityAnswers[1], user.securityAnswerHash2)
      && verifySecurityAnswer(securityAnswers[2], user.securityAnswerHash3);

    if (!answerOk) {
      auditLog(req, 'password_reset_failed', { status: 'failed', username, reason: 'invalid_answers' });
      json(res, 401, { ok: false, error: 'Security answers are incorrect.' });
      return true;
    }

    const nextUser = await saveUser({
      ...user,
      passwordHash: hashPassword(newPassword),
      updatedAt: new Date().toISOString(),
    });

    auditLog(req, 'password_reset_succeeded', { status: 'ok', username, userId: user.id });
    json(res, 200, { ok: true, data: buildAuthSession(nextUser) });
    return true;
  }

  if (req.method === 'GET' && url.pathname === '/api/auth/me') {
    const userId = getUserIdFromRequest(req);
    if (!userId) {
      json(res, 401, { ok: false, error: 'Please log in first.' });
      return true;
    }

    const user = await getUserById(userId);
    if (!user) {
      json(res, 404, { ok: false, error: 'User not found.' });
      return true;
    }

    json(res, 200, { ok: true, data: buildAuthUser(user) });
    return true;
  }

  return false;
}

async function handleApiRoutes(req, res, url) {
  if (req.method === 'GET' && url.pathname === '/api/health') {
    json(res, 200, { ok: true, data: { status: 'ok', time: new Date().toISOString() } });
    return true;
  }

  if (req.method === 'GET' && url.pathname === '/api/products') {
    json(res, 200, { ok: true, data: await getProducts() });
    return true;
  }

  if (req.method === 'GET' && url.pathname === '/api/admin/users') {
    const users = await getUsers();
    const enriched = await Promise.all(users.map(async (user) => {
      const backup = await getUserBackup(user.id);
      return {
        id: user.id,
        username: user.username,
        name: user.name,
        email: user.email,
        status: user.status,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
        friendCount: backup.friends.length,
        memorialDayCount: backup.memorialDays.length,
      };
    }));

    json(res, 200, { ok: true, data: enriched });
    return true;
  }

  if (req.method === 'GET' && url.pathname.startsWith('/api/admin/users/')) {
    const userId = url.pathname.slice('/api/admin/users/'.length);
    const detail = await getAdminUserDetail(userId);
    if (!detail) {
      json(res, 404, { ok: false, error: 'User not found' });
      return true;
    }

    json(res, 200, { ok: true, data: detail });
    return true;
  }

  if (req.method === 'POST' && url.pathname === '/api/backup/push') {
    const userId = requireUserId(req, res);
    if (!userId) {
      return true;
    }

    const body = await readBody(req);
    await replaceUserBackup(userId, body);
    auditLog(req, 'backup_push_succeeded', { status: 'ok', userId });

    json(res, 200, {
      ok: true,
      data: {
        savedAt: new Date().toISOString(),
      },
    });
    return true;
  }

  if (req.method === 'GET' && url.pathname === '/api/backup/pull') {
    const userId = requireUserId(req, res);
    if (!userId) {
      return true;
    }

    const backup = await getUserBackup(userId);
    auditLog(req, 'backup_pull_succeeded', { status: 'ok', userId });

    json(res, 200, {
      ok: true,
      data: {
        ...backup,
        restoredAt: new Date().toISOString(),
      },
    });
    return true;
  }

  if (req.method === 'GET' && url.pathname === '/api/friends') {
    const userId = requireUserId(req, res);
    if (!userId) {
      return true;
    }

    json(res, 200, { ok: true, data: await getFriendsByUserId(userId) });
    return true;
  }

  if (req.method === 'GET' && url.pathname.startsWith('/api/friends/')) {
    const userId = requireUserId(req, res);
    if (!userId) {
      return true;
    }

    const friendId = url.pathname.slice('/api/friends/'.length);
    const friend = await getFriendById(friendId);
    if (!friend || friend.userId !== userId) {
      json(res, 404, { ok: false, error: 'Friend not found' });
      return true;
    }

    json(res, 200, { ok: true, data: friend });
    return true;
  }

  if (req.method === 'POST' && url.pathname === '/api/friends') {
    const userId = requireUserId(req, res);
    if (!userId) {
      return true;
    }

    const body = await readBody(req);
    const nextFriend = await saveFriend({ ...body, userId });
    json(res, 201, { ok: true, data: nextFriend });
    return true;
  }

  if (req.method === 'PUT' && url.pathname.startsWith('/api/friends/')) {
    const userId = requireUserId(req, res);
    if (!userId) {
      return true;
    }

    const friendId = url.pathname.slice('/api/friends/'.length);
    const currentFriend = await getFriendById(friendId);
    if (!currentFriend || currentFriend.userId !== userId) {
      json(res, 404, { ok: false, error: 'Friend not found' });
      return true;
    }

    const body = await readBody(req);
    const nextFriend = await saveFriend({ ...body, id: friendId, userId });
    json(res, 200, { ok: true, data: nextFriend });
    return true;
  }

  if (req.method === 'DELETE' && url.pathname.startsWith('/api/friends/')) {
    const userId = requireUserId(req, res);
    if (!userId) {
      return true;
    }

    const friendId = url.pathname.slice('/api/friends/'.length);
    const currentFriend = await getFriendById(friendId);
    if (!currentFriend || currentFriend.userId !== userId) {
      json(res, 404, { ok: false, error: 'Friend not found' });
      return true;
    }

    await deleteFriend(friendId);
    json(res, 200, { ok: true, data: { id: friendId } });
    return true;
  }

  if (req.method === 'GET' && url.pathname === '/api/memorial-days') {
    const userId = requireUserId(req, res);
    if (!userId) {
      return true;
    }

    json(res, 200, { ok: true, data: await getMemorialDaysByUserId(userId) });
    return true;
  }

  if (req.method === 'GET' && url.pathname.startsWith('/api/memorial-days/')) {
    const userId = requireUserId(req, res);
    if (!userId) {
      return true;
    }

    const memorialDayId = url.pathname.slice('/api/memorial-days/'.length);
    const memorialDay = await getMemorialDayById(memorialDayId);
    if (!memorialDay || memorialDay.userId !== userId) {
      json(res, 404, { ok: false, error: 'Memorial day not found' });
      return true;
    }

    json(res, 200, { ok: true, data: memorialDay });
    return true;
  }

  if (req.method === 'POST' && url.pathname === '/api/memorial-days') {
    const userId = requireUserId(req, res);
    if (!userId) {
      return true;
    }

    const body = await readBody(req);
    const nextMemorialDay = await saveMemorialDay({ ...body, userId });
    json(res, 201, { ok: true, data: nextMemorialDay });
    return true;
  }

  if (req.method === 'PUT' && url.pathname.startsWith('/api/memorial-days/')) {
    const userId = requireUserId(req, res);
    if (!userId) {
      return true;
    }

    const memorialDayId = url.pathname.slice('/api/memorial-days/'.length);
    const currentMemorialDay = await getMemorialDayById(memorialDayId);
    if (!currentMemorialDay || currentMemorialDay.userId !== userId) {
      json(res, 404, { ok: false, error: 'Memorial day not found' });
      return true;
    }

    const body = await readBody(req);
    const nextMemorialDay = await saveMemorialDay({ ...body, id: memorialDayId, userId });
    json(res, 200, { ok: true, data: nextMemorialDay });
    return true;
  }

  if (req.method === 'DELETE' && url.pathname.startsWith('/api/memorial-days/')) {
    const userId = requireUserId(req, res);
    if (!userId) {
      return true;
    }

    const memorialDayId = url.pathname.slice('/api/memorial-days/'.length);
    const currentMemorialDay = await getMemorialDayById(memorialDayId);
    if (!currentMemorialDay || currentMemorialDay.userId !== userId) {
      json(res, 404, { ok: false, error: 'Memorial day not found' });
      return true;
    }

    await deleteMemorialDay(memorialDayId);
    json(res, 200, { ok: true, data: { id: memorialDayId } });
    return true;
  }

  if (req.method === 'GET' && url.pathname === '/api/system/config') {
    json(res, 200, { ok: true, data: await getSystemConfig() });
    return true;
  }

  if (req.method === 'PUT' && url.pathname === '/api/system/config') {
    const body = await readBody(req);
    json(res, 200, { ok: true, data: await saveSystemConfig(body) });
    return true;
  }

  if (req.method === 'POST' && url.pathname === '/api/products') {
    const body = await readBody(req);
    const products = await getProducts();
    const now = new Date().toISOString();
    const derived = deriveProductMetadata(body);
    const nextProduct = {
      id: body.id?.trim() || crypto.randomUUID(),
      title: body.title?.trim() || '',
      category: body.category?.trim() || 'other',
      status: body.status?.trim() || 'draft',
      priceBucket: body.priceBucket?.trim() || '100to300',
      priceLabel: body.priceLabel?.trim() || '',
      attributes: derived.attributes,
      tags: derived.tags,
      matchDimensions: derived.matchDimensions,
      targetRelationships: derived.targetRelationships,
      giftScenes: derived.giftScenes,
      recipientStyles: derived.recipientStyles,
      riskLevel: derived.riskLevel,
      link: body.link?.trim() || '',
      summary: body.summary?.trim() || '',
      createdAt: now,
      updatedAt: now,
    };
    products.unshift(nextProduct);
    await saveProducts(products);
    auditLog(req, 'product_created', { status: 'ok', productId: nextProduct.id });
    json(res, 201, { ok: true, data: nextProduct });
    return true;
  }

  if (req.method === 'PUT' && url.pathname.startsWith('/api/products/')) {
    const body = await readBody(req);
    const productId = url.pathname.slice('/api/products/'.length);
    const products = await getProducts();
    const index = products.findIndex((item) => item.id === productId);
    if (index === -1) {
      json(res, 404, { ok: false, error: '商品不存在。' });
      return true;
    }

    const current = products[index];
    const merged = {
      ...current,
      ...body,
      id: current.id,
    };
    const derived = deriveProductMetadata(merged);
    const next = {
      ...merged,
      attributes: derived.attributes,
      tags: derived.tags,
      matchDimensions: derived.matchDimensions,
      targetRelationships: derived.targetRelationships,
      giftScenes: derived.giftScenes,
      recipientStyles: derived.recipientStyles,
      riskLevel: derived.riskLevel,
      updatedAt: new Date().toISOString(),
    };
    products[index] = next;
    await saveProducts(products);
    auditLog(req, 'product_updated', { status: 'ok', productId });
    json(res, 200, { ok: true, data: next });
    return true;
  }

  if (req.method === 'DELETE' && url.pathname.startsWith('/api/products/')) {
    const productId = url.pathname.slice('/api/products/'.length);
    const products = await getProducts();
    await saveProducts(products.filter((item) => item.id !== productId));
    auditLog(req, 'product_deleted', { status: 'ok', productId });
    json(res, 200, { ok: true, data: { id: productId } });
    return true;
  }

  if (req.method === 'POST' && url.pathname === '/api/ai/test') {
    const body = await readBody(req);
    const systemConfig = await getSystemConfig();
    auditLog(req, 'ai_test_requested', { status: 'ok' });
    json(res, 200, { ok: true, data: await testChatConnection({ systemConfig, body }) });
    return true;
  }

  if (req.method === 'POST' && url.pathname === '/api/ai/chat') {
    const body = await readBody(req);
    const systemConfig = await getSystemConfig();
    auditLog(req, 'ai_chat_requested', { status: 'ok', stream: Boolean(body.stream) });

    if (body.stream) {
      await forwardChatStream({ systemConfig, body, res });
      return true;
    }

    json(res, 200, { ok: true, data: await forwardChat({ systemConfig, body }) });
    return true;
  }

  if (req.method === 'POST' && url.pathname === '/api/recommendations/occasion') {
    const body = await readBody(req);
    const products = await getProducts();
    const recommendation = buildServerOccasionRecommendation({
      friend: body.friend,
      linkedFriends: body.linkedFriends,
      memorial: body.memorial,
      products,
      topScoreLimit: body.topScoreLimit,
      previewGiftLimit: body.previewGiftLimit,
    });
    auditLog(req, 'recommendation_generated', {
      status: 'ok',
      linkedFriendCount: Array.isArray(body.linkedFriends) ? body.linkedFriends.length : 0,
      hasMemorial: Boolean(body.memorial),
    });
    json(res, 200, { ok: true, data: recommendation });
    return true;
  }

  return false;
}

const server = createServer(async (req, res) => {
  const corsAllowed = applyCorsHeaders(req, res);
  if (!corsAllowed) {
    auditLog(req, 'cors_blocked', { status: 'blocked' });
    json(res, 403, { ok: false, error: 'CORS origin not allowed' });
    return;
  }

  if (req.method === 'OPTIONS') {
    noContent(res);
    return;
  }

  try {
    const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
    const rateLimit = checkRateLimit(req, url);
    if (!rateLimit.allowed) {
      res.setHeader('Retry-After', String(rateLimit.retryAfterSeconds));
      auditLog(req, 'rate_limited', { status: 'blocked', retryAfterSeconds: rateLimit.retryAfterSeconds });
      json(res, 429, { ok: false, error: 'Too many requests' });
      return;
    }

    if (await handleAuthRoutes(req, res, url)) {
      return;
    }

    if (url.pathname.startsWith('/api/')) {
      const publicPaths = new Set([
        '/api/health',
        '/api/admin/login',
        '/api/ai/test',
        '/api/ai/chat',
        '/api/auth/register',
        '/api/auth/login',
        '/api/auth/password-reset/questions',
        '/api/auth/password-reset',
      ]);
      const adminProtectedPrefixes = ['/api/admin/', '/api/products', '/api/system/config'];
      const requiresAdmin = adminProtectedPrefixes.some((prefix) => url.pathname.startsWith(prefix));
      const isPublic = publicPaths.has(url.pathname);

      if (requiresAdmin && !verifyAdminToken(getBearerToken(req))) {
        json(res, 401, { ok: false, error: '管理员鉴权失败。' });
        return;
      }

      if (!requiresAdmin && !isPublic && !getUserIdFromRequest(req)) {
        json(res, 401, { ok: false, error: '请先登录。' });
        return;
      }
    }

    if (await handleApiRoutes(req, res, url)) {
      return;
    }

    if (req.method === 'GET' && (url.pathname === '/' || url.pathname === '/admin' || url.pathname === '/admin/')) {
      serveStaticFile(res, adminDir, 'index.html');
      return;
    }

    if (url.pathname.startsWith('/admin/')) {
      const relativePath = url.pathname.slice('/admin/'.length);
      if (serveStaticFile(res, adminDir, relativePath)) {
        return;
      }
    }

    json(res, 404, { ok: false, error: 'Not found' });
  } catch (error) {
    if (error instanceof Error && error.message.startsWith('Request body too large.')) {
      json(res, 413, { ok: false, error: error.message });
      return;
    }

    auditLog(req, 'request_failed', { status: 'error', error: error instanceof Error ? error.message : 'unknown_error' });
    json(res, 500, { ok: false, error: error instanceof Error ? error.message : '服务器内部错误。' });
  }
});

if (typeof database.runMigrations === 'function') {
  await database.runMigrations();
}

server.listen(config.port, () => {
  console.log(`EVMO server listening on http://localhost:${config.port}`);
});
