import express from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createStore } from './db.js';
import { createApiRouter } from './api.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, '..');

function loadLocalEnv() {
  if (typeof process.loadEnvFile !== 'function') return;
  for (const filename of ['.env.local', '.env']) {
    const filePath = path.join(ROOT_DIR, filename);
    if (fs.existsSync(filePath)) {
      try {
        process.loadEnvFile(filePath);
      } catch {
        // Ignore malformed env file
      }
    }
  }
}

export async function createApp({ dbPath, isProd = process.env.NODE_ENV === 'production' } = {}) {
  const app = express();
  const store = createStore({ dbPath });

  app.use('/api', createApiRouter(store));

  let vite = null;
  if (isProd) {
    const distDir = path.join(ROOT_DIR, 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  } else {
    const { createServer } = await import('vite');
    vite = await createServer({
      root: ROOT_DIR,
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  return { app, store, vite };
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  loadLocalEnv();
  const port = Number(process.env.PORT) || 5173;
  const { app, store, vite } = await createApp();
  const server = app.listen(port, '0.0.0.0', () => {
    console.log(`今天吃什么？服务已启动: http://localhost:${port} (${store.driver})`);
  });

  const shutdown = async () => {
    server.close();
    if (vite) await vite.close();
    await store.close();
    process.exit(0);
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}
