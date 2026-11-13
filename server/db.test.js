import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import { createDatabase, DEFAULT_ITEMS, resolvePostgresConfig, ValidationError } from './db.js';
import { createApiRouter } from './api.js';
import { LIMITS, resolveSigningKey, signAuthToken, verifyAuthToken } from './security.js';

describe('SQLite store tests', () => {
  let store;

  beforeEach(() => {
    store = createDatabase(':memory:');
  });

  afterEach(() => {
    store.close();
  });

  it('creates new user with 8 default items and reuses user case-insensitively with PIN', () => {
    const created = store.loginOrCreateUser('小明', '1234');
    assert.equal(created.isNewUser, true);
    assert.equal(created.user.username, '小明');
    assert.equal(created.menus.length, 1);
    assert.equal(created.menus[0].name, '我的菜单');
    assert.deepEqual(
      created.menus[0].items.map((i) => i.name),
      DEFAULT_ITEMS.map((i) => i.name)
    );

    const alice = store.loginOrCreateUser('Alice', '2580', null, { clientIp: '10.0.0.2' });
    assert.equal(alice.isNewUser, true);
    const aliceAgain = store.loginOrCreateUser('alice', '2580', null, { clientIp: '10.0.0.2' });
    assert.equal(aliceAgain.isNewUser, false);
    assert.equal(aliceAgain.user.id, alice.user.id);
    assert.equal(aliceAgain.user.username, 'Alice');
  });

  it('validates 4-digit PIN format and rejects wrong PIN with 401', () => {
    for (const badPin of ['', '123', '12345', 'abcd', 1234]) {
      assert.throws(
        () => store.loginOrCreateUser('校验员', badPin),
        (err) => err instanceof ValidationError && err.status === 400
      );
    }

    store.loginOrCreateUser('校验员', '4321');
    assert.throws(
      () => store.loginOrCreateUser('校验员', '0000'),
      (err) => err instanceof ValidationError && err.status === 401
    );
  });

  it('binds 4-digit PIN on first login for legacy PIN-less user rows', () => {
    const now = new Date().toISOString();
    store.db
      .prepare('INSERT INTO users (username, created_at) VALUES (?, ?)')
      .run('老用户', now);

    const statusBefore = store.getUserAuthStatus('老用户');
    assert.equal(statusBefore.exists, true);
    assert.equal(statusBefore.hasPin, false);

    const res = store.loginOrCreateUser('老用户', '7788');
    assert.equal(res.isNewUser, false);
    assert.equal(res.pinBoundNow, true);

    const statusAfter = store.getUserAuthStatus('老用户');
    assert.equal(statusAfter.exists, true);
    assert.equal(statusAfter.hasPin, true);

    assert.throws(
      () => store.loginOrCreateUser('老用户', '1111'),
      (err) => err instanceof ValidationError && err.status === 401
    );
  });

  it('changes PIN and invalidates tokens minted before PIN change', () => {
    const secretKey = resolveSigningKey({ AUTH_SECRET: 'test-secret-key' });
    const boot = store.loginOrCreateUser('改密人', '1234');
    const oldToken = signAuthToken(
      { username: boot.user.username, pinHash: boot.pinHash },
      secretKey
    );
    assert.equal(verifyAuthToken(oldToken, '改密人', boot.pinHash, secretKey), true);

    const updated = store.changeUserPin('改密人', '1234', '5678');
    assert.equal(verifyAuthToken(oldToken, '改密人', updated.pinHash, secretKey), false);

    const newToken = signAuthToken(
      { username: updated.username, pinHash: updated.pinHash },
      secretKey
    );
    assert.equal(verifyAuthToken(newToken, '改密人', updated.pinHash, secretKey), true);

    assert.throws(
      () => store.loginOrCreateUser('改密人', '1234'),
      (err) => err instanceof ValidationError && err.status === 401
    );
    const okLogin = store.loginOrCreateUser('改密人', '5678');
    assert.equal(okLogin.user.username, '改密人');
  });

  it('locks out PIN brute-force after 5 failed attempts and resets on success before lockout', () => {
    store.loginOrCreateUser('防爆破', '9999', null, { clientIp: '1.2.3.4' });

    // 3 wrong attempts then success should reset failure count
    for (let i = 0; i < 3; i++) {
      assert.throws(
        () => store.loginOrCreateUser('防爆破', '0000', null, { clientIp: '1.2.3.4' }),
        (err) => err instanceof ValidationError && err.status === 401
      );
    }
    const ok = store.loginOrCreateUser('防爆破', '9999', null, { clientIp: '1.2.3.4' });
    assert.equal(ok.user.username, '防爆破');

    // Now 5 wrong attempts trigger 429 lockout
    for (let i = 0; i < LIMITS.PIN_USER_MAX_FAILS - 1; i++) {
      assert.throws(
        () => store.loginOrCreateUser('防爆破', '0000', null, { clientIp: '1.2.3.5' }),
        (err) => err instanceof ValidationError && err.status === 401
      );
    }
    assert.throws(
      () => store.loginOrCreateUser('防爆破', '0000', null, { clientIp: '1.2.3.5' }),
      (err) => err instanceof ValidationError && err.status === 429
    );
    // Even the right PIN is blocked while locked
    assert.throws(
      () => store.loginOrCreateUser('防爆破', '9999', null, { clientIp: '1.2.3.5' }),
      (err) => err instanceof ValidationError && err.status === 429
    );
  });

  it('enforces per-IP new user registration rate limit (5 per hour)', () => {
    for (let i = 1; i <= LIMITS.REG_IP_MAX_PER_HOUR; i++) {
      store.loginOrCreateUser(`新用户${i}`, '1234', null, { clientIp: '9.9.9.9' });
    }
    assert.throws(
      () => store.loginOrCreateUser('新用户6', '1234', null, { clientIp: '9.9.9.9' }),
      (err) => err instanceof ValidationError && err.status === 429
    );
  });

  it('supports importing guest custom menu on login and blocks existing user importMenu past 20 menus', () => {
    const res = store.loginOrCreateUser('小美', '1357', {
      name: '奶茶清单',
      items: [
        { name: '喜茶', iconKey: 'milktea', weight: 2 },
        { name: '霸王茶姬', iconKey: 'milktea', weight: 3 },
      ],
    });
    assert.equal(res.menus.length, 1);
    assert.equal(res.menus[0].name, '奶茶清单');
    assert.equal(res.menus[0].items.length, 2);
    assert.equal(res.menus[0].items[1].weight, 3);

    for (let i = 2; i <= LIMITS.MAX_MENUS_PER_USER; i++) {
      store.createMenu('小美', `菜单${i}`);
    }
    assert.throws(
      () =>
        store.loginOrCreateUser('小美', '1357', {
          name: '超限导入菜单',
          items: [{ name: '麻辣烫', iconKey: 'hotpot', weight: 1 }],
        }),
      (err) => err instanceof ValidationError && err.status === 400
    );
  });

  it('supports multi-menu CRUD and blocks deleting the last menu', () => {
    const boot = store.loginOrCreateUser('测试员', '2468');
    const firstMenuId = boot.menus[0].id;

    const afterCreate = store.createMenu('测试员', '附近店名', [
      { name: '海底捞', iconKey: 'hotpot', weight: 2 },
      { name: '麦当劳', iconKey: 'fastfood', weight: 1 },
    ]);
    assert.equal(afterCreate.menus.length, 2);
    const secondMenuId = afterCreate.user.activeMenuId;
    assert.notEqual(secondMenuId, firstMenuId);

    const afterRename = store.updateMenuMeta('测试员', secondMenuId, {
      name: '公司周边',
      setActive: true,
    });
    const renamed = afterRename.menus.find((m) => m.id === secondMenuId);
    assert.equal(renamed.name, '公司周边');

    const afterReplace = store.replaceMenuItems('测试员', secondMenuId, [
      { name: '麦当劳', iconKey: 'fastfood', weight: 4 },
      { name: '海底捞', iconKey: 'hotpot', weight: 1 },
    ]);
    const updated = afterReplace.menus.find((m) => m.id === secondMenuId);
    assert.equal(updated.items[0].name, '麦当劳');
    assert.equal(updated.items[0].weight, 4);

    const afterDelete = store.deleteMenu('测试员', secondMenuId);
    assert.equal(afterDelete.menus.length, 1);
    assert.equal(afterDelete.user.activeMenuId, firstMenuId);

    assert.throws(
      () => store.deleteMenu('测试员', firstMenuId),
      (err) => err instanceof ValidationError && err.status === 400
    );
  });

  it('caps draw history at 50 rows per user and supports clearing', () => {
    store.loginOrCreateUser('吃货', '1234');
    for (let i = 1; i <= 55; i++) {
      store.addHistory('吃货', {
        menuName: '我的菜单',
        itemName: `菜品${i}`,
        iconKey: 'hotpot',
        mode: i % 2 === 0 ? 'slot' : 'wheel',
        status: i === 55 ? 'excluded' : 'picked',
      });
    }
    const boot = store.getUserBootstrap('吃货');
    assert.equal(boot.history.length, LIMITS.MAX_HISTORY_PER_USER);
    assert.equal(boot.history[0].itemName, '菜品55');
    assert.equal(boot.history[0].status, 'excluded');

    const cleared = store.clearHistory('吃货');
    assert.equal(cleared.length, 0);
  });

  it('creates, retrieves, and auto-prunes expired shared menu snapshots', () => {
    // Insert an already-expired share (>30 days ago)
    const oldIso = new Date(Date.now() - 31 * 86400 * 1000).toISOString();
    store.db
      .prepare(
        'INSERT INTO shared_menus (share_code, creator_name, menu_name, items_json, created_at) VALUES (?, ?, ?, ?, ?)'
      )
      .run('expired1', '过客', '旧菜单', JSON.stringify([{ name: '包子', iconKey: 'shop', weight: 1 }]), oldIso);

    const share = store.createShare('小明', '周末聚餐', [
      { name: '潮汕牛肉锅', iconKey: 'hotpot', weight: 2 },
      { name: '烤鱼', iconKey: 'sichuan', weight: 1 },
    ]);
    assert.ok(share.shareCode.length >= 8);

    // Expired row was pruned during createShare
    const expiredRow = store.db
      .prepare('SELECT 1 FROM shared_menus WHERE share_code = ?')
      .get('expired1');
    assert.equal(expiredRow, undefined);

    // Also test getShare rejecting stale rows directly
    store.db
      .prepare(
        'INSERT INTO shared_menus (share_code, creator_name, menu_name, items_json, created_at) VALUES (?, ?, ?, ?, ?)'
      )
      .run('expired2', '过客', '旧菜单', JSON.stringify([{ name: '包子', iconKey: 'shop', weight: 1 }]), oldIso);
    assert.throws(
      () => store.getShare('expired2'),
      (err) => err instanceof ValidationError && err.status === 404
    );

    const loaded = store.getShare(share.shareCode);
    assert.equal(loaded.creatorName, '小明');
    assert.equal(loaded.menuName, '周末聚餐');
    assert.equal(loaded.items.length, 2);
    assert.equal(loaded.items[0].name, '潮汕牛肉锅');
  });
});

describe('HTTP API anti-abuse & token auth tests', () => {
  let store;
  let server;
  let baseUrl;

  beforeEach(async () => {
    store = createDatabase(':memory:');
    const app = express();
    const secretKey = resolveSigningKey({ AUTH_SECRET: 'http-test-secret' });
    app.use('/api', createApiRouter(store, { secretKey }));
    await new Promise((resolve) => {
      server = app.listen(0, '127.0.0.1', () => {
        const addr = server.address();
        baseUrl = `http://127.0.0.1:${addr.port}`;
        resolve();
      });
    });
  });

  afterEach(async () => {
    await new Promise((resolve) => server.close(resolve));
    store.close();
  });

  it('blocks requests missing X-WTE-Client or triggering honeypot with 403', async () => {
    const noClientRes = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: '脚本用户', pin: '1234' }),
    });
    assert.equal(noClientRes.status, 403);

    const honeypotRes = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-WTE-Client': 'web-v1' },
      body: JSON.stringify({ username: '机器人', pin: '1234', website: 'https://spam.example' }),
    });
    assert.equal(honeypotRes.status, 403);
  });

  it('enforces Bearer token auth on user endpoints and accepts valid token', async () => {
    const loginRes = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-WTE-Client': 'web-v1' },
      body: JSON.stringify({ username: '小王', pin: '2580' }),
    });
    assert.equal(loginRes.status, 200);
    const loginData = await loginRes.json();
    assert.ok(typeof loginData.token === 'string' && loginData.token.includes('.'));
    const menuId = loginData.menus[0].id;

    // Unauthenticated bootstrap -> 401
    const unauthBoot = await fetch(`${baseUrl}/api/users/${encodeURIComponent('小王')}/bootstrap`);
    assert.equal(unauthBoot.status, 401);

    // Unauthenticated write -> 401
    const unauthWrite = await fetch(
      `${baseUrl}/api/users/${encodeURIComponent('小王')}/menus/${menuId}/items`,
      {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'X-WTE-Client': 'web-v1' },
        body: JSON.stringify({ items: [{ name: '被篡改', iconKey: 'shop', weight: 1 }] }),
      }
    );
    assert.equal(unauthWrite.status, 401);

    // Authenticated bootstrap & write -> 200
    const authBoot = await fetch(`${baseUrl}/api/users/${encodeURIComponent('小王')}/bootstrap`, {
      headers: { Authorization: `Bearer ${loginData.token}` },
    });
    assert.equal(authBoot.status, 200);

    const authWrite = await fetch(
      `${baseUrl}/api/users/${encodeURIComponent('小王')}/menus/${menuId}/items`,
      {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'X-WTE-Client': 'web-v1',
          Authorization: `Bearer ${loginData.token}`,
        },
        body: JSON.stringify({ items: [{ name: '黄焖鸡米饭', iconKey: 'fastfood', weight: 2 }] }),
      }
    );
    assert.equal(authWrite.status, 200);
    const updated = await authWrite.json();
    assert.equal(updated.menus[0].items[0].name, '黄焖鸡米饭');
  });
});

describe('Postgres config resolution tests', () => {
  it('prefers DATABASE_URL_POOLED for pooled connections and DATABASE_URL for direct connections', () => {
    const cfg = resolvePostgresConfig({
      DATABASE_URL: 'postgres://user:pass@db.prisma.io:5432/postgres?sslmode=require',
      DATABASE_URL_POOLED: 'postgres://user:pass@pooled.db.prisma.io:5432/postgres?sslmode=require',
      POSTGRES_URL: 'postgres://user:pass@db.prisma.io:5432/postgres?sslmode=require',
      PRISMA_DATABASE_URL: 'postgres://user:pass@db.prisma.io:5432/postgres?sslmode=require',
    });
    assert.equal(
      cfg.connectionString,
      'postgres://user:pass@pooled.db.prisma.io:5432/postgres?sslmode=require'
    );
    assert.equal(
      cfg.directConnectionString,
      'postgres://user:pass@db.prisma.io:5432/postgres?sslmode=require'
    );
  });

  it('skips prisma+postgres:// URLs when postgres:// URL exists and returns null when unset', () => {
    const cfg = resolvePostgresConfig({
      PRISMA_DATABASE_URL: 'prisma+postgres://accelerate.prisma-data.net/?api_key=abc',
      DATABASE_URL: 'postgres://user:pass@db.prisma.io:5432/postgres',
    });
    assert.equal(cfg.connectionString, 'postgres://user:pass@db.prisma.io:5432/postgres');
    assert.equal(resolvePostgresConfig({}), null);
  });
});
