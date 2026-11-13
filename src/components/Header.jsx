import React, { useEffect, useRef, useState } from 'react';
import { DRAW_MODES } from '../constants/modes.js';

const ACTIVE_GRADIENT = { background: 'linear-gradient(135deg, #9333EA 0%, #7C3AED 100%)' };

function ModeIcon({ modeId, active, className = 'w-3.5 h-3.5 lg:w-[18px] lg:h-[18px] shrink-0' }) {
  const stroke = active ? '#FFFFFF' : '#5B4B8A';
  switch (modeId) {
    case 'wheel':
      return (
        <svg viewBox="0 0 24 24" fill="none" className={className}>
          <circle cx="12" cy="12" r="9" stroke={stroke} strokeWidth="2" />
          <path
            d="M12 3v18M3 12h18M5.6 5.6l12.8 12.8M18.4 5.6L5.6 18.4"
            stroke={stroke}
            strokeWidth="1.6"
          />
          <circle cx="12" cy="12" r="2.2" fill={stroke} />
        </svg>
      );
    case 'slot':
      return (
        <svg viewBox="0 0 24 24" fill="none" className={className}>
          <rect x="3" y="6" width="18" height="12" rx="3" stroke={stroke} strokeWidth="2" />
          <path d="M9 6v12M15 6v12" stroke={stroke} strokeWidth="1.5" />
          <path d="M5.5 10h2l-1 4M11.2 10h2l-1 4M16.8 10h2l-1 4" stroke={stroke} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case 'dice':
      return (
        <svg viewBox="0 0 24 24" fill="none" className={className}>
          <rect x="3" y="4" width="11" height="11" rx="2.5" stroke={stroke} strokeWidth="1.9" />
          <circle cx="6.5" cy="7.5" r="1" fill={stroke} />
          <circle cx="10.5" cy="11.5" r="1" fill={stroke} />
          <rect x="10" y="9" width="11" height="11" rx="2.5" stroke={stroke} strokeWidth="1.9" fill={active ? '#7C3AED' : '#FFFFFF'} />
          <circle cx="13.5" cy="12.5" r="1" fill={stroke} />
          <circle cx="17.5" cy="16.5" r="1" fill={stroke} />
          <circle cx="15.5" cy="14.5" r="1" fill={stroke} />
        </svg>
      );
    case 'gashapon':
    default:
      return (
        <svg viewBox="0 0 24 24" fill="none" className={className}>
          <circle cx="12" cy="12" r="8.5" stroke={stroke} strokeWidth="2" />
          <path d="M3.8 12h16.4" stroke={stroke} strokeWidth="1.8" />
          <circle cx="12" cy="12" r="2.2" fill={active ? '#7C3AED' : '#FFFFFF'} stroke={stroke} strokeWidth="1.8" />
        </svg>
      );
  }
}

export function Header({
  activeMode,
  onSelectMode,
  isDrawing,
  username,
  recentUsers,
  muted,
  onToggleMute,
  onOpenLogin,
  onOpenChangePin,
  onQuickSwitchUser,
  onLogout,
  onOpenHistory,
  onShareMenu,
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [maxInlineSlots, setMaxInlineSlots] = useState(4);
  const dropdownRef = useRef(null);
  const navRef = useRef(null);

  useEffect(() => {
    const handleOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setMenuOpen(false);
      }
      if (navRef.current && !navRef.current.contains(e.target)) {
        setMoreOpen(false);
      }
    };
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setMoreOpen(false);
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  useEffect(() => {
    if (isDrawing) {
      setMoreOpen(false);
    }
  }, [isDrawing]);

  useEffect(() => {
    const navEl = navRef.current;
    if (!navEl) return undefined;

    const recalcSlots = () => {
      const width = navEl.clientWidth;
      if (!width) return;
      const vw = window.innerWidth;
      const isDesktopLg = vw >= 1024;
      const isSmallPhone = vw < 640;
      const minPill = isDesktopLg ? 104 : isSmallPhone ? 77 : 80;
      const baseOverhead = isDesktopLg ? 36 : isSmallPhone ? 14 : 16;
      const chevronExtra = isDesktopLg ? 18 : 16;
      const maxCap = isDesktopLg ? 5 : 4;
      const rawFit = Math.max(2, Math.floor((width - baseOverhead) / minPill));
      const willOverflow = DRAW_MODES.length > Math.min(maxCap, rawFit);
      const fitCount = willOverflow
        ? Math.max(2, Math.floor((width - baseOverhead - chevronExtra) / minPill))
        : rawFit;
      const slots = Math.min(maxCap, fitCount);
      setMaxInlineSlots((prev) => (prev === slots ? prev : slots));
    };

    recalcSlots();
    let observer;
    if (typeof ResizeObserver !== 'undefined') {
      observer = new ResizeObserver(recalcSlots);
      observer.observe(navEl);
    }
    window.addEventListener('resize', recalcSlots);
    return () => {
      observer?.disconnect();
      window.removeEventListener('resize', recalcSlots);
    };
  }, []);

  const otherRecentUsers = recentUsers.filter(
    (u) => u.toLowerCase() !== (username || '').toLowerCase()
  );

  const hasOverflow = DRAW_MODES.length > maxInlineSlots;
  const visibleModes = hasOverflow ? DRAW_MODES.slice(0, maxInlineSlots - 1) : DRAW_MODES;
  const overflowModes = hasOverflow ? DRAW_MODES.slice(maxInlineSlots - 1) : [];
  const activeOverflowMode = overflowModes.find((m) => m.id === activeMode) || null;

  return (
    <header className="relative z-30 w-full px-3 sm:px-4 lg:px-8 pt-3 sm:pt-4">
      <div className="max-w-[1380px] mx-auto bg-white/90 backdrop-blur-md rounded-[22px] border border-white/95 shadow-[0_6px_24px_rgba(124,58,237,0.08)] px-3 sm:px-4 lg:px-5 py-2 flex flex-wrap md:flex-nowrap items-center justify-between gap-2">
        {/* Left Brand Logo */}
        <div className="flex items-center gap-2 shrink-0">
          <svg width="26" height="26" viewBox="0 0 32 32" fill="none" className="shrink-0">
            <path
              d="M5 15h22c0 6.8-4.8 11.5-11 11.5S5 21.8 5 15z"
              stroke="#7C3AED"
              strokeWidth="2.4"
              strokeLinejoin="round"
            />
            <path d="M11 26.5h10" stroke="#7C3AED" strokeWidth="2.4" strokeLinecap="round" />
            <path
              d="M12 10.5c0-1.8 1.4-2.2 1.4-3.8M16 10.5c0-1.8 1.4-2.2 1.4-3.8M20 10.5c0-1.8 1.4-2.2 1.4-3.8"
              stroke="#8B5CF6"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
          <span className="font-bold text-base lg:text-lg text-[#2D2346] tracking-tight whitespace-nowrap">
            今天吃什么？
          </span>
        </div>

        {/* Center Adaptive Segmented Mode Switcher (zero scrollbar + auto overflow popover) */}
        <nav
          ref={navRef}
          aria-label="抽取模式切换"
          className="order-3 md:order-2 w-full md:flex-1 flex items-center justify-center min-w-0 lg:px-2 relative"
        >
          <div className="w-full md:w-auto flex md:inline-flex items-center gap-0.5 lg:gap-1 bg-[#F4F1FD] p-1 rounded-full border border-purple-100/80 max-w-full no-scrollbar">
            {visibleModes.map((mode) => {
              const active = activeMode === mode.id;
              return (
                <button
                  key={mode.id}
                  type="button"
                  disabled={isDrawing}
                  onClick={() => {
                    setMoreOpen(false);
                    onSelectMode(mode.id);
                  }}
                  className={`flex-auto md:flex-initial flex items-center justify-center gap-1 lg:gap-1.5 px-1.5 lg:px-3.5 py-1.5 rounded-full text-[11px] sm:text-xs lg:text-sm font-semibold whitespace-nowrap min-w-0 transition-all duration-200 ${
                    active
                      ? 'text-white shadow-[0_4px_14px_rgba(124,58,237,0.38)]'
                      : 'text-[#4B3F6B] hover:bg-white/75'
                  } ${isDrawing ? 'opacity-70 cursor-not-allowed' : 'cursor-pointer'}`}
                  style={active ? ACTIVE_GRADIENT : undefined}
                >
                  <ModeIcon modeId={mode.id} active={active} />
                  <span className="truncate">{mode.label}</span>
                </button>
              );
            })}

            {hasOverflow && (
              <button
                type="button"
                disabled={isDrawing}
                aria-expanded={moreOpen}
                aria-haspopup="true"
                onClick={() => setMoreOpen((v) => !v)}
                className={`flex-auto md:flex-initial flex items-center justify-center gap-1 lg:gap-1.5 px-1.5 lg:px-3.5 py-1.5 rounded-full text-[11px] sm:text-xs lg:text-sm font-semibold whitespace-nowrap min-w-0 transition-all duration-200 ${
                  activeOverflowMode
                    ? 'text-white shadow-[0_4px_14px_rgba(124,58,237,0.38)]'
                    : moreOpen
                    ? 'bg-white text-purple-700 shadow-sm'
                    : 'text-[#4B3F6B] hover:bg-white/75'
                } ${isDrawing ? 'opacity-70 cursor-not-allowed' : 'cursor-pointer'}`}
                style={activeOverflowMode ? ACTIVE_GRADIENT : undefined}
              >
                {activeOverflowMode ? (
                  <>
                    <ModeIcon modeId={activeOverflowMode.id} active={true} />
                    <span className="truncate">{activeOverflowMode.label}</span>
                  </>
                ) : (
                  <>
                    <svg viewBox="0 0 24 24" fill="none" className="w-3.5 h-3.5 lg:w-[18px] lg:h-[18px] shrink-0">
                      <rect x="4" y="4" width="6.5" height="6.5" rx="1.5" stroke="#5B4B8A" strokeWidth="1.9" />
                      <rect x="13.5" y="4" width="6.5" height="6.5" rx="1.5" stroke="#5B4B8A" strokeWidth="1.9" />
                      <rect x="4" y="13.5" width="6.5" height="6.5" rx="1.5" stroke="#5B4B8A" strokeWidth="1.9" />
                      <rect x="13.5" y="13.5" width="6.5" height="6.5" rx="1.5" stroke="#5B4B8A" strokeWidth="1.9" />
                    </svg>
                    <span className="truncate">更多</span>
                  </>
                )}
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.4"
                  className={`shrink-0 transition-transform duration-200 ${moreOpen ? 'rotate-180' : ''}`}
                >
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </button>
            )}
          </div>

          {/* Overflow 2xN Mode Card Popover */}
          {moreOpen && hasOverflow && (
            <div className="absolute left-1/2 -translate-x-1/2 top-full mt-2 w-[min(calc(100vw-28px),360px)] z-50">
              <div className="rounded-2xl bg-white/95 backdrop-blur-md shadow-[0_18px_44px_rgba(109,40,217,0.22)] border border-purple-100 p-3 animate-popIn">
                <div className="flex items-center justify-between px-1 mb-2.5">
                  <span className="text-xs font-bold text-[#2D2346]">选择抽取玩法</span>
                  <span className="text-[11px] font-medium text-purple-400">
                    共 {DRAW_MODES.length} 种
                  </span>
                </div>
                <div className="grid grid-cols-1 min-[330px]:grid-cols-2 gap-2">
                {DRAW_MODES.map((mode) => {
                  const active = activeMode === mode.id;
                  return (
                    <button
                      key={mode.id}
                      type="button"
                      disabled={isDrawing}
                      onClick={() => {
                        onSelectMode(mode.id);
                        setMoreOpen(false);
                      }}
                      className={`text-left p-2.5 rounded-xl border transition-all flex flex-col gap-1.5 cursor-pointer ${
                        active
                          ? 'bg-[#F6F1FF] border-purple-400 shadow-[0_4px_14px_rgba(124,58,237,0.14)]'
                          : 'bg-[#FAF8FF] hover:bg-purple-50/90 border-purple-100/80'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-1.5">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span
                            className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                              active ? 'text-white shadow-sm' : 'bg-white border border-purple-100'
                            }`}
                            style={active ? ACTIVE_GRADIENT : undefined}
                          >
                            <ModeIcon modeId={mode.id} active={active} className="w-4 h-4" />
                          </span>
                          <span className="text-xs font-bold text-[#2D2346] truncate">
                            {mode.label}
                          </span>
                        </div>
                        {active && (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-purple-600 text-white shrink-0">
                            当前
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] leading-snug text-gray-500 line-clamp-2">
                        {mode.subtitle}
                      </p>
                    </button>
                  );
                })}
                </div>
              </div>
            </div>
          )}
        </nav>

        {/* Right Utility Controls + User Capsule */}
        <div className="order-2 md:order-3 flex items-center gap-1.5 lg:gap-2 shrink-0">
          {/* Mute toggle */}
          <button
            type="button"
            onClick={onToggleMute}
            title={muted ? '开启音效' : '静音'}
            aria-label={muted ? '开启音效' : '静音'}
            className="w-9 h-9 rounded-full bg-[#F6F3FF] hover:bg-[#EDE6FE] flex items-center justify-center text-[#5B4B8A] border border-purple-100/70 transition-transform hover:scale-105 cursor-pointer"
          >
            {muted ? (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M11 5L6 9H2v6h4l5 4V5z" />
                <line x1="23" y1="9" x2="17" y2="15" />
                <line x1="17" y1="9" x2="23" y2="15" />
              </svg>
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M11 5L6 9H2v6h4l5 4V5z" />
                <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
                <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
              </svg>
            )}
          </button>

          {/* Share menu button */}
          <button
            type="button"
            onClick={onShareMenu}
            title="分享当前菜单给朋友"
            aria-label="分享当前菜单"
            className="w-9 h-9 rounded-full bg-[#F6F3FF] hover:bg-[#EDE6FE] flex items-center justify-center text-[#5B4B8A] border border-purple-100/70 transition-transform hover:scale-105 cursor-pointer"
          >
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="18" cy="5" r="3" />
              <circle cx="6" cy="12" r="3" />
              <circle cx="18" cy="19" r="3" />
              <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
              <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
            </svg>
          </button>

          {/* User capsule + dropdown */}
          <div className="relative" ref={dropdownRef}>
            <button
              type="button"
              onClick={() => setMenuOpen((v) => !v)}
              className="flex items-center gap-1.5 lg:gap-2 px-2.5 lg:px-3.5 py-1.5 rounded-full bg-[#F6F3FF] hover:bg-[#EDE6FE] text-[#3B2E58] font-semibold text-xs lg:text-sm border border-purple-100/70 transition-all cursor-pointer"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6D28D9" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
              <span className="max-w-[96px] truncate">
                {username || '登录 / 定制'}
              </span>
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#6B7280"
                strokeWidth="2.2"
                className={`transition-transform duration-200 ${menuOpen ? 'rotate-180' : ''}`}
              >
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </button>

            {menuOpen && (
              <div className="absolute right-0 mt-2 w-56 rounded-2xl bg-white shadow-[0_14px_38px_rgba(109,40,217,0.18)] border border-purple-100 py-2 z-50 animate-popIn">
                <div className="px-3.5 py-2 border-b border-purple-50">
                  <p className="text-[11px] text-purple-400 font-medium">
                    {username ? '当前已登录账号（云端同步）' : '当前为访客模式'}
                  </p>
                  <p className="text-sm font-bold text-[#2D2346] truncate mt-0.5">
                    {username || '试玩默认菜单中'}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    onOpenLogin();
                  }}
                  className="w-full text-left px-3.5 py-2 text-sm font-medium text-[#3B2E58] hover:bg-purple-50 flex items-center gap-2 cursor-pointer"
                >
                  <span>✨</span>
                  <span>{username ? '切换 / 输入新用户名' : '输入用户名登录保存'}</span>
                </button>

                {otherRecentUsers.length > 0 && (
                  <div className="px-3.5 py-1.5 border-t border-purple-50">
                    <p className="text-[11px] text-gray-400 mb-1">最近登录</p>
                    <div className="flex flex-wrap gap-1">
                      {otherRecentUsers.slice(0, 4).map((u) => (
                        <button
                          key={u}
                          type="button"
                          onClick={() => {
                            setMenuOpen(false);
                            onQuickSwitchUser(u);
                          }}
                          className="text-xs px-2 py-0.5 rounded-full bg-purple-50 hover:bg-purple-100 text-purple-700 font-medium cursor-pointer"
                        >
                          {u}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    onOpenHistory();
                  }}
                  className="w-full text-left px-3.5 py-2 text-sm font-medium text-[#3B2E58] hover:bg-purple-50 flex items-center gap-2 border-t border-purple-50 cursor-pointer"
                >
                  <span>📜</span>
                  <span>抽取历史记录</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    onShareMenu();
                  }}
                  className="w-full text-left px-3.5 py-2 text-sm font-medium text-[#3B2E58] hover:bg-purple-50 flex items-center gap-2 cursor-pointer"
                >
                  <span>🔗</span>
                  <span>分享当前菜单</span>
                </button>

                {username && (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        setMenuOpen(false);
                        onOpenChangePin?.();
                      }}
                      className="w-full text-left px-3.5 py-2 text-sm font-medium text-[#3B2E58] hover:bg-purple-50 flex items-center gap-2 border-t border-purple-50 cursor-pointer"
                    >
                      <span>🔐</span>
                      <span>修改 4 位 PIN 码</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setMenuOpen(false);
                        onLogout();
                      }}
                      className="w-full text-left px-3.5 py-2 text-sm font-medium text-rose-500 hover:bg-rose-50 flex items-center gap-2 border-t border-purple-50 cursor-pointer"
                    >
                      <span>🚪</span>
                      <span>退出登录（切回访客）</span>
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
