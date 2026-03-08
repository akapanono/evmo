import { createServer } from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import OpenAI from 'openai';

const PORT = Number(process.env.AI_PROXY_PORT || 8787);
const PROFILE_PATH = process.env.AI_PROXY_PROFILES_PATH || join(process.cwd(), 'server', 'relay-profiles.json');

function loadProfiles() {
  if (!existsSync(PROFILE_PATH)) return {};
  try {
    return JSON.parse(readFileSync(PROFILE_PATH, 'utf8'));
  } catch {
    return {};
  }
}

function normalizeBaseUrl(baseUrl) {
  const trimmed = typeof baseUrl === 'string' ? baseUrl.trim() : '';
  return trimmed ? trimmed.replace(/\/+$/, '') : undefined;
}

function json(res, status, payload) {
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  });
  res.end(JSON.stringify(payload));
}

function getProfile(providerId) {
  const profiles = loadProfiles();
  const profile = providerId ? profiles[providerId] : undefined;
  if (profile) return profile;

  const fallback = profiles.default || profiles.openai;
  if (!fallback) {
    throw new Error('未找到可用的代理配置，也没有提供前端运行时配置。');
  }
  return fallback;
}

function createClient(providerId, requestedModel, runtimeProvider) {
  const hasRuntimeConfig = Boolean(runtimeProvider?.apiKey && runtimeProvider?.baseUrl);

  if (providerId) {
    const profile = getProfile(providerId);
    const apiKey = profile.apiKey || (profile.apiKeyEnv ? process.env[profile.apiKeyEnv] : undefined);
    if (!apiKey) throw new Error(`配置 ${providerId} 缺少 API Key。`);

    return {
      client: new OpenAI({ apiKey, baseURL: normalizeBaseUrl(profile.baseUrl) }),
      model: requestedModel || profile.defaultModel,
      label: profile.name || providerId,
    };
  }

  if (hasRuntimeConfig) {
    return {
      client: new OpenAI({
        apiKey: runtimeProvider.apiKey,
        baseURL: normalizeBaseUrl(runtimeProvider.baseUrl),
      }),
      model: requestedModel || runtimeProvider.model,
      label: 'runtime-provider',
    };
  }

  const profile = getProfile(undefined);
  const apiKey = profile.apiKey || (profile.apiKeyEnv ? process.env[profile.apiKeyEnv] : undefined);
  if (!apiKey) throw new Error('默认代理配置缺少 API Key。');

  return {
    client: new OpenAI({ apiKey, baseURL: normalizeBaseUrl(profile.baseUrl) }),
    model: requestedModel || profile.defaultModel,
    label: profile.name || 'default',
  };
}

async function readBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const raw = Buffer.concat(chunks).toString('utf8');
  return raw ? JSON.parse(raw) : {};
}

const server = createServer(async (req, res) => {
  if (req.method === 'OPTIONS') {
    json(res, 204, {});
    return;
  }

  if (req.method !== 'POST') {
    json(res, 404, { ok: false, error: 'Not found' });
    return;
  }

  try {
    const body = await readBody(req);
    const providerId = typeof body.providerId === 'string' && body.providerId.trim() ? body.providerId.trim() : undefined;
    const runtimeProvider = typeof body.runtimeProvider === 'object' ? body.runtimeProvider : undefined;

    if (req.url === '/api/ai/test') {
      const { client, model, label } = createClient(providerId, body.model, runtimeProvider);
      const completion = await client.chat.completions.create({
        model,
        messages: [{ role: 'user', content: '你好' }],
        max_tokens: 10,
      });

      if (!completion.choices[0]?.message?.content) {
        throw new Error('模型没有返回内容。');
      }

      json(res, 200, { ok: true, data: { message: `代理连接成功：${label} / ${model}` } });
      return;
    }

    if (req.url === '/api/ai/chat') {
      const { client, model } = createClient(providerId, body.model, runtimeProvider);
      const completion = await client.chat.completions.create({
        model,
        messages: Array.isArray(body.messages) ? body.messages : [],
        temperature: typeof body.temperature === 'number' ? body.temperature : 0.7,
        max_tokens: typeof body.max_tokens === 'number' ? body.max_tokens : 1000,
      });

      const content = completion.choices[0]?.message?.content;
      if (!content) throw new Error('模型没有返回内容。');

      json(res, 200, { ok: true, data: { content } });
      return;
    }

    json(res, 404, { ok: false, error: 'Not found' });
  } catch (error) {
    json(res, 500, { ok: false, error: error instanceof Error ? error.message : '代理服务错误。' });
  }
});

server.listen(PORT, () => {
  console.log(`AI proxy listening on http://localhost:${PORT}`);
});
