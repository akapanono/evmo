import crypto from 'node:crypto';
import { config } from './config.mjs';

export function createAdminToken() {
  const issuedAt = Date.now();
  const nonce = crypto.randomBytes(12).toString('hex');
  const base = `${config.admin.username}.${issuedAt}.${nonce}`;
  const signature = crypto
    .createHmac('sha256', config.admin.tokenSecret)
    .update(base)
    .digest('hex');
  return Buffer.from(`${base}.${signature}`).toString('base64url');
}

export function verifyAdminToken(token) {
  if (typeof token !== 'string' || !token) {
    return false;
  }

  try {
    const decoded = Buffer.from(token, 'base64url').toString('utf8');
    const [username, issuedAt, nonce, signature] = decoded.split('.');
    if (!username || !issuedAt || !nonce || !signature) {
      return false;
    }

    if (username !== config.admin.username) {
      return false;
    }

    const base = `${username}.${issuedAt}.${nonce}`;
    const expected = crypto
      .createHmac('sha256', config.admin.tokenSecret)
      .update(base)
      .digest('hex');

    return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
  } catch {
    return false;
  }
}

export function checkAdminPassword(username, password) {
  return username === config.admin.username && password === config.admin.password;
}

function createToken(payload) {
  const issuedAt = Date.now();
  const nonce = crypto.randomBytes(12).toString('hex');
  const base = `${payload.type}.${payload.subject}.${issuedAt}.${nonce}`;
  const signature = crypto
    .createHmac('sha256', config.admin.tokenSecret)
    .update(base)
    .digest('hex');
  return Buffer.from(`${base}.${signature}`).toString('base64url');
}

function verifyToken(token) {
  if (typeof token !== 'string' || !token) {
    return null;
  }

  try {
    const decoded = Buffer.from(token, 'base64url').toString('utf8');
    const [type, subject, issuedAt, nonce, signature] = decoded.split('.');
    if (!type || !subject || !issuedAt || !nonce || !signature) {
      return null;
    }

    const base = `${type}.${subject}.${issuedAt}.${nonce}`;
    const expected = crypto
      .createHmac('sha256', config.admin.tokenSecret)
      .update(base)
      .digest('hex');

    if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) {
      return null;
    }

    return { type, subject };
  } catch {
    return null;
  }
}

export function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

export function verifyPassword(password, passwordHash) {
  const [salt, storedHash] = String(passwordHash || '').split(':');
  if (!salt || !storedHash) {
    return false;
  }

  const nextHash = crypto.scryptSync(password, salt, 64).toString('hex');
  return crypto.timingSafeEqual(Buffer.from(storedHash), Buffer.from(nextHash));
}

export function normalizeSecurityAnswer(answer) {
  return String(answer || '').trim().toLowerCase();
}

export function hashSecurityAnswer(answer) {
  return hashPassword(normalizeSecurityAnswer(answer));
}

export function verifySecurityAnswer(answer, answerHash) {
  return verifyPassword(normalizeSecurityAnswer(answer), answerHash);
}

export function createUserToken(userId) {
  return createToken({ type: 'user', subject: userId });
}

export function verifyUserToken(token) {
  const payload = verifyToken(token);
  if (!payload || payload.type !== 'user') {
    return null;
  }

  return payload.subject;
}
