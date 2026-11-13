import React, { useEffect, useMemo, useRef, useState } from 'react';
import { getSliceColors } from '../../constants/foodCatalog.js';
import { pickWeightedItem } from '../../utils/random.js';
import { soundEngine } from '../../utils/sound.js';
import { FoodIcon } from '../FoodIcon.jsx';

const PIP_LAYOUTS = {
  1: [[50, 50]],
  2: [
    [28, 28],
    [72, 72],
  ],
  3: [
    [28, 28],
    [50, 50],
    [72, 72],
  ],
  4: [
    [28, 28],
    [72, 28],
    [28, 72],
    [72, 72],
  ],
  5: [
    [28, 28],
    [72, 28],
    [50, 50],
    [28, 72],
    [72, 72],
  ],
  6: [
    [28, 25],
    [72, 25],
    [28, 50],
    [72, 50],
    [28, 75],
    [72, 75],
  ],
};

function DieFace({ value, rolling, variant = 'purple' }) {
  const pips = PIP_LAYOUTS[value] || PIP_LAYOUTS[1];
  const isPurple = variant === 'purple';

  return (
    <div
      className={`w-14 h-14 sm:w-16 sm:h-16 rounded-2xl relative flex items-center justify-center transition-transform duration-300 ${
        rolling ? 'animate-bounce scale-110' : ''
      }`}
      style={{
        background: isPurple
          ? 'linear-gradient(145deg, #A855F7 0%, #7C3AED 100%)'
          : 'linear-gradient(145deg, #FFFFFF 0%, #EDE9FE 100%)',
        boxShadow: isPurple
          ? '0 10px 20px rgba(109,40,217,0.32), inset 0 2px 5px rgba(255,255,255,0.45)'
          : '0 10px 20px rgba(109,40,217,0.18), inset 0 2px 5px rgba(255,255,255,0.9)',
        transform: rolling ? `rotate(${Math.random() * 40 - 20}deg)` : 'rotate(0deg)',
      }}
    >
      <svg viewBox="0 0 100 100" className="w-full h-full">
        {pips.map(([x, y], idx) => (
          <circle
            key={idx}
            cx={x}
            cy={y}
            r="9.5"
            fill={isPurple ? '#FFFFFF' : '#7C3AED'}
          />
        ))}
      </svg>
    </div>
  );
}

export function DiceGridMode({ items, excludedIds, isDrawing, onStartDraw, onDrawComplete, replayTrigger }) {
  const activeItems = useMemo(
    () => items.filter((item) => !excludedIds.has(item.id)),
    [items, excludedIds]
  );
  const colors = useMemo(() => getSliceColors(activeItems.length), [activeItems.length]);

  const [dice, setDice] = useState([3, 5]);
  const [rollingDice, setRollingDice] = useState(false);
  const [highlightIdx, setHighlightIdx] = useState(-1);
  const [animating, setAnimating] = useState(false);

  const timerRef = useRef(null);
  const diceIntervalRef = useRef(null);
  const lastReplayRef = useRef(replayTrigger);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (diceIntervalRef.current) clearInterval(diceIntervalRef.current);
    };
  }, []);

  const rollAndPick = () => {
    if (animating || isDrawing || activeItems.length === 0) return;

    const { winner, winnerIndex } = pickWeightedItem(items, excludedIds);
    if (!winner) return;

    onStartDraw?.();
    setAnimating(true);
    setRollingDice(true);
    setHighlightIdx(-1);
    soundEngine.playDiceRoll();

    let ticks = 0;
    diceIntervalRef.current = setInterval(() => {
      ticks += 1;
      setDice([1 + Math.floor(Math.random() * 6), 1 + Math.floor(Math.random() * 6)]);
      if (ticks >= 8) {
        clearInterval(diceIntervalRef.current);
        setRollingDice(false);
      }
    }, 80);

    timerRef.current = setTimeout(() => {
      if (activeItems.length === 1) {
        setHighlightIdx(0);
        soundEngine.playWinFanfare();
        setTimeout(() => {
          setAnimating(false);
          onDrawComplete?.(winner);
        }, 500);
        return;
      }

      const rounds = 24 + winnerIndex;
      let step = 0;

      const hop = () => {
        const idx = step % activeItems.length;
        setHighlightIdx(idx);
        const progress = step / rounds;
        soundEngine.playTick(0.85 + progress * 0.45);

        if (step >= rounds) {
          soundEngine.playWinFanfare();
          timerRef.current = setTimeout(() => {
            setAnimating(false);
            onDrawComplete?.(winner);
          }, 520);
          return;
        }

        step += 1;
        const delay = 45 + Math.pow(progress, 2.2) * 280;
        timerRef.current = setTimeout(hop, delay);
      };

      hop();
    }, 680);
  };

  useEffect(() => {
    if (replayTrigger !== lastReplayRef.current) {
      lastReplayRef.current = replayTrigger;
      if (replayTrigger > 0) {
        rollAndPick();
      }
    }
  });

  return (
    <div className="flex flex-col items-center w-full max-w-[600px] mx-auto px-2 select-none">
      {/* Dice Stage */}
      <div className="flex items-center gap-4 mb-5 bg-white/80 backdrop-blur-md px-6 py-3.5 rounded-3xl shadow-[0_10px_28px_rgba(124,58,237,0.12)] border border-purple-100">
        <DieFace value={dice[0]} rolling={rollingDice} variant="purple" />
        <DieFace value={dice[1]} rolling={rollingDice} variant="white" />
        <button
          type="button"
          onClick={rollAndPick}
          disabled={animating || isDrawing || activeItems.length === 0}
          className={`ml-2 px-6 py-3 rounded-full font-bold text-white text-sm sm:text-base transition-all duration-200 ${
            animating || activeItems.length === 0
              ? 'opacity-75 cursor-not-allowed bg-purple-400'
              : 'cursor-pointer bg-gradient-to-r from-[#A855F7] to-[#7C3AED] hover:scale-105 active:scale-95 shadow-[0_8px_18px_rgba(124,58,237,0.35)]'
          }`}
        >
          {animating ? '抽取中...' : '🎲 掷骰抽取'}
        </button>
      </div>

      {/* Food Card Grid */}
      {activeItems.length === 0 ? (
        <div className="w-full py-12 bg-white/75 rounded-3xl text-center text-purple-500 font-medium border border-purple-100">
          请先在右侧添加或恢复菜品选项
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 w-full">
          {activeItems.map((item, idx) => {
            const isActive = idx === highlightIdx;
            return (
              <div
                key={item.id}
                className={`relative rounded-2xl p-3 flex flex-col items-center justify-center transition-all duration-150 border-2 ${
                  isActive
                    ? 'scale-105 border-[#7C3AED] ring-4 ring-purple-300/80 shadow-[0_14px_28px_rgba(124,58,237,0.3)] z-10'
                    : 'border-white/90 shadow-sm opacity-95'
                }`}
                style={{
                  backgroundColor: colors[idx],
                }}
              >
                {Number(item.weight) > 1 && (
                  <span className="absolute top-1.5 right-1.5 text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-white/85 text-purple-700">
                    {item.weight}x
                  </span>
                )}
                <FoodIcon iconKey={item.iconKey} size={50} />
                <span className="mt-1.5 text-sm font-bold text-[#3B2E58] truncate max-w-full">
                  {item.name}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
