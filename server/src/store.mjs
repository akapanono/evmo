import { database } from './database/index.mjs';
import crypto from 'node:crypto';
import { createFriendRepository } from './repositories/friend-repository.mjs';
import { createMemorialRepository } from './repositories/memorial-repository.mjs';
import { createProductRepository } from './repositories/product-repository.mjs';
import { createSystemConfigRepository } from './repositories/system-config-repository.mjs';
import { createUserRepository } from './repositories/user-repository.mjs';
import { SAMPLE_PRODUCTS } from './sample-products.mjs';
import { deriveProductMetadata } from './product-metadata.mjs';

database.runMigrations();

const productFallback = [];
const systemFallback = {
  aiProvider: {
    baseUrl: '',
    apiKey: '',
    model: '',
  },
  recommendation: {
    enabled: true,
    topScoreLimit: 6,
    previewGiftLimit: 3,
  },
  updatedAt: new Date().toISOString(),
};

const productRepository = createProductRepository(database);
const friendRepository = createFriendRepository(database);
const memorialRepository = createMemorialRepository(database);
const systemConfigRepository = createSystemConfigRepository(database, systemFallback);
const userRepository = createUserRepository(database);
let defaultProductsEnsured = false;

function buildSeedProducts() {
  const now = new Date().toISOString();
  return SAMPLE_PRODUCTS.map((item) => {
    const derived = deriveProductMetadata(item);
    return {
      ...item,
      attributes: derived.attributes,
      tags: derived.tags,
      matchDimensions: derived.matchDimensions,
      targetRelationships: derived.targetRelationships,
      giftScenes: derived.giftScenes,
      recipientStyles: derived.recipientStyles,
      riskLevel: derived.riskLevel,
      createdAt: now,
      updatedAt: now,
    };
  });
}

async function ensureDefaultProducts() {
  if (defaultProductsEnsured) {
    return;
  }
  defaultProductsEnsured = true;
  const current = await productRepository.list();
  const seedProducts = buildSeedProducts();
  if (current.length === 0) {
    await productRepository.saveAll(seedProducts);
    return;
  }

  const existingIds = new Set(current.map((item) => item.id));
  const missingSeedProducts = seedProducts.filter((item) => !existingIds.has(item.id));
  if (missingSeedProducts.length > 0) {
    await productRepository.upsertMany(missingSeedProducts);
  }
}

void ensureDefaultProducts();

export async function getProducts() {
  await ensureDefaultProducts();
  return productRepository.list();
}

export async function getFriends() {
  return friendRepository.list();
}

export async function getFriendById(id) {
  return friendRepository.getById(id);
}

export async function getFriendsByUserId(userId) {
  return friendRepository.listByUserId(userId);
}

export async function saveFriend(friend) {
  return friendRepository.save({
    ...friend,
    id: friend?.id || crypto.randomUUID(),
  });
}

export async function deleteFriend(id) {
  return friendRepository.remove(id);
}

export async function saveProducts(products) {
  defaultProductsEnsured = true;
  return productRepository.saveAll(products);
}

export async function getSystemConfig() {
  return systemConfigRepository.getAppConfig();
}

export async function saveSystemConfig(nextConfig) {
  return systemConfigRepository.saveAppConfig(nextConfig);
}

export async function getUserById(id) {
  return userRepository.getById(id);
}

export async function getUserByUsername(username) {
  return userRepository.getByUsername(username);
}

export async function saveUser(user) {
  return userRepository.save(user);
}

export async function getUsers() {
  return userRepository.list();
}

export async function getUserSettings(userId, fallbackSettings = {}) {
  return systemConfigRepository.getUserSettings(userId, fallbackSettings);
}

export async function saveUserSettings(userId, settings) {
  return systemConfigRepository.saveUserSettings(userId, settings);
}

export async function getMemorialDays() {
  return memorialRepository.list();
}

export async function getMemorialDayById(id) {
  return memorialRepository.getById(id);
}

export async function getMemorialDaysByUserId(userId) {
  return memorialRepository.listByUserId(userId);
}

export async function saveMemorialDay(memorialDay) {
  return memorialRepository.save({
    ...memorialDay,
    id: memorialDay?.id || crypto.randomUUID(),
  });
}

export async function deleteMemorialDay(id) {
  return memorialRepository.remove(id);
}

export async function replaceUserBackup(userId, payload) {
  await friendRepository.replaceAllForUser(userId, Array.isArray(payload?.friends) ? payload.friends : []);
  await memorialRepository.replaceAllForUser(userId, Array.isArray(payload?.memorialDays) ? payload.memorialDays : []);
  await systemConfigRepository.saveUserSettings(userId, payload?.settings ?? {});
}

export async function getUserBackup(userId) {
  return {
    friends: await friendRepository.listByUserId(userId),
    memorialDays: await memorialRepository.listByUserId(userId),
    settings: await systemConfigRepository.getUserSettings(userId, {}),
  };
}

export async function getAdminUserDetail(userId) {
  const user = await userRepository.getById(userId);
  if (!user) {
    return undefined;
  }

  const backup = await getUserBackup(userId);
  return {
    user: {
      id: user.id,
      username: user.username,
      name: user.name,
      email: user.email,
      status: user.status,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    },
    friends: backup.friends,
    memorialDays: backup.memorialDays,
    settings: backup.settings,
  };
}
