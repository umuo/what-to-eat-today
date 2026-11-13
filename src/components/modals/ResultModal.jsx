import React, { useEffect, useMemo } from 'react';
import { pickRandomQuote } from '../../constants/foodCatalog.js';
import { FoodIcon } from '../FoodIcon.jsx';

export function ResultModal({
  winner,
  canExcludeAndRedraw,
  onClose,
  onAccept,
  onRedraw,
  onExcludeAndRedraw,
}) {
  const quote = useMemo(() => (winner ? pickRandomQuote() : ''), [winner]);

  useEffect(() => {
    if (!winner) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose?.();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [winner, onClose]);

  if (!winner) return null;

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#1E1B2E]/35 backdrop-blur-sm"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-sm bg-white rounded-[32px] p-6 pt-7 text-center shadow-[0_26px_64px_rgba(109,40,217,0.32)] border-2 border-purple-100 animate-popIn"
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="关闭结果弹窗"
          title="关闭"
          className="absolute right-4 top-4 w-8 h-8 rounded-full hover:bg-purple-50 flex items-center justify-center text-gray-400 hover:text-gray-600 transition-colors cursor-pointer"
        >
          ✕
        </button>

        <span className="inline-block px-3.5 py-1 rounded-full bg-purple-100 text-purple-700 text-xs font-bold tracking-wide">
          🎉 今日天选美味
        </span>

        <div className="my-4 w-28 h-28 mx-auto rounded-3xl bg-gradient-to-br from-purple-50 to-amber-50 flex items-center justify-center shadow-inner border border-purple-100/80">
          <FoodIcon iconKey={winner.iconKey} size={86} />
        </div>

        <h3 className="text-2xl font-extrabold text-[#2D2346] tracking-tight">
          {winner.name}
        </h3>
        <p className="mt-1.5 text-xs sm:text-sm text-gray-500 leading-relaxed">
          {quote}
        </p>

        <div className="mt-6 space-y-2.5">
          <button
            type="button"
            onClick={onAccept}
            className="w-full py-3 rounded-2xl font-bold text-white text-sm sm:text-base shadow-[0_10px_22px_rgba(124,58,237,0.35)] hover:scale-[1.01] active:scale-[0.99] transition-transform cursor-pointer"
            style={{
              background: 'linear-gradient(135deg, #A855F7 0%, #7C3AED 100%)',
            }}
          >
            🍽️ 就吃它了！
          </button>

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={onRedraw}
              className="py-2.5 px-3 rounded-xl font-semibold text-xs sm:text-sm text-purple-700 bg-purple-50 hover:bg-purple-100 transition-colors cursor-pointer"
            >
              🔄 再抽一次
            </button>
            <button
              type="button"
              disabled={!canExcludeAndRedraw}
              onClick={onExcludeAndRedraw}
              title={canExcludeAndRedraw ? '本轮临时排除该菜品并立刻重抽' : '只剩最后一个选项了'}
              className={`py-2.5 px-3 rounded-xl font-semibold text-xs sm:text-sm transition-colors ${
                canExcludeAndRedraw
                  ? 'text-amber-700 bg-amber-50 hover:bg-amber-100 cursor-pointer'
                  : 'text-gray-300 bg-gray-50 cursor-not-allowed'
              }`}
            >
              🙈 不想吃这个
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
