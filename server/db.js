import { createRequire } from 'node:module';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { createPostgresStore } from './postgresStore.js';
import {
  LIMITS,
  ValidationError,
  hashPin,
  validatePin,
  verifyPin,
} from './security.js';

export { ValidationError } from './security.js';

const require = createRequire(import.meta.url);

const DEFAULT_DB_PATH =
  process.env.SQLITE_DB_PATH ||
  (process.env.VERCEL
    ? '/tmp/what_to_eat.db'
    : path.resolve(process.cwd(), 'server/data/what_to_eat.db'));

export function resolvePostgresConfig(env = process.env) {
  const isPgUrl = (v) => typeof v === 'string' && /^postgres(ql)?:\/\//i.test(v.trim());
  const pooledUrl = [
    env.DATABASE_URL_POOLED,
    env.DATABASE_URL,
    env.POSTGRES_URL,
    env.PRISMA_DATABASE_URL,
  ].find(isPgUrl);
  const directUrl = [
    env.DATABASE_URL,
    env.POSTGRES_URL,
    env.PRISMA_DATABASE_URL,
    env.DATABASE_URL_POOLED,
  ].find(isPgUrl);

  if (!pooledUrl) return null;
  return {
    connectionString: pooledUrl.trim(),
    directConnectionString: directUrl?.trim() || pooledUrl.trim(),
  };
}

export const DEFAULT_ITEMS = [
  { name: '火锅', iconKey: 'hotpot', weight: 1 },
  { name: '烧烤', iconKey: 'bbq', weight: 1 },
  { name: '日料', iconKey: 'japanese', weight: 1 },
  { name: '面食', iconKey: 'noodles', weight: 1 },
  { name: '快餐', iconKey: 'fastfood', weight: 1 },
  { name: '家常菜', iconKey: 'homestyle', weight: 1 },
  { name: '轻食', iconKey: 'lightmeal', weight: 1 },
  { name: '川菜', iconKey: 'sichuan', weight: 1 },
];

export const DEFAULT_MENU_NAME = '我的菜单';

function nowIso() {
  return new Date().toISOString();
}

export function normalizeUsername(raw) {
  if (typeof raw !== 'string') {
    throw new ValidationError('用户名不能为空');
  }
  const trimmed = raw.trim();
  if (trimmed.length < 1 || trimmed.length > 24) {
    throw new ValidationError('用户名长度需在 1 到 24 个字符之间');
  }
  return trimmed;
}

export function sanitizeItems(items) {
  if (!Array.isArray(items) || items.length === 0) {
    throw new ValidationError('菜单至少需要包含 1 个菜品或店名');
  }
  if (items.length > 50) {
    throw new ValidationError('单个菜单最多支持 50 个选项');
  }
  return items.map((item, idx) => {
    const name = typeof item?.name === 'string' ? item.name.trim() : '';
    if (!name || name.length > 30) {
      throw new ValidationError(`第 ${idx + 1} 项名称需在 1 到 30 个字符之间`);
    }
    const iconKey =
      typeof item?.iconKey === 'string' && item.iconKey.trim()
        ? item.iconKey.trim().slice(0, 32)
        : 'shop';
    const rawWeight = Number(item?.weight ?? 1);
    const weight = Number.isFinite(rawWeight)
      ? Math.min(5, Math.max(1, Math.round(rawWeight)))
      : 1;
    return { name, iconKey, weight };
  });
}

export function createDatabase(dbPath = DEFAULT_DB_PATH) {
  const { DatabaseSync } = require('node:sqlite');
  if (dbPath !== ':memory:') {
    fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  }
  const db = new DatabaseSync(dbPath);
  if (dbPath !== ':memory:') {
    try {
      db.exec('PRAGMA journal_mode = WAL;');
    } catch {
      // Fallback to default journal mode if tmpfs does not support WAL
    }
  }
  db.exec('PRAGMA foreign_keys = ON;');

  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL UNIQUE COLLATE NOCASE,
      pin_hash TEXT,
      last_active_menu_id INTEGER,
      last_login_at TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS menus (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS menu_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      menu_id INTEGER NOT NULL REFERENCES menus(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      icon_key TEXT NOT NULL,
      weight INTEGER NOT NULL DEFAULT 1,
      sort_order INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS draw_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      menu_name TEXT NOT NULL,
      item_name TEXT NOT NULL,
      icon_key TEXT NOT NULL,
      mode TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'picked',
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS shared_menus (
      share_code TEXT PRIMARY KEY,
      creator_name TEXT NOT NULL,
      menu_name TEXT NOT NULL,
      items_json TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS rate_limits (
      bucket_key TEXT PRIMARY KEY,
      hit_count INTEGER NOT NULL DEFAULT 0,
      reset_at INTEGER NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_rate_limits_reset ON rate_limits(reset_at);
  `);

  // Idempotent migration for pre-existing local SQLite databases
  const userColumns = db.prepare('PRAGMA table_info(users)').all();
  if (!userColumns.some((c) => c.name === 'pin_hash')) {
    db.exec('ALTER TABLE users ADD COLUMN pin_hash TEXT;');
  }
  if (!userColumns.some((c) => c.name === 'last_login_at')) {
    db.exec('ALTER TABLE users ADD COLUMN last_login_at TEXT;');
  }

  function runInTransaction(fn) {
    db.exec('BEGIN IMMEDIATE');
    try {
      const result = fn();
      db.exec('COMMIT');
      return result;
    } catch (err) {
      try {
        db.exec('ROLLBACK');
      } catch {
        // ignore rollback error
      }
      throw err;
    }
  }

  function incrementRateBucket(bucketKey, windowMs) {
    const now = Date.now();
    if (Math.random() < 0.05) {
      db.prepare('DELETE FROM rate_limits WHERE reset_at <= ?').run(now);
    }
    const nextReset = now + windowMs;
    return runInTransaction(() => {
      const row = db
        .prepare('SELECT hit_count, reset_at FROM rate_limits WHERE bucket_key = ?')
        .get(bucketKey);
      if (!row || Number(row.reset_at) <= now) {
        db.prepare(
          'INSERT INTO rate_limits (bucket_key, hit_count, reset_at) VALUES (?, 1, ?) ON CONFLICT(bucket_key) DO UPDATE SET hit_count = 1, reset_at = excluded.reset_at'
        ).run(bucketKey, nextReset);
        return { count: 1, resetAt: nextReset };
      }
      const nextCount = Number(row.hit_count) + 1;
      db.prepare('UPDATE rate_limits SET hit_count = ? WHERE bucket_key = ?').run(
        nextCount,
        bucketKey
      );
      return { count: nextCount, resetAt: Number(row.reset_at) };
    });
  }

  function getRateLimitState(bucketKey) {
    const now = Date.now();
    const row = db
      .prepare('SELECT hit_count, reset_at FROM rate_limits WHERE bucket_key = ?')
      .get(bucketKey);
    if (!row || Number(row.reset_at) <= now) {
      return { count: 0, resetAt: 0 };
    }
    return { count: Number(row.hit_count), resetAt: Number(row.reset_at) };
  }

  function consumeRateLimit(bucketKey, limit, windowMs, errorMessage = '操作过于频繁，请稍后再试') {
    const { count, resetAt } = incrementRateBucket(bucketKey, windowMs);
    if (count > limit) {
      const retrySec = Math.max(1, Math.ceil((resetAt - Date.now()) / 1000));
      throw new ValidationError(`${errorMessage}（请 ${retrySec} 秒后重试）`, 429);
    }
    return { count, remaining: Math.max(0, limit - count), resetAt };
  }

  function resetRateLimit(bucketKey) {
    db.prepare('DELETE FROM rate_limits WHERE bucket_key = ?').run(bucketKey);
  }

  function assertPinNotLocked(cleanLower, clientIp) {
    const userState = getRateLimitState(`pin_fail:user:${cleanLower}`);
    const ipState = getRateLimitState(`pin_fail:ip:${clientIp}`);
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

  function recordPinFailure(cleanLower, clientIp) {
    const ipRes = incrementRateBucket(`pin_fail:ip:${clientIp}`, LIMITS.PIN_LOCK_WINDOW_MS);
    const userRes = incrementRateBucket(`pin_fail:user:${cleanLower}`, LIMITS.PIN_LOCK_WINDOW_MS);
    if (userRes.count >= LIMITS.PIN_USER_MAX_FAILS || ipRes.count >= LIMITS.PIN_IP_MAX_FAILS) {
      throw new ValidationError('PIN 码连续输错次数过多，已临时锁定 10 分钟', 429);
    }
    const left = LIMITS.PIN_USER_MAX_FAILS - userRes.count;
    throw new ValidationError(`PIN 码不正确，还可尝试 ${left} 次`, 401);
  }

  function findUserRow(username) {
    const clean = normalizeUsername(username);
    return db
      .prepare(
        'SELECT id, username, pin_hash, last_active_menu_id, last_login_at, created_at FROM users WHERE username = ?'
      )
      .get(clean);
  }

  function requireUserRow(username) {
    const row = findUserRow(username);
    if (!row) {
      throw new ValidationError('用户不存在', 404);
    }
    return row;
  }

  function getUserAuthStatus(rawUsername) {
    const clean = normalizeUsername(rawUsername);
    const row = findUserRow(clean);
    return {
      exists: Boolean(row),
      hasPin: Boolean(row?.pin_hash),
      username: row ? row.username : clean,
    };
  }

  function getUserAuthRecord(rawUsername) {
    const clean = normalizeUsername(rawUsername);
    const row = findUserRow(clean);
    if (!row) return null;
    return {
      id: Number(row.id),
      username: row.username,
      pinHash: row.pin_hash || null,
    };
  }

  function insertMenuWithItems(userId, menuName, items, sortOrder) {
    const now = nowIso();
    const menuRes = db
      .prepare('INSERT INTO menus (user_id, name, sort_order, created_at) VALUES (?, ?, ?, ?)')
      .run(userId, menuName, sortOrder, now);
    const menuId = Number(menuRes.lastInsertRowid);
    const insertItem = db.prepare(
      'INSERT INTO menu_items (menu_id, name, icon_key, weight, sort_order) VALUES (?, ?, ?, ?, ?)'
    );
    items.forEach((item, index) => {
      insertItem.run(menuId, item.name, item.iconKey, item.weight ?? 1, index);
    });
    return menuId;
  }

  function appendImportedMenuIfPresent(userId, importMenu) {
    if (!importMenu || !Array.isArray(importMenu.items) || importMenu.items.length === 0) {
      return;
    }
    const sanitized = sanitizeItems(importMenu.items);
    const customName =
      typeof importMenu.name === 'string' && importMenu.name.trim()
        ? importMenu.name.trim().slice(0, 24)
        : '访客导入菜单';
    const countRow = db.prepare('SELECT COUNT(*) AS cnt FROM menus WHERE user_id = ?').get(userId);
    const count = Number(countRow.cnt);
    if (count >= LIMITS.MAX_MENUS_PER_USER) {
      throw new ValidationError(`每个用户最多创建 ${LIMITS.MAX_MENUS_PER_USER} 套菜单`);
    }
    const menuId = insertMenuWithItems(userId, customName, sanitized, count);
    db.prepare('UPDATE users SET last_active_menu_id = ? WHERE id = ?').run(menuId, userId);
  }

  function getUserBootstrap(username) {
    const user = requireUserRow(username);
    const menus = db
      .prepare(
        'SELECT id, name, sort_order, created_at FROM menus WHERE user_id = ? ORDER BY sort_order ASC, id ASC'
      )
      .all(user.id);

    const itemsStmt = db.prepare(
      'SELECT id, name, icon_key AS iconKey, weight, sort_order AS sortOrder FROM menu_items WHERE menu_id = ? ORDER BY sort_order ASC, id ASC'
    );

    const hydratedMenus = menus.map((m) => ({
      id: m.id,
      name: m.name,
      sortOrder: m.sort_order,
      createdAt: m.created_at,
      items: itemsStmt.all(m.id),
    }));

    let activeMenuId = user.last_active_menu_id;
    if (!hydratedMenus.some((m) => m.id === activeMenuId)) {
      activeMenuId = hydratedMenus[0]?.id ?? null;
      if (activeMenuId !== null) {
        db.prepare('UPDATE users SET last_active_menu_id = ? WHERE id = ?').run(
          activeMenuId,
          user.id
        );
      }
    }

    const history = db
      .prepare(
        'SELECT id, menu_name AS menuName, item_name AS itemName, icon_key AS iconKey, mode, status, created_at AS createdAt FROM draw_history WHERE user_id = ? ORDER BY id DESC LIMIT ?'
      )
      .all(user.id, LIMITS.MAX_HISTORY_PER_USER);

    return {
      user: {
        id: user.id,
        username: user.username,
        activeMenuId,
        createdAt: user.created_at,
      },
      menus: hydratedMenus,
      history,
    };
  }

  function loginOrCreateUser(rawUsername, rawPin, importMenu = null, { clientIp = 'local' } = {}) {
    const clean = normalizeUsername(rawUsername);
    const cleanLower = clean.toLowerCase();
    validatePin(rawPin);
    assertPinNotLocked(cleanLower, clientIp);

    const existing = findUserRow(clean);
    let isNewUser = false;
    let pinBoundNow = false;
    let effectivePinHash;

    if (!existing) {
      consumeRateLimit(
        `reg:ip:${clientIp}`,
        LIMITS.REG_IP_MAX_PER_HOUR,
        LIMITS.REG_IP_WINDOW_MS,
        '当前网络创建新账号过于频繁'
      );
      effectivePinHash = hashPin(rawPin);
      isNewUser = true;

      runInTransaction(() => {
        const countRow = db.prepare('SELECT COUNT(*) AS cnt FROM users').get();
        if (Number(countRow.cnt) >= LIMITS.MAX_TOTAL_USERS) {
          const cutoffIso = new Date(
            Date.now() - LIMITS.STALE_USER_DAYS * 86400 * 1000
          ).toISOString();
          db.prepare(
            'DELETE FROM users WHERE id IN (SELECT id FROM users WHERE COALESCE(last_login_at, created_at) < ? ORDER BY id ASC LIMIT 10)'
          ).run(cutoffIso);
          const remaining = db.prepare('SELECT COUNT(*) AS cnt FROM users').get();
          if (Number(remaining.cnt) >= LIMITS.MAX_TOTAL_USERS) {
            throw new ValidationError('系统用户数已达上限，请稍后再试', 503);
          }
        }

        const now = nowIso();
        const userRes = db
          .prepare(
            'INSERT INTO users (username, pin_hash, last_login_at, created_at) VALUES (?, ?, ?, ?)'
          )
          .run(clean, effectivePinHash, now, now);
        const userId = Number(userRes.lastInsertRowid);

        if (importMenu && Array.isArray(importMenu.menus) && importMenu.menus.length > 0) {
          const menusToRestore = importMenu.menus.slice(0, LIMITS.MAX_MENUS_PER_USER);
          let chosenActiveId = null;
          menusToRestore.forEach((m, idx) => {
            const mName =
              typeof m?.name === 'string' && m.name.trim()
                ? m.name.trim().slice(0, 24)
                : idx === 0
                ? DEFAULT_MENU_NAME
                : `菜单 ${idx + 1}`;
            const mItems =
              Array.isArray(m?.items) && m.items.length > 0 ? sanitizeItems(m.items) : DEFAULT_ITEMS;
            const insertedId = insertMenuWithItems(userId, mName, mItems, idx);
            if (
              chosenActiveId === null ||
              (importMenu.activeMenuName && mName === importMenu.activeMenuName)
            ) {
              chosenActiveId = insertedId;
            }
          });
          db.prepare('UPDATE users SET last_active_menu_id = ? WHERE id = ?').run(
            chosenActiveId,
            userId
          );
        } else {
          let initialItems = DEFAULT_ITEMS;
          let initialName = DEFAULT_MENU_NAME;
          if (importMenu && Array.isArray(importMenu.items) && importMenu.items.length > 0) {
            initialItems = sanitizeItems(importMenu.items);
            if (typeof importMenu.name === 'string' && importMenu.name.trim()) {
              initialName = importMenu.name.trim().slice(0, 24);
            }
          }
          const menuId = insertMenuWithItems(userId, initialName, initialItems, 0);
          db.prepare('UPDATE users SET last_active_menu_id = ? WHERE id = ?').run(menuId, userId);
        }
      });
    } else if (!existing.pin_hash) {
      effectivePinHash = hashPin(rawPin);
      pinBoundNow = true;
      runInTransaction(() => {
        db.prepare('UPDATE users SET pin_hash = ?, last_login_at = ? WHERE id = ?').run(
          effectivePinHash,
          nowIso(),
          existing.id
        );
        appendImportedMenuIfPresent(existing.id, importMenu);
      });
    } else {
      if (!verifyPin(rawPin, existing.pin_hash)) {
        recordPinFailure(cleanLower, clientIp);
      }
      resetRateLimit(`pin_fail:user:${cleanLower}`);
      effectivePinHash = existing.pin_hash;
      runInTransaction(() => {
        db.prepare('UPDATE users SET last_login_at = ? WHERE id = ?').run(nowIso(), existing.id);
        appendImportedMenuIfPresent(existing.id, importMenu);
      });
    }

    const bootstrap = getUserBootstrap(clean);
    return { ...bootstrap, isNewUser, pinBoundNow, pinHash: effectivePinHash };
  }

  function changeUserPin(rawUsername, currentPin, newPin, { clientIp = 'local' } = {}) {
    const clean = normalizeUsername(rawUsername);
    const cleanLower = clean.toLowerCase();
    validatePin(currentPin);
    validatePin(newPin);
    assertPinNotLocked(cleanLower, clientIp);

    const user = requireUserRow(clean);
    if (!user.pin_hash || !verifyPin(currentPin, user.pin_hash)) {
      recordPinFailure(cleanLower, clientIp);
    }

    const nextPinHash = hashPin(newPin);
    db.prepare('UPDATE users SET pin_hash = ?, last_login_at = ? WHERE id = ?').run(
      nextPinHash,
      nowIso(),
      user.id
    );
    resetRateLimit(`pin_fail:user:${cleanLower}`);
    return { username: user.username, pinHash: nextPinHash };
  }

  function createMenu(username, rawName, rawItems = null) {
    const user = requireUserRow(username);
    const name = typeof rawName === 'string' ? rawName.trim() : '';
    if (!name || name.length > 24) {
      throw new ValidationError('菜单名称需在 1 到 24 个字符之间');
    }
    const items = rawItems ? sanitizeItems(rawItems) : DEFAULT_ITEMS;

    runInTransaction(() => {
      const countRow = db.prepare('SELECT COUNT(*) AS cnt FROM menus WHERE user_id = ?').get(user.id);
      if (Number(countRow.cnt) >= LIMITS.MAX_MENUS_PER_USER) {
        throw new ValidationError(`每个用户最多创建 ${LIMITS.MAX_MENUS_PER_USER} 套菜单`);
      }
      const newMenuId = insertMenuWithItems(user.id, name, items, Number(countRow.cnt));
      db.prepare('UPDATE users SET last_active_menu_id = ? WHERE id = ?').run(newMenuId, user.id);
    });

    return getUserBootstrap(user.username);
  }

  function requireOwnedMenu(userId, menuId) {
    const id = Number(menuId);
    if (!Number.isInteger(id)) {
      throw new ValidationError('无效的菜单 ID');
    }
    const menu = db
      .prepare('SELECT id, user_id, name FROM menus WHERE id = ? AND user_id = ?')
      .get(id, userId);
    if (!menu) {
      throw new ValidationError('菜单不存在或无权限操作', 404);
    }
    return menu;
  }

  function updateMenuMeta(username, menuId, { name, setActive } = {}) {
    const user = requireUserRow(username);
    const menu = requireOwnedMenu(user.id, menuId);

    runInTransaction(() => {
      if (name !== undefined) {
        const cleanName = typeof name === 'string' ? name.trim() : '';
        if (!cleanName || cleanName.length > 24) {
          throw new ValidationError('菜单名称需在 1 到 24 个字符之间');
        }
        db.prepare('UPDATE menus SET name = ? WHERE id = ?').run(cleanName, menu.id);
      }
      if (setActive) {
        db.prepare('UPDATE users SET last_active_menu_id = ? WHERE id = ?').run(menu.id, user.id);
      }
    });

    return getUserBootstrap(user.username);
  }

  function replaceMenuItems(username, menuId, rawItems) {
    const user = requireUserRow(username);
    const menu = requireOwnedMenu(user.id, menuId);
    const items = sanitizeItems(rawItems);

    runInTransaction(() => {
      db.prepare('DELETE FROM menu_items WHERE menu_id = ?').run(menu.id);
      const insertStmt = db.prepare(
        'INSERT INTO menu_items (menu_id, name, icon_key, weight, sort_order) VALUES (?, ?, ?, ?, ?)'
      );
      items.forEach((item, index) => {
        insertStmt.run(menu.id, item.name, item.iconKey, item.weight, index);
      });
    });

    return getUserBootstrap(user.username);
  }

  function deleteMenu(username, menuId) {
    const user = requireUserRow(username);
    const menu = requireOwnedMenu(user.id, menuId);

    runInTransaction(() => {
      const countRow = db.prepare('SELECT COUNT(*) AS cnt FROM menus WHERE user_id = ?').get(user.id);
      if (Number(countRow.cnt) <= 1) {
        throw new ValidationError('至少保留一套菜单，无法删除最后一个菜单');
      }
      db.prepare('DELETE FROM menus WHERE id = ?').run(menu.id);
      if (user.last_active_menu_id === menu.id) {
        const nextMenu = db
          .prepare('SELECT id FROM menus WHERE user_id = ? ORDER BY sort_order ASC, id ASC LIMIT 1')
          .get(user.id);
        db.prepare('UPDATE users SET last_active_menu_id = ? WHERE id = ?').run(
          nextMenu?.id ?? null,
          user.id
        );
      }
    });

    return getUserBootstrap(user.username);
  }

  function addHistory(username, { menuName, itemName, iconKey, mode, status = 'picked' }) {
    const user = requireUserRow(username);
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

    runInTransaction(() => {
      db.prepare(
        'INSERT INTO draw_history (user_id, menu_name, item_name, icon_key, mode, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
      ).run(user.id, cleanMenu, cleanItem, cleanIcon, cleanMode, cleanStatus, nowIso());

      db.prepare(
        'DELETE FROM draw_history WHERE user_id = ? AND id NOT IN (SELECT id FROM draw_history WHERE user_id = ? ORDER BY id DESC LIMIT ?)'
      ).run(user.id, user.id, LIMITS.MAX_HISTORY_PER_USER);
    });

    return getUserBootstrap(user.username).history;
  }

  function clearHistory(username) {
    const user = requireUserRow(username);
    db.prepare('DELETE FROM draw_history WHERE user_id = ?').run(user.id);
    return [];
  }

  function createShare(creatorName, menuName, rawItems) {
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
      const exists = db.prepare('SELECT 1 FROM shared_menus WHERE share_code = ?').get(candidate);
      if (!exists) {
        shareCode = candidate;
        break;
      }
    }
    if (!shareCode) {
      shareCode = crypto.randomUUID().slice(0, 12);
    }

    runInTransaction(() => {
      const cutoffIso = new Date(Date.now() - LIMITS.SHARED_MENU_TTL_MS).toISOString();
      db.prepare('DELETE FROM shared_menus WHERE created_at < ?').run(cutoffIso);
      db.prepare(
        'INSERT INTO shared_menus (share_code, creator_name, menu_name, items_json, created_at) VALUES (?, ?, ?, ?, ?)'
      ).run(shareCode, cleanCreator, cleanMenuName, JSON.stringify(items), nowIso());
      db.prepare(
        'DELETE FROM shared_menus WHERE share_code NOT IN (SELECT share_code FROM shared_menus ORDER BY created_at DESC LIMIT ?)'
      ).run(LIMITS.MAX_SHARED_MENUS);
    });

    return {
      shareCode,
      creatorName: cleanCreator,
      menuName: cleanMenuName,
      items,
    };
  }

  function getShare(shareCode) {
    const cleanCode = typeof shareCode === 'string' ? shareCode.trim() : '';
    if (!cleanCode) {
      throw new ValidationError('分享码无效', 404);
    }
    const row = db
      .prepare(
        'SELECT share_code AS shareCode, creator_name AS creatorName, menu_name AS menuName, items_json AS itemsJson, created_at AS createdAt FROM shared_menus WHERE share_code = ?'
      )
      .get(cleanCode);
    if (!row) {
      throw new ValidationError('分享的菜单不存在或已失效', 404);
    }
    const createdMs = Date.parse(row.createdAt);
    if (!Number.isFinite(createdMs) || Date.now() - createdMs > LIMITS.SHARED_MENU_TTL_MS) {
      db.prepare('DELETE FROM shared_menus WHERE share_code = ?').run(row.shareCode);
      throw new ValidationError('分享的菜单不存在或已失效', 404);
    }
    return {
      shareCode: row.shareCode,
      creatorName: row.creatorName,
      menuName: row.menuName,
      items: JSON.parse(row.itemsJson),
      createdAt: row.createdAt,
    };
  }

  return {
    driver: 'sqlite',
    db,
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
    close: () => db.close(),
  };
}

export function createStore({ dbPath, env = process.env } = {}) {
  if (dbPath) {
    return createDatabase(dbPath);
  }
  const pgConfig = resolvePostgresConfig(env);
  if (pgConfig) {
    return createPostgresStore(pgConfig.connectionString, {
      directConnectionString: pgConfig.directConnectionString,
    });
  }
  return createDatabase();
}
