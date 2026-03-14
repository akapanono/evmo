import crypto from 'node:crypto';
import { createServer } from 'node:http';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { config } from './config.mjs';
import {
  checkAdminPassword,
  createAdminToken,
  createUserToken,
  hashPassword,
  verifyAdminToken,
  verifyPassword,
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
  getUserByPhone,
  getUserByProvider,
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
const phoneCodeBuckets = new Map();

function normalizeProvider(value) {
  return value === 'wechat' ? 'wechat' : value === 'qq' ? 'qq' : '';
}

function normalizePhone(value) {
  return String(value || '').replace(/\s+/g, '').trim();
}

function maskPhone(phone) {
  if (phone.length < 7) {
    return phone;
  }

  return `${phone.slice(0, 3)}****${phone.slice(-4)}`;
}

function issuePhoneCode(userId, phone, purpose) {
  const code = String(Math.floor(100000 + Math.random() * 900000));
  const expiresAt = Date.now() + 5 * 60 * 1000;
  phoneCodeBuckets.set(`${userId}:${purpose}:${phone}`, { code, expiresAt });
  return {
    code,
    expiresAt,
  };
}

function consumePhoneCode(userId, phone, purpose, code) {
  const key = `${userId}:${purpose}:${phone}`;
  const current = phoneCodeBuckets.get(key);
  if (!current) {
    return { ok: false, error: '请先获取验证码。' };
  }

  if (current.expiresAt <= Date.now()) {
    phoneCodeBuckets.delete(key);
    return { ok: false, error: '验证码已过期，请重新获取。' };
  }

  if (current.code !== code) {
    return { ok: false, error: '验证码不正确。' };
  }

  phoneCodeBuckets.delete(key);
  return { ok: true };
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
    phone: user.phone,
    hasPassword: Boolean(user.passwordHash),
    bindings: {
      wechat: Boolean(user.wechatOpenId),
      qq: Boolean(user.qqOpenId),
    },
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
    || url.pathname === '/api/auth/register-code/send'
    || url.pathname === '/api/auth/register-by-code'
    || url.pathname === '/api/auth/provider-login'
    || url.pathname === '/api/auth/phone-code/send'
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
      json(res, 401, { ok: false, error: '管理员账号或密码错误。' });
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
    const phone = String(body.phone || '').trim();
    const password = String(body.password || '').trim();
    const name = String(body.name || '').trim();

    if (!phone || !password) {
      json(res, 400, { ok: false, error: '请输入手机号和密码。' });
      return true;
    }

    const existing = await getUserByPhone(phone);
    if (existing) {
      auditLog(req, 'register_failed', { status: 'failed', phone, reason: 'phone_exists' });
      json(res, 409, { ok: false, error: '该手机号已注册。' });
      return true;
    }

    const user = await saveUser({
      id: crypto.randomUUID(),
      name: name || `用户${phone.slice(-4)}`,
      phone,
      email: '',
      status: 'active',
      passwordHash: hashPassword(password),
      wechatOpenId: '',
      qqOpenId: '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    auditLog(req, 'register_succeeded', { status: 'ok', phone, userId: user.id });
    json(res, 201, { ok: true, data: buildAuthSession(user) });
    return true;
  }

  if (req.method === 'POST' && url.pathname === '/api/auth/register-code/send') {
    const body = await readBody(req);
    const phone = normalizePhone(body.phone);

    if (!phone) {
      json(res, 400, { ok: false, error: '请输入手机号。' });
      return true;
    }

    const existing = await getUserByPhone(phone);
    if (existing) {
      auditLog(req, 'register_code_send_failed', { status: 'failed', phone, reason: 'phone_exists' });
      json(res, 409, { ok: false, error: '该手机号已注册。' });
      return true;
    }

    const verification = issuePhoneCode('public', phone, 'register');
    auditLog(req, 'register_code_sent', { status: 'ok', phone });
    json(res, 200, {
      ok: true,
      data: {
        maskedPhone: maskPhone(phone),
        expiresInSeconds: Math.max(1, Math.ceil((verification.expiresAt - Date.now()) / 1000)),
        devCode: verification.code,
      },
    });
    return true;
  }

  if (req.method === 'POST' && url.pathname === '/api/auth/register-by-code') {
    const body = await readBody(req);
    const phone = normalizePhone(body.phone);
    const code = String(body.code || '').trim();
    const name = String(body.name || '').trim();

    if (!phone || !code) {
      json(res, 400, { ok: false, error: '请输入手机号和验证码。' });
      return true;
    }

    const existing = await getUserByPhone(phone);
    if (existing) {
      auditLog(req, 'register_by_code_failed', { status: 'failed', phone, reason: 'phone_exists' });
      json(res, 409, { ok: false, error: '该手机号已注册。' });
      return true;
    }

    const verification = consumePhoneCode('public', phone, 'register', code);
    if (!verification.ok) {
      auditLog(req, 'register_by_code_failed', { status: 'failed', phone, reason: 'invalid_code' });
      json(res, 400, { ok: false, error: verification.error });
      return true;
    }

    const now = new Date().toISOString();
    const user = await saveUser({
      id: crypto.randomUUID(),
      name: name || `用户${phone.slice(-4)}`,
      phone,
      email: '',
      status: 'active',
      passwordHash: '',
      wechatOpenId: '',
      qqOpenId: '',
      createdAt: now,
      updatedAt: now,
    });

    auditLog(req, 'register_by_code_succeeded', { status: 'ok', phone, userId: user.id });
    json(res, 201, { ok: true, data: buildAuthSession(user) });
    return true;
  }

  if (req.method === 'POST' && url.pathname === '/api/auth/login') {
    const body = await readBody(req);
    const phone = String(body.phone || '').trim();
    const password = String(body.password || '').trim();
    const user = await getUserByPhone(phone);

    if (!user || !verifyPassword(password, user.passwordHash)) {
      auditLog(req, 'login_failed', { status: 'failed', phone });
      json(res, 401, { ok: false, error: '手机号或密码错误。' });
      return true;
    }

    if (!user.phone) {
      json(res, 400, { ok: false, error: '该账号尚未绑定手机号。' });
      return true;
    }

    auditLog(req, 'login_succeeded', { status: 'ok', phone, userId: user.id });
    json(res, 200, { ok: true, data: buildAuthSession(user) });
    return true;
  }

  if (req.method === 'POST' && url.pathname === '/api/auth/provider-login') {
    const body = await readBody(req);
    const provider = normalizeProvider(body.provider);
    const providerId = String(body.providerId || '').trim();
    const displayName = String(body.displayName || '').trim();

    if (!provider || !providerId) {
      json(res, 400, { ok: false, error: '缺少第三方账号信息。' });
      return true;
    }

    let user = await getUserByProvider(provider, providerId);
    if (!user) {
      const now = new Date().toISOString();
      user = await saveUser({
        id: crypto.randomUUID(),
        name: displayName || `${provider === 'wechat' ? '微信' : 'QQ'}用户${providerId.slice(-4)}`,
        phone: '',
        email: '',
        status: 'active',
        passwordHash: '',
        wechatOpenId: provider === 'wechat' ? providerId : '',
        qqOpenId: provider === 'qq' ? providerId : '',
        createdAt: now,
        updatedAt: now,
      });
      auditLog(req, 'provider_register_succeeded', { status: 'ok', provider, userId: user.id });
    } else {
      auditLog(req, 'provider_login_succeeded', { status: 'ok', provider, userId: user.id });
    }

    json(res, 200, { ok: true, data: buildAuthSession(user) });
    return true;
  }

  if (req.method === 'POST' && url.pathname === '/api/auth/phone-code/send') {
    const userId = requireUserId(req, res);
    if (!userId) {
      return true;
    }

    const body = await readBody(req);
    const phone = normalizePhone(body.phone);
    const purpose = String(body.purpose || 'bind').trim() || 'bind';
    const currentUser = await getUserById(userId);

    if (!currentUser) {
      json(res, 404, { ok: false, error: '用户不存在。' });
      return true;
    }

    if (!phone) {
      json(res, 400, { ok: false, error: '请输入手机号。' });
      return true;
    }

    const existing = await getUserByPhone(phone);
    if (existing && existing.id !== userId) {
      json(res, 409, { ok: false, error: '该手机号已绑定到其他账号。' });
      return true;
    }

    const verification = issuePhoneCode(userId, phone, purpose);
    auditLog(req, 'phone_code_sent', { status: 'ok', userId, phone, purpose });
    json(res, 200, {
      ok: true,
      data: {
        maskedPhone: maskPhone(phone),
        expiresInSeconds: Math.max(1, Math.ceil((verification.expiresAt - Date.now()) / 1000)),
        devCode: verification.code,
      },
    });
    return true;
  }

  if (req.method === 'GET' && url.pathname === '/api/auth/me') {
    const userId = getUserIdFromRequest(req);
    if (!userId) {
      json(res, 401, { ok: false, error: '请先登录。' });
      return true;
    }

    const user = await getUserById(userId);
    if (!user) {
      json(res, 404, { ok: false, error: '用户不存在。' });
      return true;
    }

    json(res, 200, { ok: true, data: buildAuthUser(user) });
    return true;
  }

  if (req.method === 'POST' && url.pathname === '/api/auth/bind/phone-code') {
    const userId = requireUserId(req, res);
    if (!userId) {
      return true;
    }

    const body = await readBody(req);
    const phone = normalizePhone(body.phone);
    const code = String(body.code || '').trim();
    const currentUser = await getUserById(userId);

    if (!currentUser) {
      json(res, 404, { ok: false, error: '用户不存在。' });
      return true;
    }

    if (!phone || !code) {
      json(res, 400, { ok: false, error: '请输入手机号和密码。' });
      return true;
    }

    const existing = await getUserByPhone(phone);
    if (existing && existing.id !== userId) {
      json(res, 409, { ok: false, error: '该手机号已绑定其他账号。' });
      return true;
    }

    const verification = consumePhoneCode(userId, phone, 'bind', code);
    if (!verification.ok) {
      json(res, 400, { ok: false, error: verification.error });
      return true;
    }

    const nextUser = await saveUser({
      ...currentUser,
      phone,
      updatedAt: new Date().toISOString(),
    });

    auditLog(req, 'phone_bound', { status: 'ok', userId, phone });
    json(res, 200, { ok: true, data: buildAuthUser(nextUser) });
    return true;
  }

  if (req.method === 'POST' && url.pathname === '/api/auth/bind/provider') {
    const userId = requireUserId(req, res);
    if (!userId) {
      return true;
    }

    const body = await readBody(req);
    const provider = normalizeProvider(body.provider);
    const providerId = String(body.providerId || '').trim();
    const currentUser = await getUserById(userId);

    if (!currentUser) {
      json(res, 404, { ok: false, error: '用户不存在。' });
      return true;
    }

    if (!provider || !providerId) {
      json(res, 400, { ok: false, error: '缺少绑定信息。' });
      return true;
    }

    const existing = await getUserByProvider(provider, providerId);
    if (existing && existing.id !== userId) {
      json(res, 409, { ok: false, error: '该账号已绑定其他用户。' });
      return true;
    }

    const nextUser = await saveUser({
      ...currentUser,
      wechatOpenId: provider === 'wechat' ? providerId : currentUser.wechatOpenId,
      qqOpenId: provider === 'qq' ? providerId : currentUser.qqOpenId,
      updatedAt: new Date().toISOString(),
    });

    auditLog(req, 'provider_bound', { status: 'ok', userId, provider });
    json(res, 200, { ok: true, data: buildAuthUser(nextUser) });
    return true;
  }

  if (req.method === 'POST' && url.pathname === '/api/auth/unbind/provider') {
    const userId = requireUserId(req, res);
    if (!userId) {
      return true;
    }

    const body = await readBody(req);
    const provider = normalizeProvider(body.provider);
    const currentUser = await getUserById(userId);

    if (!currentUser) {
      json(res, 404, { ok: false, error: '用户不存在。' });
      return true;
    }

    if (!provider) {
      json(res, 400, { ok: false, error: '缺少解绑平台。' });
      return true;
    }

    if (!currentUser.phone && provider === 'wechat' && !currentUser.qqOpenId) {
      json(res, 400, { ok: false, error: '请至少保留一种登录方式。' });
      return true;
    }

    if (!currentUser.phone && provider === 'qq' && !currentUser.wechatOpenId) {
      json(res, 400, { ok: false, error: '请至少保留一种登录方式。' });
      return true;
    }

    const nextUser = await saveUser({
      ...currentUser,
      wechatOpenId: provider === 'wechat' ? '' : currentUser.wechatOpenId,
      qqOpenId: provider === 'qq' ? '' : currentUser.qqOpenId,
      updatedAt: new Date().toISOString(),
    });

    auditLog(req, 'provider_unbound', { status: 'ok', userId, provider });
    json(res, 200, { ok: true, data: buildAuthUser(nextUser) });
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
        name: user.name,
        phone: user.phone,
        email: user.email,
        status: user.status,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
        bindings: {
          wechat: Boolean(user.wechatOpenId),
          qq: Boolean(user.qqOpenId),
        },
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
        '/api/auth/register-code/send',
        '/api/auth/register-by-code',
        '/api/auth/login',
        '/api/auth/provider-login',
        '/api/auth/me',
        '/api/backup/push',
        '/api/backup/pull',
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
