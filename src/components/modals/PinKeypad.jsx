import React, { useCallback, useEffect, useState } from 'react';
import { soundEngine } from '../../utils/sound.js';

const KEY_ROWS = [
  ['1', '2', '3'],
  ['4', '5', '6'],
  ['7', '8', '9'],
];

export function PinKeypad({
  value = '',
  onChange,
  onComplete,
  disabled = false,
  error = '',
  showDigits = false,
  onToggleShowDigits,
}) {
  const [shakeCount, setShakeCount] = useState(0);

  useEffect(() => {
    if (error) {
      setShakeCount((c) => c + 1);
    }
  }, [error]);

  const appendDigit = useCallback(
    (digit) => {
      if (disabled || value.length >= 4) return;
      soundEngine.playTick(0.95 + Number(digit) * 0.03);
      const next = `${value}${digit}`.slice(0, 4);
      onChange?.(next);
      if (next.length === 4) {
        onComplete?.(next);
      }
    },
    [disabled, value, onChange, onComplete]
  );

  const handleBackspace = useCallback(() => {
    if (disabled || value.length === 0) return;
    soundEngine.playTick(0.75);
    onChange?.(value.slice(0, -1));
  }, [disabled, value, onChange]);

  const handleClear = useCallback(() => {
    if (disabled || value.length === 0) return;
    soundEngine.playTick(0.7);
    onChange?.('');
  }, [disabled, value, onChange]);

  useEffect(() => {
    if (disabled) return undefined;
    const handleKeyDown = (e) => {
      const tag = document.activeElement?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      if (/^\d$/.test(e.key)) {
        e.preventDefault();
        appendDigit(e.key);
      } else if (e.key === 'Backspace') {
        e.preventDefault();
        handleBackspace();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [disabled, appendDigit, handleBackspace]);

  return (
    <div className="select-none">
      {/* 4-slot PIN indicator */}
      <div
        key={shakeCount}
        className={`flex items-center justify-center gap-3 ${
          shakeCount > 0 ? 'animate-shakeX' : ''
        }`}
      >
        {[0, 1, 2, 3].map((idx) => {
          const filled = idx < value.length;
          const active = !disabled && idx === value.length;
          return (
            <div
              key={idx}
              aria-label={`PIN 第 ${idx + 1} 位${filled ? '已输入' : '未输入'}`}
              className={`w-12 h-14 sm:w-[54px] sm:h-[60px] rounded-2xl border-2 flex items-center justify-center transition-all duration-150 ${
                error
                  ? 'border-rose-300 bg-rose-50/70'
                  : active
                  ? 'border-purple-500 ring-4 ring-purple-100 bg-white shadow-sm'
                  : filled
                  ? 'border-purple-400 bg-[#F7F5FF]'
                  : 'border-purple-100 bg-[#FAF8FF]'
              }`}
            >
              {filled ? (
                showDigits ? (
                  <span className="text-xl font-black text-purple-700 animate-popIn">
                    {value[idx]}
                  </span>
                ) : (
                  <span className="w-3.5 h-3.5 rounded-full bg-purple-600 shadow-[0_2px_6px_rgba(124,58,237,0.45)] animate-popIn" />
                )
              ) : (
                <span className="w-2 h-0.5 rounded-full bg-purple-200" />
              )}
            </div>
          );
        })}
      </div>

      {/* Show/hide digits toggle */}
      {onToggleShowDigits && (
        <div className="flex justify-center mt-2.5 mb-3">
          <button
            type="button"
            disabled={disabled}
            onClick={onToggleShowDigits}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium text-purple-600 bg-purple-50 hover:bg-purple-100 transition-colors cursor-pointer disabled:opacity-50"
          >
            <span>{showDigits ? '🙈' : '👁️'}</span>
            <span>{showDigits ? '隐藏数字' : '显示数字'}</span>
          </button>
        </div>
      )}

      {/* Mobile lock-screen 1-9 numeric keypad */}
      <div className="grid grid-cols-3 gap-2.5 max-w-[272px] mx-auto mt-2">
        {KEY_ROWS.flat().map((digit) => (
          <button
            key={digit}
            type="button"
            disabled={disabled || value.length >= 4}
            onClick={() => appendDigit(digit)}
            aria-label={`数字 ${digit}`}
            className="h-[52px] sm:h-14 rounded-2xl bg-[#F7F5FF] hover:bg-[#EDE6FE] active:scale-95 active:bg-purple-200/80 border border-purple-100/90 text-xl font-bold text-[#2D2346] shadow-[0_2px_8px_rgba(109,40,217,0.06)] transition-all duration-100 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {digit}
          </button>
        ))}

        <button
          type="button"
          disabled={disabled || value.length === 0}
          onClick={handleClear}
          aria-label="清空"
          className="h-[52px] sm:h-14 rounded-2xl bg-purple-50/60 hover:bg-purple-100/80 active:scale-95 border border-purple-100/70 text-xs font-semibold text-purple-600 transition-all duration-100 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
        >
          清空
        </button>

        <button
          type="button"
          disabled={disabled || value.length >= 4}
          onClick={() => appendDigit('0')}
          aria-label="数字 0"
          className="h-[52px] sm:h-14 rounded-2xl bg-[#F7F5FF] hover:bg-[#EDE6FE] active:scale-95 active:bg-purple-200/80 border border-purple-100/90 text-xl font-bold text-[#2D2346] shadow-[0_2px_8px_rgba(109,40,217,0.06)] transition-all duration-100 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
        >
          0
        </button>

        <button
          type="button"
          disabled={disabled || value.length === 0}
          onClick={handleBackspace}
          aria-label="退格删除"
          className="h-[52px] sm:h-14 rounded-2xl bg-purple-50/60 hover:bg-purple-100/80 active:scale-95 border border-purple-100/70 flex items-center justify-center text-purple-700 transition-all duration-100 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <svg
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M21 4H8l-7 8 7 8h13a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2z" />
            <line x1="18" y1="9" x2="12" y2="15" />
            <line x1="12" y1="9" x2="18" y2="15" />
          </svg>
        </button>
      </div>
    </div>
  );
}
