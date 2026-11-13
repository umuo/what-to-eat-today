import React from 'react';

export function ShareBanner({ shareData, onSaveToMine, onExitShare }) {
  if (!shareData) return null;

  return (
    <div className="relative z-20 max-w-xl mx-auto mb-3 px-4">
      <div className="bg-white/90 backdrop-blur-md border border-purple-200 rounded-2xl px-4 py-2.5 shadow-[0_8px_24px_rgba(124,58,237,0.12)] flex flex-wrap items-center justify-between gap-2">
        <div className="text-xs sm:text-sm text-[#3B2E58]">
          🎁 正在体验 <span className="font-bold text-purple-700">{shareData.creatorName}</span> 分享的
          「<span className="font-bold">{shareData.menuName}</span>」
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onSaveToMine}
            className="px-3 py-1 rounded-full bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold cursor-pointer"
          >
            保存到我的菜单
          </button>
          <button
            type="button"
            onClick={onExitShare}
            className="px-2.5 py-1 rounded-full bg-purple-50 hover:bg-purple-100 text-purple-600 text-xs font-semibold cursor-pointer"
          >
            返回
          </button>
        </div>
      </div>
    </div>
  );
}
