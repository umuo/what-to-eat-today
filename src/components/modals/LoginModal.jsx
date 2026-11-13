import React, { useEffect, useRef, useState } from 'react';
import { apiClient } from '../../utils/apiClient.js';
import { PinKeypad } from './PinKeypad.jsx';

export function LoginModal({
  open,
  initialUsername = '',
  recentUsers,
  hasGuestCustomizations,
  loading,
  error,
  onClearError,
  onClose,
  onQuickSwitchRecent,
  onSubmit,
}) {
  const [step, setStep] = useState('username');
  const [username, setUsername] = useState('');
  const [pin, setPin] = useState('');
  const [website, setWebsite] = useState('');
  const [importGuestMenu, setImportGuestMenu] = useState(true);
  const [authStatus, setAuthStatus] = useState(null);
  const [statusLoading, setStatusLoading] = useState(false);
  const [localError, setLocalError] = useState('');
  const [showDigits, setShowDigits] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    let cancelled = false;
    setPin('');
    setWebsite('');
    setLocalError('');
    setImportGuestMenu(true);

    const target = (initialUsername || '').trim();
    if (target) {
      setUsername(target);
      setStep('pin');
      setStatusLoading(true);
      setAuthStatus(null);
      apiClient
        .getAuthStatus(target)
        .then((res) => {
          if (cancelled) return;
          setAuthStatus(res);
          setShowDigits(!res.exists || !res.hasPin);
        })
        .catch((err) => {
          if (cancelled) return;
          setLocalError(err.message || '无法查询账号状态，请重试');
          setStep('username');
        })
        .finally(() => {
          if (!cancelled) setStatusLoading(false);
        });
    } else {
      setUsername('');
      setAuthStatus(null);
      setStatusLoading(false);
      setShowDigits(false);
      setStep('username');
      setTimeout(() => inputRef.current?.focus(), 50);
    }

    return () => {
      cancelled = true;
    };
  }, [open, initialUsername]);

  useEffect(() => {
    if (error) {
      setPin('');
    }
  }, [error]);

  if (!open) return null;

  const isBusy = loading || statusLoading;
  const displayError = error || localError;
  const targetName = authStatus?.username || username.trim();

  const handleUsernameNext = async (e) => {
    e.preventDefault();
    const clean = username.trim();
    if (!clean || isBusy) return;
    onClearError?.();
    setLocalError('');
    inputRef.current?.blur();
    setStatusLoading(true);
    try {
      const res = await apiClient.getAuthStatus(clean);
      setAuthStatus(res);
      setShowDigits(!res.exists || !res.hasPin);
      setPin('');
      setStep('pin');
    } catch (err) {
      setLocalError(err.message || '无法查询账号状态，请重试');
    } finally {
      setStatusLoading(false);
    }
  };

  const handleBackToUsername = () => {
    if (isBusy) return;
    onClearError?.();
    setLocalError('');
    setPin('');
    setStep('username');
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  const handlePinComplete = (pin4) => {
    if (isBusy || !targetName) return;
    onClearError?.();
    setLocalError('');
    onSubmit(targetName, pin4, hasGuestCustomizations && importGuestMenu, website);
  };

  const renderPinHeader = () => {
    if (statusLoading) {
      return {
        icon: '⏳',
        title: '正在识别账号...',
        subtitle: `即将为「${username.trim()}」准备数字键盘`,
      };
    }
    if (authStatus && !authStatus.exists) {
      return {
        icon: '🔐',
        title: '设置 4 位数字 PIN 码',
        subtitle: `首次创建「${targetName}」，请点按数字键盘设置保护码`,
      };
    }
    if (authStatus?.exists && !authStatus?.hasPin) {
      return {
        icon: '🛡️',
        title: '绑定 4 位数字 PIN 码',
        subtitle: `为「${targetName}」设置 4 位保护码，防止他人误改菜单`,
      };
    }
    return {
      icon: '🔓',
      title: '输入 4 位 PIN 码解锁',
      subtitle: `欢迎回来，「${targetName}」！点按下方键盘即可进入`,
    };
  };

  const pinHeader = renderPinHeader();

  return (
    <div
      onClick={() => !isBusy && onClose()}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#1E1B2E]/45 backdrop-blur-sm"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-sm bg-white rounded-[28px] p-6 shadow-[0_24px_60px_rgba(109,40,217,0.28)] border border-purple-100 animate-popIn"
      >
        {step === 'pin' && (
          <button
            type="button"
            disabled={isBusy}
            onClick={handleBackToUsername}
            className="absolute left-4 top-4 px-2.5 py-1 rounded-full hover:bg-purple-50 text-xs font-semibold text-purple-600 cursor-pointer disabled:opacity-40"
          >
            ← 换个昵称
          </button>
        )}

        <button
          type="button"
          disabled={isBusy}
          onClick={onClose}
          aria-label="关闭登录弹窗"
          className="absolute right-4 top-4 w-8 h-8 rounded-full hover:bg-purple-50 flex items-center justify-center text-gray-400 hover:text-gray-600 cursor-pointer disabled:opacity-40"
        >
          ✕
        </button>

        {step === 'username' ? (
          <>
            <div className="text-center mb-5 mt-1">
              <div className="w-12 h-12 mx-auto mb-2.5 rounded-2xl bg-purple-100 text-purple-600 flex items-center justify-center text-2xl">
                🍜
              </div>
              <h2 className="text-xl font-bold text-[#2D2346]">输入用户名即可开始</h2>
              <p className="text-xs text-gray-500 mt-1">
                用专属昵称 + 4 位数字 PIN 保护你的多套美食菜单
              </p>
            </div>

            <form onSubmit={handleUsernameNext} className="space-y-3.5 relative">
              {/* Honeypot field against naive bot submissions */}
              <input
                type="text"
                name="website"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                tabIndex={-1}
                autoComplete="off"
                aria-hidden="true"
                className="absolute -left-[9999px] w-0 h-0 opacity-0 pointer-events-none"
              />

              <div>
                <input
                  ref={inputRef}
                  type="text"
                  value={username}
                  onChange={(e) => {
                    onClearError?.();
                    setLocalError('');
                    setUsername(e.target.value);
                  }}
                  placeholder="例如：小明、公司干饭小分队"
                  maxLength={24}
                  className="w-full px-4 py-3 rounded-2xl bg-[#F7F5FF] border border-purple-200 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-200 text-sm font-medium text-[#2D2346]"
                />
              </div>

              {hasGuestCustomizations && (
                <label className="flex items-center gap-2 text-xs text-purple-700 bg-purple-50 px-3 py-2 rounded-xl cursor-pointer">
                  <input
                    type="checkbox"
                    checked={importGuestMenu}
                    onChange={(e) => setImportGuestMenu(e.target.checked)}
                    className="rounded accent-purple-600"
                  />
                  <span>将我刚才试玩编辑的菜单同步导入此账号</span>
                </label>
              )}

              {displayError && (
                <p className="text-xs text-rose-500 font-medium px-1">{displayError}</p>
              )}

              <button
                type="submit"
                disabled={!username.trim() || isBusy}
                className="w-full py-3 rounded-2xl font-bold text-white text-sm shadow-[0_10px_22px_rgba(124,58,237,0.35)] transition-transform hover:scale-[1.01] active:scale-[0.99] disabled:opacity-60 cursor-pointer"
                style={{
                  background: 'linear-gradient(135deg, #A855F7 0%, #7C3AED 100%)',
                }}
              >
                {statusLoading ? '正在识别账号...' : '下一步：输入 4 位 PIN 码'}
              </button>
            </form>

            {recentUsers.length > 0 && (
              <div className="mt-4 pt-3.5 border-t border-purple-50">
                <p className="text-[11px] text-gray-400 mb-2">快速切换最近账号：</p>
                <div className="flex flex-wrap gap-1.5">
                  {recentUsers.slice(0, 6).map((u) => (
                    <button
                      key={u}
                      type="button"
                      disabled={isBusy}
                      onClick={() => onQuickSwitchRecent(u)}
                      className="px-3 py-1 rounded-full bg-purple-50 hover:bg-purple-100 text-purple-700 text-xs font-semibold cursor-pointer"
                    >
                      {u}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="pt-4">
            <div className="text-center mb-4">
              <div className="w-11 h-11 mx-auto mb-2 rounded-2xl bg-purple-100 text-purple-600 flex items-center justify-center text-xl">
                {pinHeader.icon}
              </div>
              <h2 className="text-lg font-bold text-[#2D2346]">{pinHeader.title}</h2>
              <p className="text-xs text-gray-500 mt-1 px-2">{pinHeader.subtitle}</p>
            </div>

            {displayError && (
              <p className="text-center text-xs text-rose-500 font-semibold mb-3 px-2">
                {displayError}
              </p>
            )}

            <PinKeypad
              value={pin}
              onChange={(next) => {
                if (next.length > 0 && (error || localError)) {
                  onClearError?.();
                  setLocalError('');
                }
                setPin(next);
              }}
              onComplete={handlePinComplete}
              disabled={isBusy}
              error={displayError}
              showDigits={showDigits}
              onToggleShowDigits={() => setShowDigits((s) => !s)}
            />

            <p className="text-center text-[11px] text-gray-400 mt-3.5">
              {loading
                ? '正在验证 PIN 码并加载云端菜单...'
                : '点按 4 位数字自动完成验证 · 支持键盘数字键'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
