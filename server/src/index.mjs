import { createServer } from 'node:http';
import crypto from 'node:crypto';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { config } from './config.mjs';
import {
  createAdminToken,
  createUserToken,
  checkAdminPassword,
  hashPassword,
  verifyAdminToken,
  verifyPassword,
  verifyUserToken,
} from './auth.mjs';
import { getBearerToken, json, noContent, readBody, serveStaticFile } from './http.mjs';
import {
  deleteFriend,
  deleteMemorialDay,
  getFriendById,
  getFriends,
  getMemorialDayById,
  getMemorialDays,
  getProducts,
  getSystemConfig,
  getUsers,
  getAdminUserDetail,
  getUserBackup,
  getUserById,
  getUserByPhone,
  replaceUserBackup,
  saveUser,
  saveFriend,
  saveMemorialDay,
  saveProducts,
  saveSystemConfig,
} from './store.mjs';
import { forwardChat, forwardChatStream, testChatConnection } from './ai-proxy.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const adminDir = join(__dirname, '..', '..', 'admin');

function getUserIdFromRequest(req) {
  return verifyUserToken(getBearerToken(req));
}

const server = createServer(async (req, res) => {
  if (req.method === 'OPTIONS') {
    noContent(res);
    return;
  }

  try {
    const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);

    if (req.method === 'GET' && url.pathname === '/api/health') {
      json(res, 200, { ok: true, data: { status: 'ok', time: new Date().toISOString() } });
      return;
    }

    if (req.method === 'POST' && url.pathname === '/api/admin/login') {
      const body = await readBody(req);
      if (!checkAdminPassword(body.username, body.password)) {
        json(res, 401, { ok: false, error: '账号或密码错误。' });
        return;
      }

      json(res, 200, {
        ok: true,
        data: {
          token: createAdminToken(),
          username: config.admin.username,
        },
      });
      return;
    }

    if (req.method === 'POST' && url.pathname === '/api/auth/register') {
      const body = await readBody(req);
      const phone = String(body.phone || '').trim();
      const password = String(body.password || '').trim();
      const name = String(body.name || '').trim();

      if (!phone || !password) {
        json(res, 400, { ok: false, error: '手机号和密码不能为空。' });
        return;
      }

      const existing = await getUserByPhone(phone);
      if (existing) {
        json(res, 409, { ok: false, error: '该手机号已注册。' });
        return;
      }

      const user = await saveUser({
        id: crypto.randomUUID(),
        name: name || `用户${phone.slice(-4)}`,
        phone,
        email: '',
        status: 'active',
        passwordHash: hashPassword(password),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      json(res, 201, {
        ok: true,
        data: {
          token: createUserToken(user.id),
          user: {
            id: user.id,
            name: user.name,
            phone: user.phone,
          },
        },
      });
      return;
    }

    if (req.method === 'POST' && url.pathname === '/api/auth/login') {
      const body = await readBody(req);
      const phone = String(body.phone || '').trim();
      const password = String(body.password || '').trim();
      const user = await getUserByPhone(phone);

      if (!user || !verifyPassword(password, user.passwordHash)) {
        json(res, 401, { ok: false, error: '手机号或密码错误。' });
        return;
      }

      json(res, 200, {
        ok: true,
        data: {
          token: createUserToken(user.id),
          user: {
            id: user.id,
            name: user.name,
            phone: user.phone,
          },
        },
      });
      return;
    }

    if (req.method === 'GET' && url.pathname === '/api/auth/me') {
      const userId = getUserIdFromRequest(req);
      if (!userId) {
        json(res, 401, { ok: false, error: '未登录或登录已失效。' });
        return;
      }

      const user = await getUserById(userId);
      if (!user) {
        json(res, 404, { ok: false, error: '用户不存在。' });
        return;
      }

      json(res, 200, {
        ok: true,
        data: {
          id: user.id,
          name: user.name,
          phone: user.phone,
        },
      });
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
        '/api/auth/me',
        '/api/backup/push',
        '/api/backup/pull',
      ]);
      const adminProtectedPrefixes = ['/api/products', '/api/system/config', '/api/friends', '/api/memorial-days'];
      const requiresAdmin = adminProtectedPrefixes.some((prefix) => url.pathname.startsWith(prefix));
      if (requiresAdmin && !verifyAdminToken(getBearerToken(req))) {
        json(res, 401, { ok: false, error: '未登录或登录已失效。' });
        return;
      }
    }

    if (req.method === 'GET' && url.pathname === '/api/products') {
      json(res, 200, { ok: true, data: await getProducts() });
      return;
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
          friendCount: backup.friends.length,
          memorialDayCount: backup.memorialDays.length,
        };
      }));
      json(res, 200, { ok: true, data: enriched });
      return;
    }

    if (req.method === 'GET' && url.pathname.startsWith('/api/admin/users/')) {
      const userId = url.pathname.slice('/api/admin/users/'.length);
      const detail = await getAdminUserDetail(userId);
      if (!detail) {
        json(res, 404, { ok: false, error: 'User not found' });
        return;
      }

      json(res, 200, { ok: true, data: detail });
      return;
    }

    if (req.method === 'POST' && url.pathname === '/api/backup/push') {
      const userId = getUserIdFromRequest(req);
      if (!userId) {
        json(res, 401, { ok: false, error: '未登录或登录已失效。' });
        return;
      }

      const body = await readBody(req);
      await replaceUserBackup(userId, body);

      json(res, 200, {
        ok: true,
        data: {
          savedAt: new Date().toISOString(),
        },
      });
      return;
    }

    if (req.method === 'GET' && url.pathname === '/api/backup/pull') {
      const userId = getUserIdFromRequest(req);
      if (!userId) {
        json(res, 401, { ok: false, error: '未登录或登录已失效。' });
        return;
      }

      const backup = await getUserBackup(userId);
      json(res, 200, {
        ok: true,
        data: {
          ...backup,
          restoredAt: new Date().toISOString(),
        },
      });
      return;
    }

    if (req.method === 'GET' && url.pathname === '/api/friends') {
      json(res, 200, { ok: true, data: await getFriends() });
      return;
    }

    if (req.method === 'GET' && url.pathname.startsWith('/api/friends/')) {
      const friendId = url.pathname.slice('/api/friends/'.length);
      const friend = await getFriendById(friendId);
      if (!friend) {
        json(res, 404, { ok: false, error: 'Friend not found' });
        return;
      }

      json(res, 200, { ok: true, data: friend });
      return;
    }

    if (req.method === 'POST' && url.pathname === '/api/friends') {
      const body = await readBody(req);
      const nextFriend = await saveFriend(body);
      json(res, 201, { ok: true, data: nextFriend });
      return;
    }

    if (req.method === 'PUT' && url.pathname.startsWith('/api/friends/')) {
      const friendId = url.pathname.slice('/api/friends/'.length);
      const body = await readBody(req);
      const nextFriend = await saveFriend({ ...body, id: friendId });
      json(res, 200, { ok: true, data: nextFriend });
      return;
    }

    if (req.method === 'DELETE' && url.pathname.startsWith('/api/friends/')) {
      const friendId = url.pathname.slice('/api/friends/'.length);
      await deleteFriend(friendId);
      json(res, 200, { ok: true, data: { id: friendId } });
      return;
    }

    if (req.method === 'GET' && url.pathname === '/api/memorial-days') {
      json(res, 200, { ok: true, data: await getMemorialDays() });
      return;
    }

    if (req.method === 'GET' && url.pathname.startsWith('/api/memorial-days/')) {
      const memorialDayId = url.pathname.slice('/api/memorial-days/'.length);
      const memorialDay = await getMemorialDayById(memorialDayId);
      if (!memorialDay) {
        json(res, 404, { ok: false, error: 'Memorial day not found' });
        return;
      }

      json(res, 200, { ok: true, data: memorialDay });
      return;
    }

    if (req.method === 'POST' && url.pathname === '/api/memorial-days') {
      const body = await readBody(req);
      const nextMemorialDay = await saveMemorialDay(body);
      json(res, 201, { ok: true, data: nextMemorialDay });
      return;
    }

    if (req.method === 'PUT' && url.pathname.startsWith('/api/memorial-days/')) {
      const memorialDayId = url.pathname.slice('/api/memorial-days/'.length);
      const body = await readBody(req);
      const nextMemorialDay = await saveMemorialDay({ ...body, id: memorialDayId });
      json(res, 200, { ok: true, data: nextMemorialDay });
      return;
    }

    if (req.method === 'DELETE' && url.pathname.startsWith('/api/memorial-days/')) {
      const memorialDayId = url.pathname.slice('/api/memorial-days/'.length);
      await deleteMemorialDay(memorialDayId);
      json(res, 200, { ok: true, data: { id: memorialDayId } });
      return;
    }

    if (req.method === 'GET' && url.pathname === '/api/system/config') {
      json(res, 200, { ok: true, data: await getSystemConfig() });
      return;
    }

    if (req.method === 'PUT' && url.pathname === '/api/system/config') {
      const body = await readBody(req);
      json(res, 200, { ok: true, data: await saveSystemConfig(body) });
      return;
    }

    if (req.method === 'POST' && url.pathname === '/api/products') {
      const body = await readBody(req);
      const products = await getProducts();
      const now = new Date().toISOString();
      const nextProduct = {
        id: body.id?.trim() || crypto.randomUUID(),
        title: body.title?.trim() || '',
        category: body.category?.trim() || 'other',
        status: body.status?.trim() || 'draft',
        priceBucket: body.priceBucket?.trim() || '100to300',
        priceLabel: body.priceLabel?.trim() || '',
        tags: Array.isArray(body.tags) ? body.tags.filter(Boolean) : [],
        matchDimensions: Array.isArray(body.matchDimensions) ? body.matchDimensions.filter(Boolean) : [],
        targetRelationships: Array.isArray(body.targetRelationships) ? body.targetRelationships.filter(Boolean) : [],
        link: body.link?.trim() || '',
        summary: body.summary?.trim() || '',
        createdAt: now,
        updatedAt: now,
      };
      products.unshift(nextProduct);
      await saveProducts(products);
      json(res, 201, { ok: true, data: nextProduct });
      return;
    }

    if (req.method === 'PUT' && url.pathname.startsWith('/api/products/')) {
      const body = await readBody(req);
      const productId = url.pathname.slice('/api/products/'.length);
      const products = await getProducts();
      const index = products.findIndex((item) => item.id === productId);
      if (index === -1) {
        json(res, 404, { ok: false, error: '商品不存在。' });
        return;
      }

      const current = products[index];
      const next = {
        ...current,
        ...body,
        id: current.id,
        updatedAt: new Date().toISOString(),
      };
      products[index] = next;
      await saveProducts(products);
      json(res, 200, { ok: true, data: next });
      return;
    }

    if (req.method === 'DELETE' && url.pathname.startsWith('/api/products/')) {
      const productId = url.pathname.slice('/api/products/'.length);
      const products = await getProducts();
      await saveProducts(products.filter((item) => item.id !== productId));
      json(res, 200, { ok: true, data: { id: productId } });
      return;
    }

    if (req.method === 'POST' && url.pathname === '/api/ai/test') {
      const body = await readBody(req);
      const systemConfig = await getSystemConfig();
      json(res, 200, { ok: true, data: await testChatConnection({ systemConfig, body }) });
      return;
    }

    if (req.method === 'POST' && url.pathname === '/api/ai/chat') {
      const body = await readBody(req);
      const systemConfig = await getSystemConfig();
      if (body.stream) {
        await forwardChatStream({ systemConfig, body, res });
        return;
      }

      json(res, 200, { ok: true, data: await forwardChat({ systemConfig, body }) });
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
    json(res, 500, { ok: false, error: error instanceof Error ? error.message : '服务异常。' });
  }
});

server.listen(config.port, () => {
  console.log(`EVMO server listening on http://localhost:${config.port}`);
});
