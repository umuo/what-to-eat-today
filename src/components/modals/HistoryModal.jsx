import React from 'react';
import { MODE_MAP } from '../../constants/modes.js';
import { FoodIcon } from '../FoodIcon.jsx';

function formatTime(iso) {
  try {
    const d = new Date(iso);
    return d.toLocaleString('zh-CN', {
      month: 'numeric',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '';
  }
}

export function HistoryModal({ open, history, onClose, onClear }) {
  if (!open) return null;

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#1E1B2E]/40 backdrop-blur-sm"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-md bg-white rounded-[28px] p-6 shadow-[0_24px_60px_rgba(109,40,217,0.26)] border border-purple-100 animate-popIn"
      >
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-bold text-[#2D2346]">📜 抽取历史记录</h2>
            <p className="text-xs text-gray-400">看看最近都宠幸了哪些美食</p>
          </div>
          <div className="flex items-center gap-2">
            {history.length > 0 && (
              <button
                type="button"
                onClick={onClear}
                className="text-xs font-semibold text-rose-500 hover:bg-rose-50 px-2.5 py-1 rounded-lg cursor-pointer"
              >
                清空
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              aria-label="关闭历史记录"
              className="w-8 h-8 rounded-full hover:bg-purple-50 flex items-center justify-center text-gray-400 hover:text-gray-600 cursor-pointer"
            >
              ✕
            </button>
          </div>
        </div>

        {history.length === 0 ? (
          <div className="py-12 text-center text-sm text-gray-400">
            还没有抽取记录，快去转一转吧～
          </div>
        ) : (
          <div className="max-h-80 overflow-y-auto custom-scrollbar space-y-2 pr-1">
            {history.map((rec) => (
              <div
                key={rec.id}
                className="flex items-center gap-3 px-3 py-2.5 rounded-2xl bg-[#FAF8FF] border border-purple-50"
              >
                <FoodIcon iconKey={rec.iconKey} size={34} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-[#2D2346] truncate">
                      {rec.itemName}
                    </span>
                    {rec.status === 'excluded' && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 font-semibold">
                        被跳过
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] text-gray-400 flex items-center gap-2 mt-0.5">
                    <span>{MODE_MAP[rec.mode]?.label || rec.mode}</span>
                    <span>·</span>
                    <span className="truncate">{rec.menuName}</span>
                  </div>
                </div>
                <span className="text-[11px] text-gray-400 shrink-0">
                  {formatTime(rec.createdAt)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
