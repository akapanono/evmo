import { config } from './config.mjs';

function getProvider(systemConfig = null) {
  const storedProvider = systemConfig?.aiProvider ?? {};
  const baseUrl = String(storedProvider.baseUrl || config.ai.baseUrl || '').trim().replace(/\/+$/, '');
  const apiKey = String(storedProvider.apiKey || config.ai.apiKey || '').trim();
  const model = String(storedProvider.model || config.ai.model || '').trim();

  if (!baseUrl || !apiKey || !model) {
    throw new Error('AI 服务未配置，请先在 server/.env 中填写 AI_BASE_URL、AI_API_KEY、AI_MODEL');
  }

  return { baseUrl, apiKey, model };
}

async function parseJson(response) {
  const text = await response.text();
  if (!text) {
    return {};
  }

  try {
    return JSON.parse(text);
  } catch {
    return { message: text };
  }
}

function buildPayload(systemConfig, body, stream = false) {
  const provider = getProvider(systemConfig);
  return {
    provider,
    payload: {
      model: body.model || provider.model,
      messages: Array.isArray(body.messages) ? body.messages : [],
      temperature: typeof body.temperature === 'number' ? body.temperature : 0.7,
      max_tokens: typeof body.max_tokens === 'number' ? body.max_tokens : 600,
      stream,
    },
  };
}

export async function testChatConnection({ systemConfig = null, body = {} } = {}) {
  const { provider, payload } = buildPayload(
    systemConfig,
    {
      ...body,
      messages: [
        {
          role: 'user',
          content: '请只回复：连接成功',
        },
      ],
      temperature: 0,
      max_tokens: 32,
    },
    false,
  );

  const response = await fetch(`${provider.baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${provider.apiKey}`,
    },
    body: JSON.stringify(payload),
  });

  const parsed = await parseJson(response);
  if (!response.ok) {
    throw new Error(parsed?.error?.message || parsed?.message || 'AI 连接测试失败');
  }

  const content = parsed?.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error('AI 返回为空，无法确认连接是否可用');
  }

  return {
    message: '连接成功',
    reply: String(content),
  };
}

export async function forwardChat({ systemConfig = null, body }) {
  const { provider, payload } = buildPayload(systemConfig, body, false);
  const response = await fetch(`${provider.baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${provider.apiKey}`,
    },
    body: JSON.stringify(payload),
  });

  const parsed = await parseJson(response);
  if (!response.ok) {
    throw new Error(parsed?.error?.message || parsed?.message || 'AI 转发失败');
  }

  const content = parsed?.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error('AI 返回为空');
  }

  return { content: String(content) };
}

export async function forwardChatStream({ systemConfig = null, body, res }) {
  const { provider, payload } = buildPayload(systemConfig, body, true);
  const response = await fetch(`${provider.baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${provider.apiKey}`,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok || !response.body) {
    const parsed = await parseJson(response);
    throw new Error(parsed?.error?.message || parsed?.message || 'AI 流式转发失败');
  }

  res.writeHead(200, {
    'Content-Type': 'text/event-stream; charset=utf-8',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
    'Access-Control-Allow-Origin': '*',
  });

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { value, done } = await reader.read();
    if (done) {
      break;
    }

    buffer += decoder.decode(value, { stream: true });
    const events = buffer.split('\n\n');
    buffer = events.pop() ?? '';

    for (const eventText of events) {
      const line = eventText
        .split('\n')
        .map((item) => item.trim())
        .find((item) => item.startsWith('data:'));

      if (!line) {
        continue;
      }

      const data = line.slice(5).trim();
      if (!data || data === '[DONE]') {
        continue;
      }

      let parsed;
      try {
        parsed = JSON.parse(data);
      } catch {
        continue;
      }

      const delta = parsed?.choices?.[0]?.delta?.content;
      if (!delta) {
        continue;
      }

      res.write(`data: ${JSON.stringify({ content: String(delta) })}\n\n`);
    }
  }

  res.write('data: [DONE]\n\n');
  res.end();
}
