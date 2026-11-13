import React, { useEffect, useMemo, useRef, useState } from 'react';
import { getSliceColors } from '../../constants/foodCatalog.js';
import { pickWeightedItem } from '../../utils/random.js';
import { soundEngine } from '../../utils/sound.js';
import { FoodIcon } from '../FoodIcon.jsx';

const SPIN_DURATION_MS = 4200;
const BULB_COUNT = 16;

function polarToCartesian(cx, cy, r, clockDeg) {
  const rad = ((clockDeg - 90) * Math.PI) / 180;
  return {
    x: cx + r * Math.cos(rad),
    y: cy + r * Math.sin(rad),
  };
}

function buildSlicePath(cx, cy, r, startDeg, endDeg) {
  const start = polarToCartesian(cx, cy, r, startDeg);
  const end = polarToCartesian(cx, cy, r, endDeg);
  const span = endDeg - startDeg;
  const largeArc = span > 180 ? 1 : 0;
  return `M ${cx} ${cy} L ${start.x.toFixed(3)} ${start.y.toFixed(3)} A ${r} ${r} 0 ${largeArc} 1 ${end.x.toFixed(3)} ${end.y.toFixed(3)} Z`;
}

// Match cubic-bezier(0.15, 0.85, 0.12, 1) closely for tick & pointer wobble sync
function easeOutQuintLike(t) {
  return 1 - Math.pow(1 - t, 3.6);
}

export function WheelMode({ items, excludedIds, isDrawing, onStartDraw, onDrawComplete, replayTrigger }) {
  const [rotation, setRotation] = useState(0);
  const [animating, setAnimating] = useState(false);
  const [pointerTick, setPointerTick] = useState(false);
  const [bulbPhase, setBulbPhase] = useState(0);

  const rotationRef = useRef(0);
  const rafRef = useRef(null);
  const timeoutRef = useRef(null);
  const lastReplayRef = useRef(replayTrigger);

  const activeItems = useMemo(
    () => items.filter((item) => !excludedIds.has(item.id)),
    [items, excludedIds]
  );

  // Compute slices with slice 0 spanning [-deg0, 0] so slice 0 sits left of 12 o'clock & slice 1 sits right
  const slices = useMemo(() => {
    if (activeItems.length === 0) return [];
    const totalWeight = activeItems.reduce((sum, item) => sum + Math.max(1, Number(item.weight) || 1), 0);
    const colors = getSliceColors(activeItems.length);
    const firstDeg = (Math.max(1, Number(activeItems[0].weight) || 1) / totalWeight) * 360;
    let cursor = -firstDeg;

    return activeItems.map((item, idx) => {
      const span = (Math.max(1, Number(item.weight) || 1) / totalWeight) * 360;
      const startDeg = cursor;
      const endDeg = cursor + span;
      const midDeg = (startDeg + endDeg) / 2;
      cursor = endDeg;
      return {
        item,
        index: idx,
        startDeg,
        endDeg,
        midDeg,
        span,
        color: colors[idx],
      };
    });
  }, [activeItems]);

  // Marquee bulb alternation
  useEffect(() => {
    const intervalMs = animating ? 140 : 650;
    const timer = setInterval(() => {
      setBulbPhase((p) => (p + 1) % 2);
    }, intervalMs);
    return () => clearInterval(timer);
  }, [animating]);

  useEffect(() => {
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  const spin = () => {
    if (animating || isDrawing || slices.length === 0) return;

    const { winner, winnerIndex } = pickWeightedItem(items, excludedIds);
    if (!winner) return;

    onStartDraw?.();
    setAnimating(true);

    const targetSlice = slices[winnerIndex] || slices[0];
    const margin = targetSlice.span * 0.22;
    const targetDeg =
      targetSlice.startDeg + margin + Math.random() * Math.max(1, targetSlice.span - 2 * margin);

    const desiredMod = (((360 - (targetDeg % 360)) % 360) + 360) % 360;
    const currentRot = rotationRef.current;
    const currentMod = ((currentRot % 360) + 360) % 360;
    const delta = (desiredMod - currentMod + 360) % 360;
    const nextRotation = currentRot + 360 * 6 + delta;

    rotationRef.current = nextRotation;
    setRotation(nextRotation);

    const startTime = performance.now();
    const boundaries = slices.map((s) => ((s.startDeg % 360) + 360) % 360);

    const findSliceAtPointer = (rot) => {
      const pointerLocalDeg = (((360 - (rot % 360)) % 360) + 360) % 360;
      for (let i = 0; i < slices.length; i++) {
        const s = ((slices[i].startDeg % 360) + 360) % 360;
        const e = ((slices[i].endDeg % 360) + 360) % 360;
        if (s < e) {
          if (pointerLocalDeg >= s && pointerLocalDeg < e) return i;
        } else {
          if (pointerLocalDeg >= s || pointerLocalDeg < e) return i;
        }
      }
      return 0;
    };

    let lastSliceIdx = findSliceAtPointer(currentRot);

    const stepTick = (now) => {
      const elapsed = now - startTime;
      const t = Math.min(1, elapsed / SPIN_DURATION_MS);
      const eased = easeOutQuintLike(t);
      const approxRot = currentRot + (nextRotation - currentRot) * eased;
      const curIdx = findSliceAtPointer(approxRot);

      if (curIdx !== lastSliceIdx && slices.length > 1) {
        lastSliceIdx = curIdx;
        soundEngine.playTick(0.92 + (1 - t) * 0.28);
        setPointerTick(true);
        setTimeout(() => setPointerTick(false), 75);
      }

      if (t < 1) {
        rafRef.current = requestAnimationFrame(stepTick);
      }
    };

    if (boundaries.length > 1) {
      rafRef.current = requestAnimationFrame(stepTick);
    }

    timeoutRef.current = setTimeout(() => {
      setAnimating(false);
      soundEngine.playWinFanfare();
      onDrawComplete?.(winner);
    }, SPIN_DURATION_MS + 60);
  };

  useEffect(() => {
    if (replayTrigger !== lastReplayRef.current) {
      lastReplayRef.current = replayTrigger;
      if (replayTrigger > 0) {
        spin();
      }
    }
  });

  const uprightMode = slices.length <= 10;
  const isCompact = slices.length > 8;
  const iconSize = slices.length <= 6 ? 56 : slices.length <= 8 ? 50 : slices.length <= 12 ? 36 : 26;
  const labelRadiusPct = slices.length <= 8 ? 31.5 : 33.5;

  return (
    <div className="relative flex flex-col items-center justify-center select-none">
      {/* Outer wheel casing */}
      <div className="relative w-[324px] h-[324px] sm:w-[392px] sm:h-[392px] lg:w-[436px] lg:h-[436px] flex items-center justify-center">
        {/* Drop shadow */}
        <div
          className="absolute inset-3 rounded-full pointer-events-none"
          style={{
            boxShadow: '0 24px 48px -12px rgba(109, 40, 217, 0.34), 0 8px 20px rgba(124, 58, 237, 0.18)',
          }}
        />

        {/* Purple glossy outer rim */}
        <div
          className="relative w-full h-full rounded-full p-[18px] sm:p-[22px]"
          style={{
            background: 'linear-gradient(145deg, #A855F7 0%, #8B5CF6 48%, #6D28D9 100%)',
            boxShadow:
              'inset 0 4px 8px rgba(255,255,255,0.45), inset 0 -6px 10px rgba(76,29,149,0.5), 0 0 0 4px rgba(167,139,250,0.28)',
          }}
        >
          {/* 16 Marquee bulbs */}
          {Array.from({ length: BULB_COUNT }).map((_, i) => {
            const angle = (i * 360) / BULB_COUNT;
            const pos = polarToCartesian(50, 50, 47.5, angle);
            const lit = i % 2 === bulbPhase;
            return (
              <span
                key={i}
                className="absolute w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full -translate-x-1/2 -translate-y-1/2 transition-all duration-150 pointer-events-none"
                style={{
                  left: `${pos.x}%`,
                  top: `${pos.y}%`,
                  background: lit
                    ? 'radial-gradient(circle at 35% 35%, #FFFFFF 0%, #FEF9C3 70%, #FDE047 100%)'
                    : 'radial-gradient(circle at 35% 35%, #F5F3FF 0%, #DDD6FE 80%, #C4B5FD 100%)',
                  boxShadow: lit
                    ? '0 0 10px 2px rgba(255, 255, 255, 0.9), 0 0 4px rgba(254, 240, 138, 0.8)'
                    : '0 1px 2px rgba(76, 29, 149, 0.4)',
                  opacity: lit ? 1 : 0.72,
                }}
              />
            );
          })}

          {/* Inner rotating wheel face */}
          <div
            className="relative w-full h-full rounded-full overflow-hidden bg-white"
            style={{
              boxShadow: 'inset 0 0 0 3px rgba(255,255,255,0.85), 0 0 12px rgba(76,29,149,0.35)',
            }}
          >
            {slices.length === 0 ? (
              <div className="w-full h-full flex flex-col items-center justify-center bg-purple-50 text-purple-600 px-6 text-center">
                <p className="font-bold text-base">菜单为空或全部已暂排</p>
                <p className="text-xs mt-1 text-purple-400">请在右侧恢复选项或添加菜品</p>
              </div>
            ) : (
              <div
                className="relative w-full h-full will-change-transform"
                style={{
                  transform: `rotate(${rotation}deg)`,
                  transition: animating
                    ? `transform ${SPIN_DURATION_MS}ms cubic-bezier(0.15, 0.85, 0.12, 1)`
                    : 'none',
                }}
              >
                {/* SVG colored sectors */}
                <svg viewBox="0 0 400 400" className="w-full h-full block">
                  {slices.length === 1 ? (
                    <circle cx="200" cy="200" r="200" fill={slices[0].color} />
                  ) : (
                    slices.map((slice) => (
                      <path
                        key={slice.item.id}
                        d={buildSlicePath(200, 200, 202, slice.startDeg, slice.endDeg)}
                        fill={slice.color}
                        stroke="rgba(255,255,255,0.9)"
                        strokeWidth="2.4"
                      />
                    ))
                  )}
                </svg>

                {/* Icons & labels inside sectors */}
                {slices.map((slice) => {
                  const rad = ((slice.midDeg - 90) * Math.PI) / 180;
                  const xPct = 50 + labelRadiusPct * Math.cos(rad);
                  const yPct = 50 + labelRadiusPct * Math.sin(rad);

                  const itemTransform = uprightMode
                    ? `translate(-50%, -50%) rotate(${-rotation}deg)`
                    : `translate(-50%, -50%) rotate(${slice.midDeg}deg)`;

                  return (
                    <div
                      key={slice.item.id}
                      className="absolute flex flex-col items-center justify-center text-center pointer-events-none will-change-transform"
                      style={{
                        left: `${xPct}%`,
                        top: `${yPct}%`,
                        transform: itemTransform,
                        transition: animating
                          ? `transform ${SPIN_DURATION_MS}ms cubic-bezier(0.15, 0.85, 0.12, 1)`
                          : 'none',
                      }}
                    >
                      <FoodIcon iconKey={slice.item.iconKey} size={iconSize} />
                      <span
                        className={`mt-0.5 font-bold text-[#3B2E58] leading-tight whitespace-nowrap max-w-[78px] truncate ${
                          isCompact ? 'text-[11px]' : 'text-[13px] sm:text-[15px]'
                        }`}
                        style={{
                          textShadow: '0 1px 2px rgba(255,255,255,0.9)',
                        }}
                      >
                        {slice.item.name}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* 12 o'clock red teardrop pointer */}
        <div
          className="absolute -top-2 sm:-top-2.5 left-1/2 -translate-x-1/2 z-20 pointer-events-none origin-top transition-transform duration-75"
          style={{
            transform: `translateX(-50%) rotate(${pointerTick ? -12 : 0}deg)`,
          }}
        >
          <svg width="42" height="54" viewBox="0 0 42 54" className="drop-shadow-[0_4px_6px_rgba(127,29,29,0.35)]">
            <defs>
              <linearGradient id="pointerRed" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#FF6B6B" />
                <stop offset="55%" stopColor="#EF4444" />
                <stop offset="100%" stopColor="#B91C1C" />
              </linearGradient>
            </defs>
            <path
              d="M21 52 C21 52 5 30 5 18 C5 9.2 12.2 2 21 2 C29.8 2 37 9.2 37 18 C37 30 21 52 21 52 Z"
              fill="url(#pointerRed)"
              stroke="#FFFFFF"
              strokeWidth="2.2"
            />
            <ellipse cx="15" cy="14" rx="4" ry="6.5" transform="rotate(-20 15 14)" fill="rgba(255,255,255,0.45)" />
            <circle cx="21" cy="17" r="4.5" fill="#FCA5A5" opacity="0.55" />
          </svg>
        </div>

        {/* Center glossy purple "开始" button */}
        <button
          type="button"
          onClick={spin}
          disabled={animating || isDrawing || slices.length === 0}
          aria-label="开始转盘抽取"
          className={`absolute z-20 w-[96px] h-[96px] sm:w-[116px] sm:h-[116px] rounded-full flex items-center justify-center transition-all duration-200 ${
            animating || slices.length === 0
              ? 'cursor-not-allowed opacity-90 scale-95'
              : 'cursor-pointer hover:scale-105 active:scale-95'
          }`}
          style={{
            background: 'linear-gradient(145deg, #C4B5FD 0%, #8B5CF6 100%)',
            padding: '7px',
            boxShadow: '0 10px 24px rgba(109, 40, 217, 0.38), 0 0 0 4px rgba(255, 255, 255, 0.85)',
          }}
        >
          <span
            className="w-full h-full rounded-full flex items-center justify-center text-white font-bold text-xl sm:text-2xl tracking-wider"
            style={{
              background: 'linear-gradient(155deg, #A855F7 0%, #7C3AED 58%, #6D28D9 100%)',
              boxShadow: 'inset 0 4px 8px rgba(255,255,255,0.42), inset 0 -4px 8px rgba(76,29,149,0.4)',
            }}
          >
            {animating ? '抽取中' : '开始'}
          </span>
        </button>
      </div>
    </div>
  );
}
