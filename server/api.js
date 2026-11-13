import express from 'express';
import {
  ValidationError,
  extractClientIp,
  resolveSigningKey,
  signAuthToken,
  verifyAntiBotRequest,
  verifyAuthToken,
} from './security.js';

export function createApiRouter(store, { secretKey = resolveSigningKey() } = {}) {
  const router = express.Router();
  router.use(express.json({ limit: '64kb' }));

  const asyncHandler = (fn) => (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };

  // Require custom client header and matching Origin on all mutating requests
  router.use((req, _res, next) => {
    if (req.method === 'POST' || req.method === 'PUT' || req.method === 'PATCH' || req.method === 'DELETE') {
      try {
        verifyAntiBotRequest(req);
      } catch (err) {
        return next(err);
      }
    }
    return next();
  });

  const requireUserAuth = asyncHandler(async (req, _res, next) => {
    const authHeader = req.headers.authorization || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
    const authRecord = await store.getUserAuthRecord(req.params.username);
    if (!authRecord) {
      throw new ValidationError('用户不存在', 404);
    }
    if (
      !authRecord.pinHash ||
      !verifyAuthToken(token, authRecord.username, authRecord.pinHash, secretKey)
    ) {
      throw new ValidationError('登录状态已过期，请输入 4 位 PIN 码解锁', 401);
    }

    if (req.method !== 'GET' && req.method !== 'HEAD') {
      await store.consumeRateLimit(
        `write:ip:${extractClientIp(req)}`,
        45,
        60_000,
        '保存操作过于频繁'
      );
    }
    next();
  });

  router.get('/health', (_req, res) => {
    res.json({ ok: true, storage: store.driver || 'sqlite' });
  });

  router.get(
    '/auth/status',
    asyncHandler(async (req, res) => {
      await store.consumeRateLimit(
        `status:ip:${extractClientIp(req)}`,
        40,
        60_000,
        '查询过于频繁'
      );
      const data = await store.getUserAuthStatus(String(req.query.username || ''));
      res.json(data);
    })
  );

  router.post(
    '/auth/login',
    asyncHandler(async (req, res) => {
      verifyAntiBotRequest(req, { checkHoneypot: true });
      const ip = extractClientIp(req);
      await store.consumeRateLimit(
        `login_req:ip:${ip}`,
        25,
        10 * 60_000,
        '登录请求过于频繁'
      );
      const { username, pin, importMenu } = req.body ?? {};
      const { pinHash, ...publicData } = await store.loginOrCreateUser(
        username,
        pin,
        importMenu ?? null,
        { clientIp: ip }
      );
      const token = signAuthToken({ username: publicData.user.username, pinHash }, secretKey);
      res.json({ ...publicData, token });
    })
  );

  router.post(
    '/users/:username/pin',
    asyncHandler(async (req, res) => {
      verifyAntiBotRequest(req, { checkHoneypot: true });
      const ip = extractClientIp(req);
      await store.consumeRateLimit(
        `pin_chg:ip:${ip}`,
        10,
        10 * 60_000,
        '修改 PIN 码请求过于频繁'
      );
      const { currentPin, newPin } = req.body ?? {};
      const result = await store.changeUserPin(req.params.username, currentPin, newPin, {
        clientIp: ip,
      });
      const token = signAuthToken({ username: result.username, pinHash: result.pinHash }, secretKey);
      res.json({ ok: true, username: result.username, token });
    })
  );

  router.get(
    '/users/:username/bootstrap',
    requireUserAuth,
    asyncHandler(async (req, res) => {
      const data = await store.getUserBootstrap(req.params.username);
      res.json(data);
    })
  );

  router.post(
    '/users/:username/menus',
    requireUserAuth,
    asyncHandler(async (req, res) => {
      const { name, items } = req.body ?? {};
      const data = await store.createMenu(req.params.username, name, items ?? null);
      res.status(201).json(data);
    })
  );

  router.patch(
    '/users/:username/menus/:menuId',
    requireUserAuth,
    asyncHandler(async (req, res) => {
      const { name, setActive } = req.body ?? {};
      const data = await store.updateMenuMeta(req.params.username, req.params.menuId, {
        name,
        setActive: Boolean(setActive),
      });
      res.json(data);
    })
  );

  router.put(
    '/users/:username/menus/:menuId/items',
    requireUserAuth,
    asyncHandler(async (req, res) => {
      const { items } = req.body ?? {};
      const data = await store.replaceMenuItems(req.params.username, req.params.menuId, items);
      res.json(data);
    })
  );

  router.delete(
    '/users/:username/menus/:menuId',
    requireUserAuth,
    asyncHandler(async (req, res) => {
      const data = await store.deleteMenu(req.params.username, req.params.menuId);
      res.json(data);
    })
  );

  router.post(
    '/users/:username/history',
    requireUserAuth,
    asyncHandler(async (req, res) => {
      const history = await store.addHistory(req.params.username, req.body ?? {});
      res.status(201).json({ history });
    })
  );

  router.delete(
    '/users/:username/history',
    requireUserAuth,
    asyncHandler(async (req, res) => {
      const history = await store.clearHistory(req.params.username);
      res.json({ history });
    })
  );

  router.post(
    '/shares',
    asyncHandler(async (req, res) => {
      verifyAntiBotRequest(req, { checkHoneypot: true });
      await store.consumeRateLimit(
        `share_create:ip:${extractClientIp(req)}`,
        10,
        10 * 60_000,
        '生成分享链接过于频繁'
      );
      const { creatorName, menuName, items } = req.body ?? {};
      const share = await store.createShare(creatorName, menuName, items);
      res.status(201).json(share);
    })
  );

  router.get(
    '/shares/:shareCode',
    asyncHandler(async (req, res) => {
      await store.consumeRateLimit(
        `share_read:ip:${extractClientIp(req)}`,
        60,
        60_000,
        '读取分享链接过于频繁'
      );
      const share = await store.getShare(req.params.shareCode);
      res.json(share);
    })
  );

  router.use((err, _req, res, _next) => {
    if (err instanceof ValidationError) {
      return res.status(err.status).json({ error: err.message });
    }
    if (err?.type === 'entity.parse.failed') {
      return res.status(400).json({ error: '请求参数格式错误' });
    }
    if (err?.type === 'entity.too.large') {
      return res.status(413).json({ error: '提交内容体积过大' });
    }
    console.error('[API Error]', err);
    return res.status(500).json({ error: '服务器开小差了，请稍后重试' });
  });

  return router;
}
