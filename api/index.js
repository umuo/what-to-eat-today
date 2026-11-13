import express from 'express';
import { createStore } from '../server/db.js';
import { createApiRouter } from '../server/api.js';

const store = createStore();
const apiRouter = createApiRouter(store);

const app = express();

app.use((req, _res, next) => {
  try {
    const parsed = new URL(req.url || '/', 'http://localhost');
    const subPath = parsed.searchParams.get('__path');
    if (
      subPath !== null &&
      (parsed.pathname === '/api' || parsed.pathname === '/api/index' || parsed.pathname === '/')
    ) {
      parsed.searchParams.delete('__path');
      const cleanSub = subPath
        .replace(/^\/+/, '')
        .split('/')
        .filter(Boolean)
        .map((seg) => {
          try {
            return encodeURIComponent(decodeURIComponent(seg));
          } catch {
            return encodeURIComponent(seg);
          }
        })
        .join('/');
      const qs = parsed.searchParams.toString();
      req.url = `/api/${cleanSub}${qs ? `?${qs}` : ''}`;
    }
  } catch {
    // keep original req.url on parse failure
  }
  next();
});

app.use('/api', apiRouter);
app.use('/', apiRouter);

export default app;
