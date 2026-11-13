import crypto from 'node:crypto';
import pg from 'pg';
import * as vercelFunctions from '@vercel/functions';
import {
  DEFAULT_ITEMS,
  DEFAULT_MENU_NAME,
  normalizeUsername,
  sanitizeItems,
} from './db.js';
import {
  LIMITS,
  ValidationError,
  hashPin,
  validatePin,
  verifyPin,
} from './security.js';

const { Pool, Client } = pg;

function normalizePgConnectionString(raw) {
  if (typeof raw !== 'string') return raw;
  const trimmed = raw.trim();
  try {
    const url = new URL(trimmed);
    const sslmode = url.searchParams.get('sslmode');
    if (sslmode === 'require' && !url.searchParams.has('uselibpqcompat')) {
      url.searchParams.set('uselibpqcompat', 'true');
    }
    return url.toString();
  } catch {
    return trimmed;
  }
}

function toIsoString(val) {
  if (val instanceof Date) return val.toISOString();
  return typeof val === 'string' ? val : new Date(val || Date.now()).toISOString();
}

const SCHEMA_SQL = `
  CREATE TABLE IF NOT EXISTS wte_users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(24) NOT NULL,
    username_lower VARCHAR(24) NOT NULL UNIQUE,
    pin_hash VARCHAR(255),
    last_active_menu_id INTEGER,
    last_login_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );

  ALTER TABLE wte_users ADD COLUMN IF NOT EXISTS pin_hash VARCHAR(255);
  ALTER TABLE wte_users ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

  CREATE TABLE IF NOT EXISTS wte_menus (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES wte_users(id) ON DELETE CASCADE,
    name VARCHAR(24) NOT NULL,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );

  CREATE TABLE IF NOT EXISTS wte_menu_items (
    id SERIAL PRIMARY KEY,
    menu_id INTEGER NOT NULL REFERENCES wte_menus(id) ON DELETE CASCADE,
    name VARCHAR(30) NOT NULL,
    icon_key VARCHAR(32) NOT NULL,
    weight INTEGER NOT NULL DEFAULT 1,
    sort_order INTEGER NOT NULL DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS wte_draw_history (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES wte_users(id) ON DELETE CASCADE,
    menu_name VARCHAR(24) NOT NULL,
    item_name VARCHAR(30) NOT NULL,
    icon_key VARCHAR(32) NOT NULL,
    mode VARCHAR(20) NOT NULL,
    status VARCHAR(16) NOT NULL DEFAULT 'picked',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );

  CREATE TABLE IF NOT EXISTS wte_shared_menus (
    share_code VARCHAR(32) PRIMARY KEY,
    creator_name VARCHAR(24) NOT NULL,
    menu_name VARCHAR(24) NOT NULL,
    items_json TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );

  CREATE TABLE IF NOT EXISTS wte_rate_limits (
    bucket_key VARCHAR(160) PRIMARY KEY,
    hit_count INTEGER NOT NULL DEFAULT 0,
    reset_at BIGINT NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_wte_menus_user ON wte_menus(user_id, sort_order, id);
  CREATE INDEX IF NOT EXISTS idx_wte_items_menu ON wte_menu_items(menu_id, sort_order, id);
  CREATE INDEX IF NOT EXISTS idx_wte_history_user ON wte_draw_history(user_id, id DESC);
  CREATE INDEX IF NOT EXISTS idx_wte_rate_limits_reset ON wte_rate_limits(reset_at);
  CREATE INDEX IF NOT EXISTS idx_wte_shares_created ON wte_shared_menus(created_at DESC);
`;

export function createPostgresStore(connectionString, { directConnectionString } = {}) {
  const pooledConn = normalizePgConnectionString(connectionString);
  const directConn = directConnectionString
    ? normalizePgConnectionString(directConnectionString)
    : null;

  const pool = new Pool({
    connectionString: pooledConn,
    max: 5,
    idleTimeoutMillis: 15000,
    connectionTimeoutMillis: 10000,
  });

  if (typeof vercelFunctions.attachDatabasePool === 'function') {
    vercelFunctions.attachDatabasePool(pool);
  }

  let schemaPromise = null;

  async function ensureSchema() {
    if (!schemaPromise) {
      schemaPromise = (async () => {
        if (directConn && directConn !== pooledConn) {
          const directClient = new Client({
            connectionString: directConn,
            connectionTimeoutMillis: 10000,
          });
          try {
            await directClient.connect();
            await directClient.query(SCHEMA_SQL);
            return;
          } catch {
            // Fallback to pooled connection if direct host is unreachable
          } finally {
            await directClient.end().catch(() => {});
          }
        }
        await pool.query(SCHEMA_SQL);
      })().catch((err) => {
        schemaPromise = null;
        throw err;
      });
    }
    return schemaPromise;
  }

  async function withTransaction(fn) {
    await ensureSchema();
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const result = await fn(client);
      await client.query('COMMIT');
      return result;
    } catch (err) {
      try {
        await client.query('ROLLBACK');
      } catch {
        // ignore rollback error
      }
      throw err;
    } finally {
      client.release();
    }
  }

  async function incrementRateBucket(bucketKey, windowMs) {
    await ensureSchema();
    const now = Date.now();
    if (Math.random() < 0.05) {
      await pool.query('DELETE FROM wte_rate_limits WHERE reset_at <= $1', [now]).catch(() => {});
    }
    const nextReset = now + windowMs;
    const { rows } = await pool.query(
      `INSERT INTO wte_rate_limits (bucket_key, hit_count, reset_at)
       VALUES ($1, 1, $2)
       ON CONFLICT (bucket_key) DO UPDATE SET
         hit_count = CASE
           WHEN wte_rate_limits.reset_at <= $3 THEN 1
           ELSE wte_rate_limits.hit_count + 1
         END,
         reset_at = CASE
           WHEN wte_rate_limits.reset_at <= $3 THEN EXCLUDED.reset_at
           ELSE wte_rate_limits.reset_at
         END
       RETURNING hit_count, reset_at`,
      [bucketKey, nextReset, now]
    );
    return {
      count: Number(rows[0].hit_count),
      resetAt: Number(rows[0].reset_at),
    };
  }

  async function getRateLimitState(bucketKey) {
    await ensureSchema();
    const now = Date.now();
    const { rows } = await pool.query(
      'SELECT hit_count, reset_at FROM wte_rate_limits WHERE bucket_key = $1',
      [bucketKey]
    );
    const row = rows[0];
    if (!row || Number(row.reset_at) <= now) {
      return { count: 0, resetAt: 0 };
    }
    return { count: Number(row.hit_count), resetAt: Number(row.reset_at) };
  }

  async function consumeRateLimit(
    bucketKey,
    limit,
    windowMs,
    errorMessage = '操作过于频繁，请稍后再试'
  ) {
    const { count, resetAt } = await incrementRateBucket(bucketKey, windowMs);
    if (count > limit) {
      const retrySec = Math.max(1, Math.ceil((resetAt - Date.now()) / 1000));
      throw new ValidationError(`${errorMessage}（请 ${retrySec} 秒后重试）`, 429);
    }
    return { count, remaining: Math.max(0, limit - count), resetAt };
  }

  async function resetRateLimit(bucketKey) {
    await ensureSchema();
    await pool.query('DELETE FROM wte_rate_limits WHERE bucket_key = $1', [bucketKey]);
  }

  async function assertPinNotLocked(cleanLower, clientIp) {
    const userState = await getRateLimitState(`pin_fail:user:${cleanLower}`);
    const ipState = await getRateLimitState(`pin_fail:ip:${clientIp}`);
    const now = Date.now();
    if (userState.count >= LIMITS.PIN_USER_MAX_FAILS) {
      const retrySec = Math.max(1, Math.ceil((userState.resetAt - now) / 1000));
      throw new ValidationError(
        `PIN 码连续输错次数过多，账号已临时保护（请 ${retrySec} 秒后重试）`,
        429
      );
    }
    if (ipState.count >= LIMITS.PIN_IP_MAX_FAILS) {
      const retrySec = Math.max(1, Math.ceil((ipState.resetAt - now) / 1000));
      throw new ValidationError(
        `PIN 码连续输错次数过多，当前网络已临时保护（请 ${retrySec} 秒后重试）`,
        429
      );
    }
  }

  async function recordPinFailure(cleanLower, clientIp) {
    const ipRes = await incrementRateBucket(`pin_fail:ip:${clientIp}`, LIMITS.PIN_LOCK_WINDOW_MS);
    const userRes = await incrementRateBucket(
      `pin_fail:user:${cleanLower}`,
      LIMITS.PIN_LOCK_WINDOW_MS
    );
    if (userRes.count >= LIMITS.PIN_USER_MAX_FAILS || ipRes.count >= LIMITS.PIN_IP_MAX_FAILS) {
      throw new ValidationError('PIN 码连续输错次数过多，已临时锁定 10 分钟', 429);
    }
    const left = LIMITS.PIN_USER_MAX_FAILS - userRes.count;
    throw new ValidationError(`PIN 码不正确，还可尝试 ${left} 次`, 401);
  }

  async function findUserRow(username, queryable = pool) {
    const clean = normalizeUsername(username);
    const { rows } = await queryable.query(
      'SELECT id, username, pin_hash, last_active_menu_id, last_login_at, created_at FROM wte_users WHERE username_lower = $1 LIMIT 1',
      [clean.toLowerCase()]
    );
    return rows[0] || null;
  }

  async function requireUserRow(username, queryable = pool) {
    const row = await findUserRow(username, queryable);
    if (!row) {
      throw new ValidationError('用户不存在', 404);
    }
    return row;
  }

  async function getUserAuthStatus(rawUsername) {
    await ensureSchema();
    const clean = normalizeUsername(rawUsername);
    const row = await findUserRow(clean);
    return {
      exists: Boolean(row),
      hasPin: Boolean(row?.pin_hash),
      username: row ? row.username : clean,
    };
  }

  async function getUserAuthRecord(rawUsername) {
    await ensureSchema();
    const clean = normalizeUsername(rawUsername);
    const row = await findUserRow(clean);
    if (!row) return null;
    return {
      id: Number(row.id),
      username: row.username,
      pinHash: row.pin_hash || null,
    };
  }

  async function insertMenuItemsBatch(client, menuId, items) {
    if (!items.length) return;
    const placeholders = [];
    const params = [];
    items.forEach((item, index) => {
      const base = index * 5;
      placeholders.push(
        `($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4}, $${base + 5})`
      );
      params.push(menuId, item.name, item.iconKey, item.weight ?? 1, index);
    });
    await client.query(
      `INSERT INTO wte_menu_items (menu_id, name, icon_key, weight, sort_order) VALUES ${placeholders.join(', ')}`,
      params
    );
  }

  async function insertMenuWithItems(client, userId, menuName, items, sortOrder) {
    const { rows } = await client.query(
      'INSERT INTO wte_menus (user_id, name, sort_order) VALUES ($1, $2, $3) RETURNING id',
      [userId, menuName, sortOrder]
    );
    const menuId = Number(rows[0].id);
    await insertMenuItemsBatch(client, menuId, items);
    return menuId;
  }

  async function appendImportedMenuIfPresent(client, userId, importMenu) {
    if (!importMenu || !Array.isArray(importMenu.items) || importMenu.items.length === 0) {
      return;
    }
    const sanitized = sanitizeItems(importMenu.items);
    const customName =
      typeof importMenu.name === 'string' && importMenu.name.trim()
        ? importMenu.name.trim().slice(0, 24)
        : '访客导入菜单';
    const { rows: countRows } = await client.query(
      'SELECT COUNT(*) AS cnt FROM wte_menus WHERE user_id = $1',
      [userId]
    );
    const count = Number(countRows[0].cnt);
    if (count >= LIMITS.MAX_MENUS_PER_USER) {
      throw new ValidationError(`每个用户最多创建 ${LIMITS.MAX_MENUS_PER_USER} 套菜单`);
    }
    const menuId = await insertMenuWithItems(client, userId, customName, sanitized, count);
    await client.query('UPDATE wte_users SET last_active_menu_id = $1 WHERE id = $2', [
      menuId,
      userId,
    ]);
  }

  async function requireOwnedMenu(userId, menuId, queryable = pool) {
    const id = Number(menuId);
    if (!Number.isInteger(id)) {
      throw new ValidationError('无效的菜单 ID');
    }
    const { rows } = await queryable.query(
      'SELECT id, user_id, name FROM wte_menus WHERE id = $1 AND user_id = $2',
      [id, userId]
    );
    const menu = rows[0];
    if (!menu) {
      throw new ValidationError('菜单不存在或无权限操作', 404);
    }
    return menu;
  }

  async function getUserBootstrap(username) {
    await ensureSchema();
    const user = await requireUserRow(username);

    const { rows: menus } = await pool.query(
      'SELECT id, name, sort_order, created_at FROM wte_menus WHERE user_id = $1 ORDER BY sort_order ASC, id ASC',
      [user.id]
    );

    const menuIds = menus.map((m) => Number(m.id));
    const itemsByMenu = new Map();
    if (menuIds.length > 0) {
      const { rows: allItems } = await pool.query(
        'SELECT id, menu_id, name, icon_key AS "iconKey", weight, sort_order AS "sortOrder" FROM wte_menu_items WHERE menu_id = ANY($1::int[]) ORDER BY sort_order ASC, id ASC',
        [menuIds]
      );
      for (const item of allItems) {
        const mId = Number(item.menu_id);
        if (!itemsByMenu.has(mId)) itemsByMenu.set(mId, []);
        itemsByMenu.get(mId).push({
          id: Number(item.id),
          name: item.name,
          iconKey: item.iconKey,
          weight: Number(item.weight),
          sortOrder: Number(item.sortOrder),
        });
      }
    }

    const hydratedMenus = menus.map((m) => ({
      id: Number(m.id),
      name: m.name,
      sortOrder: Number(m.sort_order),
      createdAt: toIsoString(m.created_at),
      items: itemsByMenu.get(Number(m.id)) || [],
    }));

    let activeMenuId = user.last_active_menu_id !== null ? Number(user.last_active_menu_id) : null;
    if (!hydratedMenus.some((m) => m.id === activeMenuId)) {
      activeMenuId = hydratedMenus[0]?.id ?? null;
      if (activeMenuId !== null) {
        await pool.query('UPDATE wte_users SET last_active_menu_id = $1 WHERE id = $2', [
          activeMenuId,
          user.id,
        ]);
      }
    }

    const { rows: historyRows } = await pool.query(
      'SELECT id, menu_name AS "menuName", item_name AS "itemName", icon_key AS "iconKey", mode, status, created_at AS "createdAt" FROM wte_draw_history WHERE user_id = $1 ORDER BY id DESC LIMIT $2',
      [user.id, LIMITS.MAX_HISTORY_PER_USER]
    );

    const history = historyRows.map((h) => ({
      id: Number(h.id),
      menuName: h.menuName,
      itemName: h.itemName,
      iconKey: h.iconKey,
      mode: h.mode,
      status: h.status,
      createdAt: toIsoString(h.createdAt),
    }));

    return {
      user: {
        id: Number(user.id),
        username: user.username,
        activeMenuId,
        createdAt: toIsoString(user.created_at),
      },
      menus: hydratedMenus,
      history,
    };
  }

  async function loginOrCreateUser(rawUsername, rawPin, importMenu = null, { clientIp = 'local' } = {}) {
    await ensureSchema();
    const clean = normalizeUsername(rawUsername);
    const cleanLower = clean.toLowerCase();
    validatePin(rawPin);
    await assertPinNotLocked(cleanLower, clientIp);

    const existing = await findUserRow(clean);
    let isNewUser = false;
    let pinBoundNow = false;
    let effectivePinHash;

    if (!existing) {
      await consumeRateLimit(
        `reg:ip:${clientIp}`,
        LIMITS.REG_IP_MAX_PER_HOUR,
        LIMITS.REG_IP_WINDOW_MS,
        '当前网络创建新账号过于频繁'
      );
      effectivePinHash = hashPin(rawPin);
      isNewUser = true;

      await withTransaction(async (client) => {
        const raceCheck = await findUserRow(clean, client);
        if (raceCheck) {
          throw new ValidationError('用户名正在被使用，请重新输入 PIN 码登录', 409);
        }

        const { rows: totalRows } = await client.query('SELECT COUNT(*) AS cnt FROM wte_users');
        if (Number(totalRows[0].cnt) >= LIMITS.MAX_TOTAL_USERS) {
          const cutoffIso = new Date(
            Date.now() - LIMITS.STALE_USER_DAYS * 86400 * 1000
          ).toISOString();
          await client.query(
            'DELETE FROM wte_users WHERE id IN (SELECT id FROM wte_users WHERE COALESCE(last_login_at, created_at) < $1 ORDER BY id ASC LIMIT 10)',
            [cutoffIso]
          );
          const { rows: remainRows } = await client.query('SELECT COUNT(*) AS cnt FROM wte_users');
          if (Number(remainRows[0].cnt) >= LIMITS.MAX_TOTAL_USERS) {
            throw new ValidationError('系统用户数已达上限，请稍后再试', 503);
          }
        }

        const { rows: userRows } = await client.query(
          'INSERT INTO wte_users (username, username_lower, pin_hash, last_login_at) VALUES ($1, $2, $3, NOW()) RETURNING id',
          [clean, cleanLower, effectivePinHash]
        );
        const userId = Number(userRows[0].id);

        if (importMenu && Array.isArray(importMenu.menus) && importMenu.menus.length > 0) {
          const menusToRestore = importMenu.menus.slice(0, LIMITS.MAX_MENUS_PER_USER);
          let chosenActiveId = null;
          for (let idx = 0; idx < menusToRestore.length; idx++) {
            const m = menusToRestore[idx];
            const mName =
              typeof m?.name === 'string' && m.name.trim()
                ? m.name.trim().slice(0, 24)
                : idx === 0
                ? DEFAULT_MENU_NAME
                : `菜单 ${idx + 1}`;
            const mItems =
              Array.isArray(m?.items) && m.items.length > 0 ? sanitizeItems(m.items) : DEFAULT_ITEMS;
            const insertedId = await insertMenuWithItems(client, userId, mName, mItems, idx);
            if (
              chosenActiveId === null ||
              (importMenu.activeMenuName && mName === importMenu.activeMenuName)
            ) {
              chosenActiveId = insertedId;
            }
          }
          await client.query('UPDATE wte_users SET last_active_menu_id = $1 WHERE id = $2', [
            chosenActiveId,
            userId,
          ]);
        } else {
          let initialItems = DEFAULT_ITEMS;
          let initialName = DEFAULT_MENU_NAME;
          if (importMenu && Array.isArray(importMenu.items) && importMenu.items.length > 0) {
            initialItems = sanitizeItems(importMenu.items);
            if (typeof importMenu.name === 'string' && importMenu.name.trim()) {
              initialName = importMenu.name.trim().slice(0, 24);
            }
          }
          const menuId = await insertMenuWithItems(client, userId, initialName, initialItems, 0);
          await client.query('UPDATE wte_users SET last_active_menu_id = $1 WHERE id = $2', [
            menuId,
            userId,
          ]);
        }
      });
    } else if (!existing.pin_hash) {
      effectivePinHash = hashPin(rawPin);
      pinBoundNow = true;
      await withTransaction(async (client) => {
        await client.query(
          'UPDATE wte_users SET pin_hash = $1, last_login_at = NOW() WHERE id = $2',
          [effectivePinHash, existing.id]
        );
        await appendImportedMenuIfPresent(client, Number(existing.id), importMenu);
      });
    } else {
      if (!verifyPin(rawPin, existing.pin_hash)) {
        await recordPinFailure(cleanLower, clientIp);
      }
      await resetRateLimit(`pin_fail:user:${cleanLower}`);
      effectivePinHash = existing.pin_hash;
      await withTransaction(async (client) => {
        await client.query('UPDATE wte_users SET last_login_at = NOW() WHERE id = $1', [
          existing.id,
        ]);
        await appendImportedMenuIfPresent(client, Number(existing.id), importMenu);
      });
    }

    const bootstrap = await getUserBootstrap(clean);
    return { ...bootstrap, isNewUser, pinBoundNow, pinHash: effectivePinHash };
  }

  async function changeUserPin(rawUsername, currentPin, newPin, { clientIp = 'local' } = {}) {
    await ensureSchema();
    const clean = normalizeUsername(rawUsername);
    const cleanLower = clean.toLowerCase();
    validatePin(currentPin);
    validatePin(newPin);
    await assertPinNotLocked(cleanLower, clientIp);

    const user = await requireUserRow(clean);
    if (!user.pin_hash || !verifyPin(currentPin, user.pin_hash)) {
      await recordPinFailure(cleanLower, clientIp);
    }

    const nextPinHash = hashPin(newPin);
    await pool.query('UPDATE wte_users SET pin_hash = $1, last_login_at = NOW() WHERE id = $2', [
      nextPinHash,
      user.id,
    ]);
    await resetRateLimit(`pin_fail:user:${cleanLower}`);
    return { username: user.username, pinHash: nextPinHash };
  }

  async function createMenu(username, rawName, rawItems = null) {
    const name = typeof rawName === 'string' ? rawName.trim() : '';
    if (!name || name.length > 24) {
      throw new ValidationError('菜单名称需在 1 到 24 个字符之间');
    }
    const items = rawItems ? sanitizeItems(rawItems) : DEFAULT_ITEMS;

    const canonicalName = await withTransaction(async (client) => {
      const user = await requireUserRow(username, client);
      const { rows: countRows } = await client.query(
        'SELECT COUNT(*) AS cnt FROM wte_menus WHERE user_id = $1',
        [user.id]
      );
      const count = Number(countRows[0].cnt);
      if (count >= LIMITS.MAX_MENUS_PER_USER) {
        throw new ValidationError(`每个用户最多创建 ${LIMITS.MAX_MENUS_PER_USER} 套菜单`);
      }
      const newMenuId = await insertMenuWithItems(client, user.id, name, items, count);
      await client.query('UPDATE wte_users SET last_active_menu_id = $1 WHERE id = $2', [
        newMenuId,
        user.id,
      ]);
      return user.username;
    });

    return getUserBootstrap(canonicalName);
  }

  async function updateMenuMeta(username, menuId, { name, setActive } = {}) {
    const canonicalName = await withTransaction(async (client) => {
      const user = await requireUserRow(username, client);
      const menu = await requireOwnedMenu(user.id, menuId, client);

      if (name !== undefined) {
        const cleanName = typeof name === 'string' ? name.trim() : '';
        if (!cleanName || cleanName.length > 24) {
          throw new ValidationError('菜单名称需在 1 到 24 个字符之间');
        }
        await client.query('UPDATE wte_menus SET name = $1 WHERE id = $2', [cleanName, menu.id]);
      }
      if (setActive) {
        await client.query('UPDATE wte_users SET last_active_menu_id = $1 WHERE id = $2', [
          menu.id,
          user.id,
        ]);
      }
      return user.username;
    });

    return getUserBootstrap(canonicalName);
  }

  async function replaceMenuItems(username, menuId, rawItems) {
    const items = sanitizeItems(rawItems);

    const canonicalName = await withTransaction(async (client) => {
      const user = await requireUserRow(username, client);
      const menu = await requireOwnedMenu(user.id, menuId, client);
      await client.query('DELETE FROM wte_menu_items WHERE menu_id = $1', [menu.id]);
      await insertMenuItemsBatch(client, menu.id, items);
      return user.username;
    });

    return getUserBootstrap(canonicalName);
  }

  async function deleteMenu(username, menuId) {
    const canonicalName = await withTransaction(async (client) => {
      const user = await requireUserRow(username, client);
      const menu = await requireOwnedMenu(user.id, menuId, client);
      const { rows: countRows } = await client.query(
        'SELECT COUNT(*) AS cnt FROM wte_menus WHERE user_id = $1',
        [user.id]
      );
      if (Number(countRows[0].cnt) <= 1) {
        throw new ValidationError('至少保留一套菜单，无法删除最后一个菜单');
      }
      await client.query('DELETE FROM wte_menus WHERE id = $1', [menu.id]);
      if (Number(user.last_active_menu_id) === Number(menu.id)) {
        const { rows: nextRows } = await client.query(
          'SELECT id FROM wte_menus WHERE user_id = $1 ORDER BY sort_order ASC, id ASC LIMIT 1',
          [user.id]
        );
        await client.query('UPDATE wte_users SET last_active_menu_id = $1 WHERE id = $2', [
          nextRows[0]?.id ?? null,
          user.id,
        ]);
      }
      return user.username;
    });

    return getUserBootstrap(canonicalName);
  }

  async function addHistory(username, { menuName, itemName, iconKey, mode, status = 'picked' }) {
    const cleanMenu =
      typeof menuName === 'string' && menuName.trim()
        ? menuName.trim().slice(0, 24)
        : DEFAULT_MENU_NAME;
    const cleanItem = typeof itemName === 'string' ? itemName.trim().slice(0, 30) : '';
    if (!cleanItem) {
      throw new ValidationError('抽取结果不能为空');
    }
    const cleanIcon =
      typeof iconKey === 'string' && iconKey.trim() ? iconKey.trim().slice(0, 32) : 'shop';
    const cleanMode =
      typeof mode === 'string' && mode.trim() ? mode.trim().slice(0, 20) : 'wheel';
    const cleanStatus = status === 'excluded' ? 'excluded' : 'picked';

    const canonicalName = await withTransaction(async (client) => {
      const user = await requireUserRow(username, client);
      await client.query(
        'INSERT INTO wte_draw_history (user_id, menu_name, item_name, icon_key, mode, status) VALUES ($1, $2, $3, $4, $5, $6)',
        [user.id, cleanMenu, cleanItem, cleanIcon, cleanMode, cleanStatus]
      );
      await client.query(
        'DELETE FROM wte_draw_history WHERE user_id = $1 AND id NOT IN (SELECT id FROM wte_draw_history WHERE user_id = $1 ORDER BY id DESC LIMIT $2)',
        [user.id, LIMITS.MAX_HISTORY_PER_USER]
      );
      return user.username;
    });

    const bootstrap = await getUserBootstrap(canonicalName);
    return bootstrap.history;
  }

  async function clearHistory(username) {
    await ensureSchema();
    const user = await requireUserRow(username);
    await pool.query('DELETE FROM wte_draw_history WHERE user_id = $1', [user.id]);
    return [];
  }

  async function createShare(creatorName, menuName, rawItems) {
    await ensureSchema();
    const cleanCreator =
      typeof creatorName === 'string' && creatorName.trim()
        ? creatorName.trim().slice(0, 24)
        : '热心干饭人';
    const cleanMenuName =
      typeof menuName === 'string' && menuName.trim()
        ? menuName.trim().slice(0, 24)
        : DEFAULT_MENU_NAME;
    const items = sanitizeItems(rawItems);

    let shareCode;
    for (let attempt = 0; attempt < 5; attempt++) {
      const candidate = crypto.randomBytes(4).toString('hex');
      const { rows } = await pool.query(
        'SELECT 1 FROM wte_shared_menus WHERE share_code = $1',
        [candidate]
      );
      if (rows.length === 0) {
        shareCode = candidate;
        break;
      }
    }
    if (!shareCode) {
      shareCode = crypto.randomUUID().slice(0, 12);
    }

    await withTransaction(async (client) => {
      const cutoffIso = new Date(Date.now() - LIMITS.SHARED_MENU_TTL_MS).toISOString();
      await client.query('DELETE FROM wte_shared_menus WHERE created_at < $1', [cutoffIso]);
      await client.query(
        'INSERT INTO wte_shared_menus (share_code, creator_name, menu_name, items_json) VALUES ($1, $2, $3, $4)',
        [shareCode, cleanCreator, cleanMenuName, JSON.stringify(items)]
      );
      await client.query(
        'DELETE FROM wte_shared_menus WHERE share_code NOT IN (SELECT share_code FROM wte_shared_menus ORDER BY created_at DESC LIMIT $1)',
        [LIMITS.MAX_SHARED_MENUS]
      );
    });

    return {
      shareCode,
      creatorName: cleanCreator,
      menuName: cleanMenuName,
      items,
    };
  }

  async function getShare(shareCode) {
    await ensureSchema();
    const cleanCode = typeof shareCode === 'string' ? shareCode.trim() : '';
    if (!cleanCode) {
      throw new ValidationError('分享码无效', 404);
    }
    const { rows } = await pool.query(
      'SELECT share_code AS "shareCode", creator_name AS "creatorName", menu_name AS "menuName", items_json AS "itemsJson", created_at AS "createdAt" FROM wte_shared_menus WHERE share_code = $1',
      [cleanCode]
    );
    const row = rows[0];
    if (!row) {
      throw new ValidationError('分享的菜单不存在或已失效', 404);
    }
    const createdIso = toIsoString(row.createdAt);
    const createdMs = Date.parse(createdIso);
    if (!Number.isFinite(createdMs) || Date.now() - createdMs > LIMITS.SHARED_MENU_TTL_MS) {
      await pool.query('DELETE FROM wte_shared_menus WHERE share_code = $1', [row.shareCode]);
      throw new ValidationError('分享的菜单不存在或已失效', 404);
    }
    return {
      shareCode: row.shareCode,
      creatorName: row.creatorName,
      menuName: row.menuName,
      items: JSON.parse(row.itemsJson),
      createdAt: createdIso,
    };
  }

  async function deleteUserForTest(username) {
    await ensureSchema();
    const clean = normalizeUsername(username);
    await pool.query('DELETE FROM wte_users WHERE username_lower = $1', [clean.toLowerCase()]);
  }

  async function deleteShareForTest(shareCode) {
    await ensureSchema();
    await pool.query('DELETE FROM wte_shared_menus WHERE share_code = $1', [shareCode]);
  }

  return {
    driver: 'postgres',
    pool,
    consumeRateLimit,
    resetRateLimit,
    getUserAuthStatus,
    getUserAuthRecord,
    loginOrCreateUser,
    changeUserPin,
    getUserBootstrap,
    createMenu,
    updateMenuMeta,
    replaceMenuItems,
    deleteMenu,
    addHistory,
    clearHistory,
    createShare,
    getShare,
    deleteUserForTest,
    deleteShareForTest,
    close: () => pool.end(),
  };
}
