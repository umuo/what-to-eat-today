import React, { useEffect, useRef, useState } from 'react';
import { DRAW_MODES } from '../constants/modes.js';

function ModeIcon({ modeId, active }) {
  const stroke = active ? '#FFFFFF' : '#5B4B8A';
  switch (modeId) {
    case 'wheel':
      return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
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
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
          <rect x="3" y="6" width="18" height="12" rx="3" stroke={stroke} strokeWidth="2" />
          <path d="M9 6v12M15 6v12" stroke={stroke} strokeWidth="1.5" />
          <path d="M5.5 10h2l-1 4M11.2 10h2l-1 4M16.8 10h2l-1 4" stroke={stroke} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case 'dice':
      return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
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
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
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
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, []);

  const otherRecentUsers = recentUsers.filter(
    (u) => u.toLowerCase() !== (username || '').toLowerCase()
  );

  return (
    <header className="relative z-30 w-full px-3 sm:px-5 lg:px-8 pt-3 sm:pt-4">
      <div className="max-w-[1380px] mx-auto bg-white/90 backdrop-blur-md rounded-[22px] border border-white/95 shadow-[0_6px_24px_rgba(124,58,237,0.08)] px-3.5 sm:px-5 py-2 flex flex-wrap md:flex-nowrap items-center justify-between gap-2">
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
          <span className="font-bold text-base sm:text-lg text-[#2D2346] tracking-tight whitespace-nowrap">
            今天吃什么？
          </span>
        </div>

        {/* Center Segmented Mode Switcher */}
        <nav
          aria-label="抽取模式切换"
          className="order-3 md:order-2 w-full md:w-auto flex items-center justify-center min-w-0"
        >
          <div className="flex items-center gap-0.5 lg:gap-1 bg-[#F4F1FD] p-1 rounded-full border border-purple-100/80 overflow-x-auto max-w-full">
            {DRAW_MODES.map((mode) => {
              const active = activeMode === mode.id;
              return (
                <button
                  key={mode.id}
                  type="button"
                  disabled={isDrawing}
                  onClick={() => onSelectMode(mode.id)}
                  className={`flex items-center gap-1.5 px-2.5 lg:px-4 py-1.5 rounded-full text-xs lg:text-sm font-semibold whitespace-nowrap transition-all duration-200 ${
                    active
                      ? 'text-white shadow-[0_4px_14px_rgba(124,58,237,0.38)]'
                      : 'text-[#4B3F6B] hover:bg-white/75'
                  } ${isDrawing ? 'opacity-70 cursor-not-allowed' : 'cursor-pointer'}`}
                  style={
                    active
                      ? { background: 'linear-gradient(135deg, #9333EA 0%, #7C3AED 100%)' }
                      : undefined
                  }
                >
                  <ModeIcon modeId={mode.id} active={active} />
                  <span>{mode.label}</span>
                </button>
              );
            })}
          </div>
        </nav>

        {/* Right Utility Controls + User Capsule */}
        <div className="order-2 md:order-3 flex items-center gap-1.5 sm:gap-2 shrink-0">
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
              className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-3.5 py-1.5 rounded-full bg-[#F6F3FF] hover:bg-[#EDE6FE] text-[#3B2E58] font-semibold text-xs sm:text-sm border border-purple-100/70 transition-all cursor-pointer"
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
