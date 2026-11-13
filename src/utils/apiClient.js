const LS_TOKENS_KEY = 'wte_auth_tokens';

function readTokenMap() {
  try {
    const raw = localStorage.getItem(LS_TOKENS_KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function writeTokenMap(map) {
  try {
    localStorage.setItem(LS_TOKENS_KEY, JSON.stringify(map));
  } catch {
    // ignore storage errors
  }
}

function normalizeTokenKey(username) {
  return String(username || '').trim().toLowerCase();
}

export function getToken(username) {
  const key = normalizeTokenKey(username);
  if (!key) return '';
  return readTokenMap()[key] || '';
}

export function setToken(username, token) {
  const key = normalizeTokenKey(username);
  if (!key || !token) return;
  const map = readTokenMap();
  map[key] = token;
  writeTokenMap(map);
}

export function removeToken(username) {
  const key = normalizeTokenKey(username);
  if (!key) return;
  const map = readTokenMap();
  if (key in map) {
    delete map[key];
    writeTokenMap(map);
  }
}

export function hasToken(username) {
  return Boolean(getToken(username));
}

async function request(url, { authUser, headers, ...options } = {}) {
  const mergedHeaders = {
    'Content-Type': 'application/json',
    'X-WTE-Client': 'web-v1',
    ...(headers || {}),
  };
  if (authUser) {
    const token = getToken(authUser);
    if (token) {
      mergedHeaders.Authorization = `Bearer ${token}`;
    }
  }

  const res = await fetch(url, {
    headers: mergedHeaders,
    ...options,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.error || `请求失败 (${res.status})`);
    err.status = res.status;
    throw err;
  }
  return data;
}

export const apiClient = {
  getToken,
  setToken,
  removeToken,
  hasToken,

  getAuthStatus(username) {
    return request(`/api/auth/status?username=${encodeURIComponent(username)}`);
  },

  async login(username, pin, importMenu = null, website = '') {
    const data = await request('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, pin, importMenu, website }),
    });
    if (data?.token && data?.user?.username) {
      setToken(data.user.username, data.token);
    }
    return data;
  },

  async changePin(username, currentPin, newPin, website = '') {
    const data = await request(`/api/users/${encodeURIComponent(username)}/pin`, {
      method: 'POST',
      authUser: username,
      body: JSON.stringify({ currentPin, newPin, website }),
    });
    if (data?.token) {
      setToken(data.username || username, data.token);
    }
    return data;
  },

  getBootstrap(username) {
    return request(`/api/users/${encodeURIComponent(username)}/bootstrap`, {
      authUser: username,
    });
  },

  createMenu(username, name, items = null) {
    return request(`/api/users/${encodeURIComponent(username)}/menus`, {
      method: 'POST',
      authUser: username,
      body: JSON.stringify({ name, items }),
    });
  },

  updateMenuMeta(username, menuId, payload) {
    return request(`/api/users/${encodeURIComponent(username)}/menus/${menuId}`, {
      method: 'PATCH',
      authUser: username,
      body: JSON.stringify(payload),
    });
  },

  replaceMenuItems(username, menuId, items) {
    return request(`/api/users/${encodeURIComponent(username)}/menus/${menuId}/items`, {
      method: 'PUT',
      authUser: username,
      body: JSON.stringify({ items }),
    });
  },

  deleteMenu(username, menuId) {
    return request(`/api/users/${encodeURIComponent(username)}/menus/${menuId}`, {
      method: 'DELETE',
      authUser: username,
    });
  },

  addHistory(username, record) {
    return request(`/api/users/${encodeURIComponent(username)}/history`, {
      method: 'POST',
      authUser: username,
      body: JSON.stringify(record),
    });
  },

  clearHistory(username) {
    return request(`/api/users/${encodeURIComponent(username)}/history`, {
      method: 'DELETE',
      authUser: username,
    });
  },

  createShare(creatorName, menuName, items, website = '') {
    return request('/api/shares', {
      method: 'POST',
      body: JSON.stringify({ creatorName, menuName, items, website }),
    });
  },

  getShare(shareCode) {
    return request(`/api/shares/${encodeURIComponent(shareCode)}`);
  },
};
