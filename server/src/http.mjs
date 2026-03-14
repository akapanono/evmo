import { createReadStream, existsSync } from 'node:fs';
import { extname, join, normalize } from 'node:path';
import { config } from './config.mjs';

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
};

function getCorsOrigin(origin) {
  if (!origin) {
    return null;
  }

  return config.security.corsAllowedOrigins.includes(origin) ? origin : null;
}

export function applyCorsHeaders(req, res) {
  const requestOrigin = typeof req.headers.origin === 'string' ? req.headers.origin : '';
  const allowOrigin = getCorsOrigin(requestOrigin);

  if (requestOrigin && !allowOrigin) {
    return false;
  }

  if (allowOrigin) {
    res.setHeader('Access-Control-Allow-Origin', allowOrigin);
    res.setHeader('Vary', 'Origin');
  }

  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  return true;
}

export function json(res, status, payload) {
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
  });
  res.end(JSON.stringify(payload));
}

export function noContent(res) {
  res.writeHead(204);
  res.end();
}

export async function readBody(req) {
  const chunks = [];
  let totalSize = 0;

  for await (const chunk of req) {
    totalSize += chunk.length;
    if (totalSize > config.security.bodyLimitBytes) {
      throw new Error(`Request body too large. Limit is ${config.security.bodyLimitBytes} bytes.`);
    }
    chunks.push(chunk);
  }
  const raw = Buffer.concat(chunks).toString('utf8');
  return raw ? JSON.parse(raw) : {};
}

export function getBearerToken(req) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return '';
  }
  return header.slice('Bearer '.length).trim();
}

export function serveStaticFile(res, rootDir, relativePath) {
  const cleanPath = normalize(relativePath).replace(/^(\.\.[/\\])+/, '');
  const path = join(rootDir, cleanPath);
  if (!existsSync(path)) {
    return false;
  }

  const ext = extname(path).toLowerCase();
  res.writeHead(200, {
    'Content-Type': MIME_TYPES[ext] ?? 'application/octet-stream',
  });
  createReadStream(path).pipe(res);
  return true;
}
