import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { DEFAULT_GUEST_ITEMS } from './constants/foodCatalog.js';
import { MODE_MAP } from './constants/modes.js';
import { apiClient } from './utils/apiClient.js';
import { soundEngine } from './utils/sound.js';
import { DecorBackground } from './components/DecorBackground.jsx';
import { Header } from './components/Header.jsx';
import { MenuSidebar } from './components/MenuSidebar.jsx';
import { ConfettiCanvas } from './components/ConfettiCanvas.jsx';
import { WheelMode } from './components/modes/WheelMode.jsx';
import { SlotMode } from './components/modes/SlotMode.jsx';
import { DiceGridMode } from './components/modes/DiceGridMode.jsx';
import { GashaponMode } from './components/modes/GashaponMode.jsx';
import { LoginModal } from './components/modals/LoginModal.jsx';
import { ChangePinModal } from './components/modals/ChangePinModal.jsx';
import { ResultModal } from './components/modals/ResultModal.jsx';
import { HistoryModal } from './components/modals/HistoryModal.jsx';
import { ShareBanner } from './components/modals/ShareBanner.jsx';

const LS_USER_KEY = 'wte_current_user';
const LS_RECENT_KEY = 'wte_recent_users';
const LS_GUEST_ITEMS_KEY = 'wte_guest_items';
const LS_GUEST_HISTORY_KEY = 'wte_guest_history';

function readJsonStorage(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function writeJsonStorage(key, val) {
  try {
    localStorage.setItem(key, JSON.stringify(val));
  } catch {
    // ignore
  }
}

function itemsMatchDefault(items) {
  if (items.length !== DEFAULT_GUEST_ITEMS.length) return false;
  return items.every(
    (it, idx) =>
      it.name === DEFAULT_GUEST_ITEMS[idx].name &&
      it.iconKey === DEFAULT_GUEST_ITEMS[idx].iconKey &&
      Number(it.weight || 1) === 1
  );
}

export function App() {
  const [activeMode, setActiveMode] = useState('wheel');
  const [isDrawing, setIsDrawing] = useState(false);
  const [muted, setMuted] = useState(() => soundEngine.isMuted());
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // Auth & User data
  const [username, setUsername] = useState(() => {
    try {
      return localStorage.getItem(LS_USER_KEY) || '';
    } catch {
      return '';
    }
  });
  const [recentUsers, setRecentUsers] = useState(() => readJsonStorage(LS_RECENT_KEY, []));
  const [userMenus, setUserMenus] = useState([]);
  const [activeMenuId, setActiveMenuId] = useState(null);
  const [userHistory, setUserHistory] = useState([]);

  // Guest fallback data
  const [guestItems, setGuestItems] = useState(() =>
    readJsonStorage(LS_GUEST_ITEMS_KEY, DEFAULT_GUEST_ITEMS)
  );
  const [guestHistory, setGuestHistory] = useState(() =>
    readJsonStorage(LS_GUEST_HISTORY_KEY, [])
  );

  // Share preview mode
  const [shareData, setShareData] = useState(null);

  // Round exclusions & draw modal
  const [excludedIds, setExcludedIds] = useState(() => new Set());
  const [winner, setWinner] = useState(null);
  const [confettiActive, setConfettiActive] = useState(false);
  const [replayTrigger, setReplayTrigger] = useState(0);

  // Modals & toast
  const [loginOpen, setLoginOpen] = useState(false);
  const [loginInitialUser, setLoginInitialUser] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [changePinOpen, setChangePinOpen] = useState(false);
  const [changePinLoading, setChangePinLoading] = useState(false);
  const [changePinError, setChangePinError] = useState('');
  const [historyOpen, setHistoryOpen] = useState(false);
  const [toast, setToast] = useState(null);

  const showToast = useCallback((msg) => {
    setToast({ id: Date.now(), msg });
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2800);
    return () => clearTimeout(t);
  }, [toast]);

  const recordRecentUser = useCallback((name) => {
    setRecentUsers((prev) => {
      const next = [name, ...prev.filter((u) => u.toLowerCase() !== name.toLowerCase())].slice(0, 8);
      writeJsonStorage(LS_RECENT_KEY, next);
      return next;
    });
  }, []);

  const applyBootstrap = useCallback(
    (data) => {
      setUsername(data.user.username);
      setUserMenus(data.menus || []);
      setActiveMenuId(data.user.activeMenuId);
      setUserHistory(data.history || []);
      try {
        localStorage.setItem(LS_USER_KEY, data.user.username);
      } catch {
        // ignore
      }
      recordRecentUser(data.user.username);
    },
    [recordRecentUser]
  );

  const handleAuthExpired = useCallback(
    (expiredUsername) => {
      if (expiredUsername) {
        apiClient.removeToken(expiredUsername);
      }
      setUsername('');
      setUserMenus([]);
      setActiveMenuId(null);
      setUserHistory([]);
      try {
        localStorage.removeItem(LS_USER_KEY);
      } catch {
        // ignore
      }
      setLoginError('');
      setLoginInitialUser(expiredUsername || '');
      setLoginOpen(true);
      showToast('登录状态已过期，请重新输入 4 位 PIN 码');
    },
    [showToast]
  );

  // Hydrate saved user on mount
  useEffect(() => {
    if (!username) return;
    if (!apiClient.hasToken(username)) {
      apiClient.removeToken(username);
      setUsername('');
      try {
        localStorage.removeItem(LS_USER_KEY);
      } catch {
        // ignore
      }
      showToast('账号已启用 4 位 PIN 保护，请点击右上角输入 PIN 码解锁');
      return;
    }
    apiClient
      .getBootstrap(username)
      .then(applyBootstrap)
      .catch(() => {
        apiClient.removeToken(username);
        setUsername('');
        try {
          localStorage.removeItem(LS_USER_KEY);
        } catch {
          // ignore
        }
        showToast('账号已启用 4 位 PIN 保护，请点击右上角输入 PIN 码解锁');
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Load ?share=<code> if present
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('share');
    if (!code) return;
    apiClient
      .getShare(code)
      .then((data) => {
        setShareData({
          ...data,
          items: (data.items || []).map((it, idx) => ({
            ...it,
            id: `share-${idx}-${it.name}`,
          })),
        });
      })
      .catch((err) => {
        showToast(err.message || '分享链接无效或已过期');
      });
  }, [showToast]);

  // Persist guest changes
  useEffect(() => {
    writeJsonStorage(LS_GUEST_ITEMS_KEY, guestItems);
  }, [guestItems]);

  useEffect(() => {
    writeJsonStorage(LS_GUEST_HISTORY_KEY, guestHistory);
  }, [guestHistory]);

  const isLoggedIn = Boolean(username);
  const isShareMode = Boolean(shareData);

  const guestMenuObj = useMemo(
    () => ({ id: 'guest-menu', name: '我的菜单', items: guestItems }),
    [guestItems]
  );

  const currentMenus = isLoggedIn ? userMenus : [guestMenuObj];

  const activeMenu = useMemo(() => {
    if (isShareMode) {
      return { id: 'shared', name: shareData.menuName, items: shareData.items };
    }
    if (!isLoggedIn) return guestMenuObj;
    return userMenus.find((m) => m.id === activeMenuId) || userMenus[0] || guestMenuObj;
  }, [isShareMode, shareData, isLoggedIn, guestMenuObj, userMenus, activeMenuId]);

  const currentItems = activeMenu?.items || [];
  const currentHistory = isLoggedIn ? userHistory : guestHistory;
  const hasGuestCustomizations = !itemsMatchDefault(guestItems);

  const handleToggleMute = () => {
    const nextMuted = soundEngine.toggleMute();
    setMuted(nextMuted);
    showToast(nextMuted ? '已静音' : '音效已开启');
  };

  const handleLoginSubmit = async (targetName, pin, shouldImportGuest, website = '') => {
    setLoginLoading(true);
    setLoginError('');
    try {
      const importMenu = shouldImportGuest
        ? {
            name: '我的菜单',
            items: guestItems.map(({ name, iconKey, weight }) => ({
              name,
              iconKey,
              weight: Number(weight) || 1,
            })),
          }
        : null;
      const data = await apiClient.login(targetName, pin, importMenu, website);
      applyBootstrap(data);
      setExcludedIds(new Set());
      setLoginOpen(false);
      setLoginInitialUser('');
      if (data.isNewUser) {
        showToast(`账号创建成功，欢迎 ${data.user.username}！`);
      } else if (data.pinBoundNow) {
        showToast(`已绑定 4 位 PIN 码，欢迎 ${data.user.username}！`);
      } else {
        showToast(`欢迎回来，${data.user.username}！`);
      }
    } catch (err) {
      setLoginError(err.message || '登录失败，请重试');
    } finally {
      setLoginLoading(false);
    }
  };

  const handleQuickSwitchUser = async (targetName) => {
    if (apiClient.hasToken(targetName)) {
      try {
        const data = await apiClient.getBootstrap(targetName);
        applyBootstrap(data);
        setExcludedIds(new Set());
        setLoginOpen(false);
        setLoginInitialUser('');
        showToast(`已切换账号：${data.user.username}`);
        return;
      } catch {
        apiClient.removeToken(targetName);
      }
    }
    setLoginError('');
    setLoginInitialUser(targetName);
    setLoginOpen(true);
  };

  const handleChangePinSubmit = async (currentPin, newPin) => {
    if (!username) return;
    setChangePinLoading(true);
    setChangePinError('');
    try {
      await apiClient.changePin(username, currentPin, newPin);
      setChangePinOpen(false);
      showToast('4 位 PIN 码已更新');
    } catch (err) {
      setChangePinError(err.message || '修改 PIN 码失败，请重试');
    } finally {
      setChangePinLoading(false);
    }
  };

  const handleLogout = () => {
    if (username) {
      apiClient.removeToken(username);
    }
    setUsername('');
    setUserMenus([]);
    setActiveMenuId(null);
    setUserHistory([]);
    setExcludedIds(new Set());
    try {
      localStorage.removeItem(LS_USER_KEY);
    } catch {
      // ignore
    }
    showToast('已退出登录，切回访客菜单');
  };

  const handleSelectMenu = async (menuId) => {
    if (!isLoggedIn) return;
    setActiveMenuId(menuId);
    setExcludedIds(new Set());
    try {
      const data = await apiClient.updateMenuMeta(username, menuId, { setActive: true });
      applyBootstrap(data);
    } catch (err) {
      if (err?.status === 401) {
        handleAuthExpired(username);
        return;
      }
      showToast(err.message || '切换菜单失败');
    }
  };

  const handleCreateMenu = async (name) => {
    if (!isLoggedIn) {
      setLoginError('');
      setLoginInitialUser('');
      setLoginOpen(true);
      return;
    }
    try {
      const data = await apiClient.createMenu(username, name);
      applyBootstrap(data);
      setExcludedIds(new Set());
      showToast(`已新建菜单「${name}」`);
    } catch (err) {
      if (err?.status === 401) {
        handleAuthExpired(username);
        return;
      }
      showToast(err.message || '创建菜单失败');
    }
  };

  const handleRenameMenu = async (menuId, name) => {
    if (!isLoggedIn) return;
    try {
      const data = await apiClient.updateMenuMeta(username, menuId, { name });
      applyBootstrap(data);
      showToast('菜单名称已更新');
    } catch (err) {
      if (err?.status === 401) {
        handleAuthExpired(username);
        return;
      }
      showToast(err.message || '重命名失败');
    }
  };

  const handleDeleteMenu = async (menuId) => {
    if (!isLoggedIn) return;
    try {
      const data = await apiClient.deleteMenu(username, menuId);
      applyBootstrap(data);
      setExcludedIds(new Set());
      showToast('已删除菜单');
    } catch (err) {
      if (err?.status === 401) {
        handleAuthExpired(username);
        return;
      }
      showToast(err.message || '删除失败');
    }
  };

  const handleUpdateItems = async (nextItems) => {
    if (isShareMode) return;
    if (!isLoggedIn) {
      setGuestItems(nextItems);
      return;
    }
    if (!activeMenu) return;
    // Optimistic update
    setUserMenus((prev) =>
      prev.map((m) => (m.id === activeMenu.id ? { ...m, items: nextItems } : m))
    );
    try {
      const payload = nextItems.map(({ name, iconKey, weight }) => ({
        name,
        iconKey,
        weight: Number(weight) || 1,
      }));
      const data = await apiClient.replaceMenuItems(username, activeMenu.id, payload);
      applyBootstrap(data);
    } catch (err) {
      if (err?.status === 401) {
        handleAuthExpired(username);
        return;
      }
      showToast(err.message || '保存菜单失败');
    }
  };

  const handleResetDefault = () => {
    const resetCopy = DEFAULT_GUEST_ITEMS.map((it, idx) => ({
      ...it,
      id: `default-${Date.now()}-${idx}`,
    }));
    setExcludedIds(new Set());
    handleUpdateItems(resetCopy);
    showToast('已恢复默认 8 项菜品');
  };

  const recordDraw = async (item, status = 'picked') => {
    const entry = {
      menuName: activeMenu?.name || '我的菜单',
      itemName: item.name,
      iconKey: item.iconKey,
      mode: activeMode,
      status,
    };
    if (isLoggedIn) {
      try {
        const res = await apiClient.addHistory(username, entry);
        setUserHistory(res.history || []);
      } catch {
        // ignore history save error
      }
    } else {
      setGuestHistory((prev) =>
        [
          { id: `gh-${Date.now()}`, ...entry, createdAt: new Date().toISOString() },
          ...prev,
        ].slice(0, 100)
      );
    }
  };

  const handleStartDraw = () => {
    setIsDrawing(true);
    setConfettiActive(false);
  };

  const handleDrawComplete = (pickedItem) => {
    setIsDrawing(false);
    setWinner(pickedItem);
    setConfettiActive(true);
  };

  const handleDismissWinner = () => {
    setWinner(null);
    setConfettiActive(false);
  };

  const handleAcceptWinner = () => {
    if (winner) {
      recordDraw(winner, 'picked');
      showToast(`就决定吃「${winner.name}」啦！`);
    }
    setWinner(null);
    setConfettiActive(false);
  };

  const handleRedraw = () => {
    setWinner(null);
    setConfettiActive(false);
    setTimeout(() => {
      setReplayTrigger((n) => n + 1);
    }, 80);
  };

  const handleExcludeAndRedraw = () => {
    if (!winner) return;
    const excludedWinner = winner;
    setExcludedIds((prev) => {
      const next = new Set(prev);
      next.add(excludedWinner.id);
      return next;
    });
    recordDraw(excludedWinner, 'excluded');
    setWinner(null);
    setConfettiActive(false);
    showToast(`已暂排「${excludedWinner.name}」，马上重抽`);
    setTimeout(() => {
      setReplayTrigger((n) => n + 1);
    }, 100);
  };

  const handleRestoreExcluded = (specificId = null) => {
    if (typeof specificId === 'string' || typeof specificId === 'number') {
      setExcludedIds((prev) => {
        const next = new Set(prev);
        next.delete(specificId);
        return next;
      });
    } else {
      setExcludedIds(new Set());
      showToast('已恢复所有暂排选项');
    }
  };

  const handleClearHistory = async () => {
    if (isLoggedIn) {
      try {
        await apiClient.clearHistory(username);
        setUserHistory([]);
      } catch (err) {
        if (err?.status === 401) {
          handleAuthExpired(username);
          return;
        }
        showToast('清空失败');
      }
    } else {
      setGuestHistory([]);
    }
  };

  const handleShareMenu = async () => {
    if (currentItems.length === 0) return;
    try {
      const res = await apiClient.createShare(
        username || '热心干饭人',
        activeMenu?.name || '我的菜单',
        currentItems.map(({ name, iconKey, weight }) => ({
          name,
          iconKey,
          weight: Number(weight) || 1,
        }))
      );
      const url = `${window.location.origin}/?share=${res.shareCode}`;
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
        showToast('分享链接已复制到剪贴板，快发给朋友一起抽！');
      } else {
        showToast(`分享链接已生成：?share=${res.shareCode}`);
      }
    } catch (err) {
      showToast(err.message || '生成分享链接失败');
    }
  };

  const clearShareUrlParam = () => {
    const url = new URL(window.location.href);
    url.searchParams.delete('share');
    window.history.replaceState({}, '', url.pathname + url.search);
    setShareData(null);
    setExcludedIds(new Set());
  };

  const handleSaveShareToMine = async () => {
    if (!shareData) return;
    const cleanItems = shareData.items.map(({ name, iconKey, weight }) => ({
      name,
      iconKey,
      weight: Number(weight) || 1,
    }));
    if (isLoggedIn) {
      try {
        const data = await apiClient.createMenu(username, shareData.menuName, cleanItems);
        applyBootstrap(data);
        clearShareUrlParam();
        showToast(`已将「${shareData.menuName}」保存到你的账号！`);
      } catch (err) {
        if (err?.status === 401) {
          handleAuthExpired(username);
          return;
        }
        showToast(err.message || '保存分享菜单失败');
      }
    } else {
      setGuestItems(
        cleanItems.map((it, idx) => ({ ...it, id: `saved-${Date.now()}-${idx}` }))
      );
      clearShareUrlParam();
      showToast('已保存到你的本地菜单！');
    }
  };

  const activeRemainingCount = currentItems.filter((it) => !excludedIds.has(it.id)).length;

  return (
    <div className="relative min-h-screen w-full overflow-x-hidden flex flex-col">
      <DecorBackground sidebarCollapsed={sidebarCollapsed} />
      <ConfettiCanvas active={confettiActive} />

      <Header
        activeMode={activeMode}
        onSelectMode={(m) => {
          if (!isDrawing) setActiveMode(m);
        }}
        isDrawing={isDrawing}
        username={username}
        recentUsers={recentUsers}
        muted={muted}
        onToggleMute={handleToggleMute}
        onOpenLogin={() => {
          setLoginError('');
          setLoginInitialUser('');
          setLoginOpen(true);
        }}
        onOpenChangePin={() => {
          setChangePinError('');
          setChangePinOpen(true);
        }}
        onQuickSwitchUser={handleQuickSwitchUser}
        onLogout={handleLogout}
        onOpenHistory={() => setHistoryOpen(true)}
        onShareMenu={handleShareMenu}
      />

      <main
        className={`relative z-10 flex-1 flex flex-col items-center justify-center px-4 pt-3 pb-20 md:pb-8 transition-all duration-300 ${
          sidebarCollapsed ? 'md:pr-4' : 'md:pr-[296px] lg:pr-[356px]'
        }`}
      >
        <ShareBanner
          shareData={shareData}
          onSaveToMine={handleSaveShareToMine}
          onExitShare={clearShareUrlParam}
        />

        {/* Central Hero Title with Yellow Spark Rays */}
        <div className="text-center mb-4 sm:mb-6 select-none">
          <div className="inline-flex items-center justify-center gap-3 sm:gap-4">
            {/* Left 3 yellow rays */}
            <svg width="34" height="32" viewBox="0 0 34 32" className="w-7 h-7 sm:w-8 sm:h-8">
              <path d="M28 8 L14 3" stroke="#FBBF24" strokeWidth="4" strokeLinecap="round" />
              <path d="M26 16 L8 15" stroke="#FBBF24" strokeWidth="4" strokeLinecap="round" />
              <path d="M28 24 L15 29" stroke="#FBBF24" strokeWidth="4" strokeLinecap="round" />
            </svg>
            <h1 className="text-3xl sm:text-4xl lg:text-[42px] font-black text-[#261E3C] tracking-tight">
              今天吃什么？
            </h1>
            {/* Right 3 yellow rays */}
            <svg width="34" height="32" viewBox="0 0 34 32" className="w-7 h-7 sm:w-8 sm:h-8">
              <path d="M6 8 L20 3" stroke="#FBBF24" strokeWidth="4" strokeLinecap="round" />
              <path d="M8 16 L26 15" stroke="#FBBF24" strokeWidth="4" strokeLinecap="round" />
              <path d="M6 24 L19 29" stroke="#FBBF24" strokeWidth="4" strokeLinecap="round" />
            </svg>
          </div>
          <p className="mt-1.5 text-sm sm:text-base font-medium text-[#5C5376]">
            {MODE_MAP[activeMode]?.subtitle || '转一转，决定今天吃什么！'}
          </p>
        </div>

        {/* Active Draw Stage */}
        <div className="w-full flex items-center justify-center">
          {activeMode === 'wheel' && (
            <WheelMode
              items={currentItems}
              excludedIds={excludedIds}
              isDrawing={isDrawing}
              onStartDraw={handleStartDraw}
              onDrawComplete={handleDrawComplete}
              replayTrigger={replayTrigger}
            />
          )}
          {activeMode === 'slot' && (
            <SlotMode
              items={currentItems}
              excludedIds={excludedIds}
              isDrawing={isDrawing}
              onStartDraw={handleStartDraw}
              onDrawComplete={handleDrawComplete}
              replayTrigger={replayTrigger}
            />
          )}
          {activeMode === 'dice' && (
            <DiceGridMode
              items={currentItems}
              excludedIds={excludedIds}
              isDrawing={isDrawing}
              onStartDraw={handleStartDraw}
              onDrawComplete={handleDrawComplete}
              replayTrigger={replayTrigger}
            />
          )}
          {activeMode === 'gashapon' && (
            <GashaponMode
              items={currentItems}
              excludedIds={excludedIds}
              isDrawing={isDrawing}
              onStartDraw={handleStartDraw}
              onDrawComplete={handleDrawComplete}
              replayTrigger={replayTrigger}
            />
          )}
        </div>
      </main>

      <MenuSidebar
        menus={currentMenus}
        activeMenu={activeMenu}
        items={currentItems}
        excludedIds={excludedIds}
        isLoggedIn={isLoggedIn}
        isShareMode={isShareMode}
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed((c) => !c)}
        onSelectMenu={handleSelectMenu}
        onCreateMenu={handleCreateMenu}
        onRenameMenu={handleRenameMenu}
        onDeleteMenu={handleDeleteMenu}
        onUpdateItems={handleUpdateItems}
        onResetDefault={handleResetDefault}
        onRestoreExcluded={handleRestoreExcluded}
        onRequireLogin={() => {
          setLoginError('');
          setLoginInitialUser('');
          setLoginOpen(true);
        }}
      />

      <LoginModal
        open={loginOpen}
        initialUsername={loginInitialUser}
        recentUsers={recentUsers}
        hasGuestCustomizations={hasGuestCustomizations}
        loading={loginLoading}
        error={loginError}
        onClearError={() => setLoginError('')}
        onClose={() => {
          setLoginOpen(false);
          setLoginInitialUser('');
        }}
        onQuickSwitchRecent={handleQuickSwitchUser}
        onSubmit={handleLoginSubmit}
      />

      <ChangePinModal
        open={changePinOpen}
        username={username}
        loading={changePinLoading}
        error={changePinError}
        onClearError={() => setChangePinError('')}
        onClose={() => setChangePinOpen(false)}
        onSubmit={handleChangePinSubmit}
      />

      <ResultModal
        winner={winner}
        canExcludeAndRedraw={activeRemainingCount > 1}
        onClose={handleDismissWinner}
        onAccept={handleAcceptWinner}
        onRedraw={handleRedraw}
        onExcludeAndRedraw={handleExcludeAndRedraw}
      />

      <HistoryModal
        open={historyOpen}
        history={currentHistory}
        onClose={() => setHistoryOpen(false)}
        onClear={handleClearHistory}
      />

      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-5 py-2.5 rounded-full bg-[#2D2346]/90 text-white text-xs sm:text-sm font-semibold shadow-xl backdrop-blur-md animate-popIn">
          {toast.msg}
        </div>
      )}
    </div>
  );
}

export default App;
