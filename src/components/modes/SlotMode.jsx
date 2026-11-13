import React, { useEffect, useMemo, useRef, useState } from 'react';
import { pickWeightedItem } from '../../utils/random.js';
import { soundEngine } from '../../utils/sound.js';
import { FoodIcon } from '../FoodIcon.jsx';

const ITEM_HEIGHT = 112;
const REEL_DURATIONS = [2000, 3000, 4100];

export function SlotMode({ items, excludedIds, isDrawing, onStartDraw, onDrawComplete, replayTrigger }) {
  const activeItems = useMemo(
    () => items.filter((item) => !excludedIds.has(item.id)),
    [items, excludedIds]
  );

  const [reels, setReels] = useState([[], [], []]);
  const [offsets, setOffsets] = useState([0, 0, 0]);
  const [animating, setAnimating] = useState(false);
  const [leverPulled, setLeverPulled] = useState(false);
  const [wonFlash, setWonFlash] = useState(false);

  const timersRef = useRef([]);
  const lastReplayRef = useRef(replayTrigger);

  // Initialize resting reel items when menu changes and idle
  useEffect(() => {
    if (animating) return;
    if (activeItems.length === 0) {
      setReels([[], [], []]);
      setOffsets([0, 0, 0]);
      return;
    }
    const r0 = [activeItems[0]];
    const r1 = [activeItems[1 % activeItems.length]];
    const r2 = [activeItems[2 % activeItems.length]];
    setReels([r0, r1, r2]);
    setOffsets([0, 0, 0]);
  }, [activeItems, animating]);

  useEffect(() => {
    return () => {
      timersRef.current.forEach((t) => clearTimeout(t));
    };
  }, []);

  const pullLever = () => {
    if (animating || isDrawing || activeItems.length === 0) return;

    const { winner } = pickWeightedItem(items, excludedIds);
    if (!winner) return;

    timersRef.current.forEach((t) => clearTimeout(t));
    timersRef.current = [];

    onStartDraw?.();
    setAnimating(true);
    setWonFlash(false);
    setLeverPulled(true);
    soundEngine.playLever();

    timersRef.current.push(setTimeout(() => setLeverPulled(false), 380));

    const fillerCounts = [16, 24, 32];
    const nextReels = fillerCounts.map((count, colIdx) => {
      const strip = [];
      const currentHead = reels[colIdx]?.[offsets[colIdx]] || activeItems[colIdx % activeItems.length];
      strip.push(currentHead);
      for (let i = 0; i < count; i++) {
        const rand = activeItems[Math.floor(Math.random() * activeItems.length)];
        strip.push(rand);
      }
      strip.push(winner);
      return strip;
    });

    setReels(nextReels);
    setOffsets([0, 0, 0]);

    // Trigger CSS transform on next frame
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setOffsets(nextReels.map((strip) => strip.length - 1));
      });
    });

    REEL_DURATIONS.forEach((dur, idx) => {
      timersRef.current.push(
        setTimeout(() => {
          soundEngine.playReelStop(idx);
        }, dur)
      );
    });

    timersRef.current.push(
      setTimeout(() => {
        setWonFlash(true);
        soundEngine.playWinFanfare();
      }, REEL_DURATIONS[2] + 80)
    );

    timersRef.current.push(
      setTimeout(() => {
        setAnimating(false);
        setWonFlash(false);
        onDrawComplete?.(winner);
      }, REEL_DURATIONS[2] + 550)
    );
  };

  useEffect(() => {
    if (replayTrigger !== lastReplayRef.current) {
      lastReplayRef.current = replayTrigger;
      if (replayTrigger > 0) {
        pullLever();
      }
    }
  });

  return (
    <div className="flex flex-col items-center justify-center select-none w-full max-w-[540px] mx-auto px-2">
      <div className="relative flex items-center justify-center">
        {/* Arcade machine body */}
        <div
          className="relative w-[310px] sm:w-[440px] rounded-[34px] p-4 sm:p-6 border-4 border-white/80"
          style={{
            background: 'linear-gradient(165deg, #9333EA 0%, #7C3AED 55%, #5B21B6 100%)',
            boxShadow:
              '0 24px 48px -10px rgba(109, 40, 217, 0.42), inset 0 4px 10px rgba(255,255,255,0.35)',
          }}
        >
          {/* Top 777 Marquee Header */}
          <div className="relative mx-auto -mt-8 sm:-mt-10 mb-4 w-[180px] sm:w-[220px] py-2 px-4 rounded-2xl border-2 border-white/85 flex items-center justify-center gap-2"
            style={{
              background: 'linear-gradient(135deg, #FEF08A 0%, #F59E0B 100%)',
              boxShadow: '0 8px 18px rgba(180, 83, 9, 0.35)',
            }}
          >
            <span className="w-2.5 h-2.5 rounded-full bg-white animate-pulse" />
            <span className="font-black text-xl sm:text-2xl tracking-widest text-[#7C2D12] drop-shadow-sm">
              777 美食机
            </span>
            <span className="w-2.5 h-2.5 rounded-full bg-white animate-pulse" />
          </div>

          {/* 3 Reel Windows */}
          <div
            className={`relative rounded-2xl p-2.5 sm:p-3.5 transition-all duration-300 ${
              wonFlash ? 'ring-4 ring-yellow-300' : ''
            }`}
            style={{
              background: 'linear-gradient(180deg, #4C1D95 0%, #5B21B6 100%)',
              boxShadow: 'inset 0 4px 10px rgba(0,0,0,0.35)',
            }}
          >
            {activeItems.length === 0 ? (
              <div className="h-[112px] flex items-center justify-center text-purple-200 text-sm font-medium bg-white/10 rounded-xl">
                请先在右侧添加或恢复菜品选项
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-2 sm:gap-3">
                {[0, 1, 2].map((colIdx) => {
                  const strip = reels[colIdx] || [];
                  const targetIdx = offsets[colIdx] || 0;
                  const easing =
                    colIdx === 2
                      ? 'cubic-bezier(0.2, 1.12, 0.32, 1)'
                      : 'cubic-bezier(0.16, 0.9, 0.25, 1)';

                  return (
                    <div
                      key={colIdx}
                      className="relative h-[112px] rounded-xl bg-gradient-to-b from-purple-50 via-white to-purple-50 overflow-hidden"
                      style={{
                        boxShadow: 'inset 0 6px 12px rgba(91, 33, 182, 0.16), inset 0 -6px 12px rgba(91, 33, 182, 0.14)',
                      }}
                    >
                      <div
                        className="will-change-transform"
                        style={{
                          transform: `translateY(-${targetIdx * ITEM_HEIGHT}px)`,
                          transition: animating
                            ? `transform ${REEL_DURATIONS[colIdx]}ms ${easing}`
                            : 'none',
                        }}
                      >
                        {strip.map((item, idx) => (
                          <div
                            key={`${item.id}-${idx}`}
                            className="h-[112px] flex flex-col items-center justify-center px-1"
                          >
                            <FoodIcon iconKey={item.iconKey} size={52} />
                            <span className="mt-1.5 text-xs sm:text-sm font-bold text-[#3B2E58] truncate max-w-full">
                              {item.name}
                            </span>
                          </div>
                        ))}
                      </div>
                      {/* Subtle glass cylinder highlight */}
                      <div
                        className="absolute inset-0 pointer-events-none"
                        style={{
                          background:
                            'linear-gradient(180deg, rgba(109,40,217,0.14) 0%, transparent 25%, transparent 75%, rgba(109,40,217,0.16) 100%)',
                        }}
                      />
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Bottom decorative indicator lights */}
          <div className="mt-4 flex items-center justify-between px-2">
            <div className="flex items-center gap-1.5">
              {[0, 1, 2, 3, 4].map((dot) => (
                <span
                  key={dot}
                  className={`w-2.5 h-2.5 rounded-full transition-colors duration-200 ${
                    wonFlash || (animating && dot % 2 === 0)
                      ? 'bg-yellow-300 shadow-[0_0_8px_#FDE047]'
                      : 'bg-purple-300/60'
                  }`}
                />
              ))}
            </div>
            <button
              type="button"
              onClick={pullLever}
              disabled={animating || isDrawing || activeItems.length === 0}
              className={`px-6 py-2.5 rounded-full font-bold text-sm sm:text-base text-[#581C87] transition-all duration-200 ${
                animating || activeItems.length === 0
                  ? 'opacity-70 cursor-not-allowed bg-yellow-200'
                  : 'cursor-pointer bg-gradient-to-b from-[#FEF08A] to-[#FBBF24] hover:scale-105 active:scale-95 shadow-[0_6px_14px_rgba(180,83,9,0.35)]'
              }`}
            >
              {animating ? '滚轮飞转中...' : '🎰 拉杆开抽'}
            </button>
          </div>
        </div>

        {/* Right Side Mechanical Lever */}
        <button
          type="button"
          onClick={pullLever}
          disabled={animating || isDrawing || activeItems.length === 0}
          aria-label="拉动老虎机摇杆"
          className="hidden sm:flex flex-col items-center ml-1 cursor-pointer group focus:outline-none"
        >
          <div className="relative w-10 h-32 flex items-center justify-start">
            {/* Mount */}
            <div className="w-4 h-12 rounded-r-lg bg-gradient-to-b from-purple-300 to-purple-600 shadow-md" />
            {/* Rotating arm */}
            <div
              className="absolute left-2 origin-left transition-transform duration-300"
              style={{
                transform: leverPulled ? 'rotate(48deg)' : 'rotate(-24deg)',
              }}
            >
              <div className="w-2.5 h-20 -mt-16 rounded-full bg-gradient-to-r from-slate-200 to-slate-400 shadow" />
              <div
                className="w-8 h-8 -mt-24 -ml-2.5 rounded-full transition-transform group-hover:scale-110"
                style={{
                  background: 'radial-gradient(circle at 30% 30%, #FDA4AF 0%, #F43F5E 65%, #BE123C 100%)',
                  boxShadow: '0 4px 10px rgba(190, 18, 60, 0.45)',
                }}
              />
            </div>
          </div>
        </button>
      </div>
    </div>
  );
}
