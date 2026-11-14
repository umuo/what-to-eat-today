import React, { useEffect, useMemo, useRef, useState } from 'react';
import { pickWeightedItem } from '../../utils/random.js';
import { soundEngine } from '../../utils/sound.js';
import { FoodIcon } from '../FoodIcon.jsx';

const TUMBLE_ANIM_CLASSES = {
  gashaTumble1: 'animate-gashaTumble1',
  gashaTumble2: 'animate-gashaTumble2',
  gashaTumble3: 'animate-gashaTumble3',
};

const PALETTES = {
  rose: { light: '#FBCFE8', main: '#F472B6', dark: '#DB2777' },
  violet: { light: '#DDD6FE', main: '#A78BFA', dark: '#7C3AED' },
  amber: { light: '#FEF08A', main: '#FBBF24', dark: '#D97706' },
  mint: { light: '#A7F3D0', main: '#34D399', dark: '#059669' },
  sky: { light: '#BFDBFE', main: '#60A5FA', dark: '#2563EB' },
  coral: { light: '#FECDD3', main: '#FB7185', dark: '#E11D48' },
  tangerine: { light: '#FED7AA', main: '#FB923C', dark: '#EA580C' },
  aqua: { light: '#99F6E4', main: '#2DD4BF', dark: '#0D9488' },
};

const CAPSULES = [
  // Back-row softer capsules resting deeper inside the glass bowl
  { x: 28, y: 50, rot: -22, layer: 'back', anim: 'gashaTumble2', delayMs: 40, ...PALETTES.violet },
  { x: 50, y: 48, rot: 14, layer: 'back', anim: 'gashaTumble3', delayMs: 110, ...PALETTES.tangerine },
  { x: 72, y: 51, rot: -16, layer: 'back', anim: 'gashaTumble1', delayMs: 80, ...PALETTES.aqua },
  { x: 38, y: 63, rot: 26, layer: 'back', anim: 'gashaTumble1', delayMs: 150, ...PALETTES.sky },
  { x: 64, y: 62, rot: -24, layer: 'back', anim: 'gashaTumble2', delayMs: 20, ...PALETTES.coral },
  // Front-row foreground glossy capsules
  { x: 20, y: 69, rot: 12, layer: 'front', anim: 'gashaTumble1', delayMs: 0, ...PALETTES.rose },
  { x: 47, y: 68, rot: -10, layer: 'front', anim: 'gashaTumble2', delayMs: 65, ...PALETTES.amber },
  { x: 78, y: 68, rot: 20, layer: 'front', anim: 'gashaTumble3', delayMs: 130, ...PALETTES.mint },
  { x: 29, y: 80, rot: -18, layer: 'front', anim: 'gashaTumble3', delayMs: 95, ...PALETTES.sky },
  { x: 51, y: 82, rot: 8, layer: 'front', anim: 'gashaTumble1', delayMs: 45, ...PALETTES.rose },
  { x: 71, y: 80, rot: 24, layer: 'front', anim: 'gashaTumble2', delayMs: 120, ...PALETTES.violet },
  { x: 38, y: 74, rot: -12, layer: 'front', anim: 'gashaTumble2', delayMs: 170, ...PALETTES.amber },
];

const DIAL_TICKS = [0, 45, 90, 135, 180, 225, 270, 315];

function CapsuleBall({ palette, iconKey, iconSize = 20, sizeClass = '', rot = 0, faintIcon = false, className = '' }) {
  return (
    <div
      className={`relative rounded-full overflow-hidden border-2 border-white/90 ${sizeClass} ${className}`}
      style={{
        transform: `rotate(${rot}deg)`,
        boxShadow: '0 6px 12px rgba(76, 29, 149, 0.28), inset 0 -3px 6px rgba(0, 0, 0, 0.14)',
      }}
    >
      {/* Translucent top dome revealing mini food icon */}
      <div
        className="relative w-full h-[50%] flex items-end justify-center overflow-hidden"
        style={{
          background:
            'radial-gradient(circle at 35% 25%, rgba(255,255,255,0.96) 0%, rgba(245,243,255,0.78) 65%, rgba(221,214,254,0.68) 100%)',
        }}
      >
        {iconKey && (
          <div className={`translate-y-1 ${faintIcon ? 'opacity-80' : 'opacity-95'}`}>
            <FoodIcon iconKey={iconKey} size={iconSize} />
          </div>
        )}
      </div>

      {/* Embossed white equatorial snap seam */}
      <div
        className="w-full h-[3px] bg-white/95 relative z-10"
        style={{ boxShadow: '0 1px 2px rgba(91, 33, 182, 0.22)' }}
      />

      {/* 3D radial-shaded colored bottom shell */}
      <div
        className="w-full flex-1 h-[calc(50%-3px)]"
        style={{
          background: `radial-gradient(circle at 35% 25%, ${palette.light} 0%, ${palette.main} 62%, ${palette.dark} 100%)`,
        }}
      />

      {/* Top-left specular catchlight */}
      <div className="pointer-events-none absolute top-1.5 left-2 w-2.5 h-1.5 rounded-full bg-white/95 rotate-[-28deg]" />
    </div>
  );
}

export function GashaponMode({ items, excludedIds, isDrawing, onStartDraw, onDrawComplete, replayTrigger }) {
  const activeItems = useMemo(
    () => items.filter((item) => !excludedIds.has(item.id)),
    [items, excludedIds]
  );

  // stage: 'idle' | 'turning' | 'tumbling' | 'dropping' | 'opened'
  const [stage, setStage] = useState('idle');
  const [knobAngle, setKnobAngle] = useState(0);
  const [ledPhase, setLedPhase] = useState(0);
  const [droppedPalette, setDroppedPalette] = useState(PALETTES.violet);
  const [revealedWinner, setRevealedWinner] = useState(null);

  const timersRef = useRef([]);
  const lastReplayRef = useRef(replayTrigger);

  useEffect(() => {
    return () => {
      timersRef.current.forEach((t) => clearTimeout(t));
    };
  }, []);

  // Marquee LED chasing animation
  useEffect(() => {
    const intervalMs = stage === 'turning' || stage === 'tumbling' ? 140 : 620;
    const ledTimer = setInterval(() => {
      setLedPhase((p) => (p + 1) % 2);
    }, intervalMs);
    return () => clearInterval(ledTimer);
  }, [stage]);

  const twistMachine = () => {
    if (stage !== 'idle' || isDrawing || activeItems.length === 0) return;

    const { winner } = pickWeightedItem(items, excludedIds);
    if (!winner) return;

    timersRef.current.forEach((t) => clearTimeout(t));
    timersRef.current = [];

    onStartDraw?.();
    const chosenCap = CAPSULES[Math.floor(Math.random() * CAPSULES.length)];
    setDroppedPalette({ light: chosenCap.light, main: chosenCap.main, dark: chosenCap.dark });
    setRevealedWinner(winner);
    setStage('turning');
    setKnobAngle((a) => a + 360);
    soundEngine.playKnobTurn();

    timersRef.current.push(
      setTimeout(() => {
        setStage('tumbling');
      }, 550)
    );

    // 4 playful plastic capsule collision ticks during tumbling
    [
      { delay: 720, pitch: 0.92 },
      { delay: 980, pitch: 1.08 },
      { delay: 1260, pitch: 1.0 },
      { delay: 1540, pitch: 1.18 },
    ].forEach(({ delay, pitch }) => {
      timersRef.current.push(
        setTimeout(() => {
          soundEngine.playTick(pitch);
        }, delay)
      );
    });

    timersRef.current.push(
      setTimeout(() => {
        setStage('dropping');
        soundEngine.playTick(1.15);
      }, 1850)
    );

    timersRef.current.push(
      setTimeout(() => {
        setStage('opened');
        soundEngine.playCapsulePop();
        soundEngine.playWinFanfare();
      }, 2500)
    );

    timersRef.current.push(
      setTimeout(() => {
        setStage('idle');
        onDrawComplete?.(winner);
      }, 3450)
    );
  };

  useEffect(() => {
    if (replayTrigger !== lastReplayRef.current) {
      lastReplayRef.current = replayTrigger;
      if (replayTrigger > 0) {
        twistMachine();
      }
    }
  });

  const busy = stage !== 'idle';
  const disabledAction = busy || isDrawing || activeItems.length === 0;
  const isChuteActive = stage === 'dropping' || stage === 'opened';

  const ctaLabel =
    activeItems.length === 0
      ? '请先添加菜品'
      : stage === 'turning' || stage === 'tumbling'
      ? '扭蛋翻滚中...'
      : isChuteActive
      ? '惊喜开启中...'
      : '🔮 拧动扭蛋机';

  return (
    <div className="relative flex flex-col items-center justify-center select-none w-full max-w-[360px] mx-auto px-2">
      {/* Ground Ambient Shadow */}
      <div className="relative flex flex-col items-center">
        {/* 1. Top Crown Lid & Golden Finial */}
        <div className="flex flex-col items-center z-20 -mb-2.5">
          {/* Golden Spherical Finial */}
          <div
            className="relative w-6 h-6 sm:w-7 sm:h-7 rounded-full border-2 border-white/90"
            style={{
              background: 'radial-gradient(circle at 32% 28%, #FEF9C3 0%, #F59E0B 60%, #B45309 100%)',
              boxShadow: '0 4px 10px rgba(180, 83, 9, 0.35)',
            }}
          >
            <div className="absolute top-1 left-1.5 w-2 h-1.5 rounded-full bg-white/95" />
          </div>
          {/* Metallic Stem */}
          <div
            className="w-3.5 h-2 -mt-0.5 rounded-sm border-x border-white/70"
            style={{ background: 'linear-gradient(90deg, #D8B4FE 0%, #F5F3FF 50%, #A855F7 100%)' }}
          />
          {/* Tiered Glossy Dome Cap + Golden Nameplate */}
          <div
            className="relative w-[152px] sm:w-[184px] h-8 sm:h-9 -mt-0.5 rounded-t-full border-[3px] border-white/90 flex items-center justify-center"
            style={{
              background: 'linear-gradient(180deg, #C084FC 0%, #9333EA 58%, #6D28D9 100%)',
              boxShadow: '0 6px 14px rgba(109, 40, 217, 0.3), inset 0 3px 6px rgba(255,255,255,0.45)',
            }}
          >
            <div
              className="mt-1 px-3 py-0.5 rounded-full border border-white/85 flex items-center gap-1.5 shadow-sm"
              style={{ background: 'linear-gradient(135deg, #FEF08A 0%, #F59E0B 100%)' }}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
              <span className="text-[10px] sm:text-[11px] font-black tracking-wider text-[#7C2D12]">
                扭蛋美食屋
              </span>
              <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
            </div>
          </div>
        </div>

        {/* 2. Crystal 3D Spherical Glass Globe */}
        <div
          className="relative w-[224px] h-[224px] min-[360px]:w-[248px] min-[360px]:h-[248px] sm:w-[278px] sm:h-[278px] rounded-full overflow-hidden border-[5px] border-white/90 z-10"
          style={{
            background:
              'radial-gradient(circle at 30% 24%, rgba(255,255,255,0.96) 0%, rgba(245,236,255,0.72) 48%, rgba(221,214,254,0.52) 78%, rgba(167,139,250,0.46) 100%)',
            boxShadow:
              'inset 0 14px 28px rgba(255,255,255,0.92), inset 0 -18px 28px rgba(109,40,217,0.22), 0 18px 36px rgba(109,40,217,0.2)',
          }}
        >
          {/* Soft interior floor glow behind capsules */}
          <div
            className="absolute inset-x-4 bottom-2 h-24 rounded-full pointer-events-none"
            style={{
              background: 'radial-gradient(ellipse at center, rgba(167,139,250,0.25) 0%, transparent 72%)',
            }}
          />

          {/* 12 Layered 3D Food Capsules (3-div isolation preserves left/top centering during CSS animations) */}
          {activeItems.length === 0 ? (
            <div className="absolute inset-0 z-10 flex items-center justify-center p-6">
              <div className="rounded-2xl bg-white/85 backdrop-blur-sm border border-purple-200 px-4 py-3 text-center shadow-sm">
                <p className="text-xs sm:text-sm font-bold text-[#4C1D95]">菜单暂无可抽菜品</p>
                <p className="mt-1 text-[11px] text-purple-500">请在右侧恢复或添加选项</p>
              </div>
            </div>
          ) : (
            CAPSULES.map((cap, idx) => {
              const capsuleFood = activeItems[idx % activeItems.length];
              const animClass = stage === 'tumbling' ? TUMBLE_ANIM_CLASSES[cap.anim] : '';
              const isBack = cap.layer === 'back';

              return (
                <div
                  key={idx}
                  className="absolute -translate-x-1/2 -translate-y-1/2"
                  style={{
                    left: `${cap.x}%`,
                    top: `${cap.y}%`,
                    zIndex: isBack ? 6 : 12,
                  }}
                >
                  <div
                    className={animClass}
                    style={stage === 'tumbling' ? { animationDelay: `${cap.delayMs}ms` } : undefined}
                  >
                    <CapsuleBall
                      palette={cap}
                      iconKey={capsuleFood?.iconKey}
                      iconSize={20}
                      rot={cap.rot}
                      sizeClass={`w-11 h-11 min-[360px]:w-12 min-[360px]:h-12 sm:w-[54px] sm:h-[54px] ${
                        isBack ? 'scale-90 opacity-90' : ''
                      }`}
                    />
                  </div>
                </div>
              );
            })
          )}

          {/* SVG Specular Glass Arc & Rim Reflection */}
          <svg
            viewBox="0 0 260 260"
            className="absolute inset-0 w-full h-full pointer-events-none z-20"
            aria-hidden="true"
          >
            <path
              d="M 48 92 A 96 96 0 0 1 134 26"
              fill="none"
              stroke="rgba(255,255,255,0.86)"
              strokeWidth="10"
              strokeLinecap="round"
            />
            <circle cx="38" cy="116" r="5.5" fill="rgba(255,255,255,0.88)" />
            <path
              d="M 192 214 A 96 96 0 0 0 232 146"
              fill="none"
              stroke="rgba(255,255,255,0.45)"
              strokeWidth="4.5"
              strokeLinecap="round"
            />
          </svg>
        </div>

        {/* 3. Metallic Neck Collar Ring */}
        <div
          className="relative w-[180px] sm:w-[214px] h-5 -mt-4 z-10 rounded-full border-2 border-white/90 flex items-center justify-between px-5"
          style={{
            background: 'linear-gradient(180deg, #F5F3FF 0%, #DDD6FE 48%, #A78BFA 100%)',
            boxShadow: '0 4px 10px rgba(91, 33, 182, 0.25), inset 0 2px 3px rgba(255,255,255,0.9)',
          }}
        >
          {[0, 1, 2, 3].map((rivet) => (
            <span
              key={rivet}
              className="w-1.5 h-1.5 rounded-full bg-purple-400/85 border border-white/80"
            />
          ))}
        </div>

        {/* 4. Sculpted Arcade Cabinet Body */}
        <div
          className={`relative w-[232px] min-[360px]:w-[258px] sm:w-[294px] -mt-2 pt-4 pb-3.5 px-3 sm:px-3.5 rounded-[30px] border-4 border-white/90 flex flex-col items-center z-[5] ${
            stage === 'turning' ? 'animate-shakeX' : ''
          }`}
          style={{
            background: 'linear-gradient(158deg, #A855F7 0%, #7C3AED 56%, #5B21B6 100%)',
            boxShadow:
              '0 22px 40px -10px rgba(109, 40, 217, 0.45), inset 0 4px 10px rgba(255,255,255,0.38)',
          }}
        >
          {/* Recessed Control Bezel */}
          <div
            className="w-full rounded-2xl bg-[#4C1D95]/65 border border-purple-300/35 p-3 sm:p-3.5 flex flex-col items-center"
            style={{ boxShadow: 'inset 0 4px 12px rgba(30, 10, 60, 0.35)' }}
          >
            {/* Top Status & Coin Strip */}
            <div className="w-full flex items-center justify-between gap-1.5 mb-2.5">
              {/* Candidate Count Pill */}
              <div className="px-2 py-0.5 rounded-full bg-white/15 border border-white/20 flex items-center gap-1">
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    activeItems.length > 0 ? 'bg-emerald-300 shadow-[0_0_6px_#6EE7B7]' : 'bg-amber-300'
                  }`}
                />
                <span className="text-[10px] font-bold text-purple-50 whitespace-nowrap">
                  候选 {activeItems.length} 款
                </span>
              </div>

              {/* 5 Chasing Marquee LEDs */}
              <div className="flex items-center gap-1">
                {[0, 1, 2, 3, 4].map((dot) => {
                  const lit = stage === 'opened' || dot % 2 === ledPhase;
                  return (
                    <span
                      key={dot}
                      className={`w-2 h-2 rounded-full transition-colors duration-150 ${
                        lit ? 'bg-yellow-300 shadow-[0_0_8px_#FDE047]' : 'bg-purple-300/45'
                      }`}
                    />
                  );
                })}
              </div>

              {/* 3D Golden Coin-Slot Badge */}
              <div
                className="px-1.5 py-0.5 rounded-md border border-yellow-100/80 flex items-center gap-1 shadow-sm"
                style={{ background: 'linear-gradient(145deg, #FEF08A 0%, #F59E0B 100%)' }}
              >
                <span className="w-1 h-3 rounded-full bg-[#3B0764] shadow-inner" />
                <span className="text-[9px] font-black tracking-tight text-[#7C2D12]">FREE</span>
              </div>
            </div>

            {/* Center 3D Mechanical Ratchet Dial */}
            <button
              type="button"
              onClick={twistMachine}
              disabled={disabledAction}
              aria-label="拧动扭蛋机"
              className={`group relative w-[86px] h-[86px] sm:w-[98px] sm:h-[98px] rounded-full flex items-center justify-center border-[3px] border-purple-200/90 transition-transform duration-200 ${
                disabledAction
                  ? 'cursor-not-allowed opacity-90'
                  : 'cursor-pointer hover:scale-105 active:scale-95'
              }`}
              style={{
                background: 'radial-gradient(circle at 35% 30%, #FFFFFF 0%, #EDE9FE 72%, #DDD6FE 100%)',
                boxShadow:
                  '0 10px 20px rgba(30, 10, 60, 0.35), inset 0 3px 6px rgba(255,255,255,0.95)',
              }}
            >
              {/* 8 Radial Rim Tick Dots */}
              {DIAL_TICKS.map((deg) => (
                <span
                  key={deg}
                  className="absolute w-1.5 h-1.5 rounded-full bg-purple-400/70 pointer-events-none"
                  style={{
                    transform: `rotate(${deg}deg) translateY(-37px)`,
                  }}
                />
              ))}

              {/* Subtle Curved Clockwise Guidance Arrow */}
              <svg
                viewBox="0 0 100 100"
                className="absolute inset-0 w-full h-full pointer-events-none opacity-45"
                aria-hidden="true"
              >
                <path
                  d="M 24 34 A 31 31 0 0 1 74 30"
                  fill="none"
                  stroke="#7C3AED"
                  strokeWidth="3"
                  strokeLinecap="round"
                />
                <polyline
                  points="70,22 76,31 66,34"
                  fill="none"
                  stroke="#7C3AED"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>

              {/* Rotating 3D Golden Hub + Winged Grip Handle */}
              <div
                className="relative w-14 h-14 sm:w-16 sm:h-16 rounded-full border-2 border-white/95 flex items-center justify-center"
                style={{
                  background: 'radial-gradient(circle at 32% 28%, #FEF9C3 0%, #FBBF24 55%, #D97706 100%)',
                  boxShadow: '0 6px 14px rgba(146, 64, 14, 0.38), inset 0 2px 4px rgba(255,255,255,0.7)',
                  transform: `rotate(${knobAngle}deg)`,
                  transition: 'transform 560ms cubic-bezier(0.34, 1.4, 0.64, 1)',
                }}
              >
                {/* Winged Horizontal Grip Bar with 3 Tactile Ridges & Center Cap */}
                <div
                  className="relative w-[72px] sm:w-[82px] h-6 rounded-full border-2 border-white/95 flex items-center justify-center gap-2.5 px-2"
                  style={{
                    background: 'linear-gradient(180deg, #FFFFFF 0%, #FEF3C7 45%, #F59E0B 100%)',
                    boxShadow: '0 4px 10px rgba(120, 53, 15, 0.32)',
                  }}
                >
                  <span className="w-1 h-3 rounded-full bg-amber-600/35" />
                  <span className="w-3.5 h-3.5 rounded-full bg-gradient-to-b from-purple-400 to-purple-700 border border-white shadow-sm" />
                  <span className="w-1 h-3 rounded-full bg-amber-600/35" />
                </div>
              </div>
            </button>

            {/* Recessed Dispenser Chute with Swinging PUSH Flap */}
            <div
              className="mt-2.5 w-[116px] sm:w-[132px] h-12 sm:h-14 rounded-2xl border-2 border-purple-300/55 bg-[#2E1065] overflow-hidden relative flex items-center justify-center"
              style={{ boxShadow: 'inset 0 8px 14px rgba(0, 0, 0, 0.58)' }}
            >
              {/* Top Metallic Hinge Bar */}
              <div
                className="absolute top-0 inset-x-0 h-2 bg-gradient-to-b from-purple-200 to-purple-400 z-20"
                style={{ boxShadow: '0 2px 4px rgba(0,0,0,0.35)' }}
              />

              {/* Bouncing Mini Capsule Inside Chute Bay During Dropping */}
              {stage === 'dropping' && (
                <div className="relative z-10 animate-bounce mt-1.5">
                  <CapsuleBall palette={droppedPalette} sizeClass="w-8 h-8" rot={-14} />
                </div>
              )}

              {/* Frosted Translucent PUSH Door Flap */}
              <div
                className={`absolute inset-x-1.5 top-1.5 bottom-1 rounded-xl border border-white/45 flex items-center justify-center z-10 transition-all duration-300 origin-top ${
                  isChuteActive ? '-translate-y-2 scale-y-50 opacity-55' : 'translate-y-0 scale-y-100 opacity-95'
                }`}
                style={{
                  background:
                    'linear-gradient(180deg, rgba(243,232,255,0.34) 0%, rgba(167,139,250,0.2) 100%)',
                  backdropFilter: 'blur(2px)',
                }}
              >
                <span className="text-[10px] font-black tracking-[0.2em] text-purple-100/90 drop-shadow-sm">
                  PUSH
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* 5. Molded Base Pedestal & Rubber Feet */}
        <div
          className="relative w-[248px] min-[360px]:w-[276px] sm:w-[312px] h-4 -mt-1.5 rounded-full border-2 border-white/85 z-[6]"
          style={{
            background: 'linear-gradient(180deg, #C084FC 0%, #7C3AED 55%, #4C1D95 100%)',
            boxShadow: '0 8px 18px rgba(76, 29, 149, 0.35)',
          }}
        />
        <div className="w-[186px] sm:w-[228px] flex items-center justify-between px-4 -mt-0.5 z-[4]">
          <div className="w-10 h-2.5 rounded-b-lg bg-[#3B0764] shadow-md" />
          <div className="w-10 h-2.5 rounded-b-lg bg-[#3B0764] shadow-md" />
        </div>
      </div>

      {/* Bottom Golden-Amber CTA Pill Button */}
      <button
        type="button"
        onClick={twistMachine}
        disabled={disabledAction}
        className={`mt-3.5 px-6 py-2.5 rounded-full font-bold text-sm sm:text-base text-[#581C87] border-2 border-white/90 transition-all duration-200 ${
          disabledAction
            ? 'opacity-70 cursor-not-allowed bg-yellow-200'
            : 'cursor-pointer bg-gradient-to-b from-[#FEF08A] to-[#FBBF24] hover:scale-105 active:scale-95 shadow-[0_8px_18px_rgba(180,83,9,0.32)]'
        }`}
      >
        {ctaLabel}
      </button>

      {/* 6. Stage-Centered Two-Half Capsule Split Reveal Overlay */}
      {(stage === 'dropping' || stage === 'opened') && (
        <div className="absolute inset-0 z-30 flex items-center justify-center pointer-events-none">
          <div className="relative flex flex-col items-center justify-center">
            {stage === 'dropping' && (
              <div className="relative flex items-center justify-center">
                <div
                  className="absolute w-40 h-40 rounded-full blur-xl opacity-75"
                  style={{
                    background: `radial-gradient(circle, ${droppedPalette.light} 0%, transparent 70%)`,
                  }}
                />
                <div className="animate-capsuleDrop relative">
                  <CapsuleBall
                    palette={droppedPalette}
                    iconKey={revealedWinner?.iconKey}
                    iconSize={44}
                    faintIcon
                    sizeClass="w-28 h-28 sm:w-32 sm:h-32 !border-4"
                  />
                </div>
              </div>
            )}

            {stage === 'opened' && revealedWinner && (
              <div className="relative flex flex-col items-center justify-center">
                {/* Golden Starburst Rays */}
                <svg
                  viewBox="0 0 200 200"
                  className="absolute w-56 h-56 sm:w-64 sm:h-64 -z-10 animate-[spin_9s_linear_infinite] opacity-90"
                  aria-hidden="true"
                >
                  {[0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330].map((deg) => (
                    <polygon
                      key={deg}
                      points="100,100 91,12 109,12"
                      fill="rgba(253, 224, 71, 0.34)"
                      transform={`rotate(${deg} 100 100)`}
                    />
                  ))}
                </svg>

                {/* Split Upper Translucent Shell */}
                <div
                  className="w-24 h-12 sm:w-28 sm:h-14 rounded-t-full border-4 border-white/95 animate-shellTopSplit shadow-xl pointer-events-none"
                  style={{
                    background:
                      'radial-gradient(circle at 35% 25%, rgba(255,255,255,0.96) 0%, rgba(233,213,255,0.82) 100%)',
                  }}
                />

                {/* Revealed Center Prize Card */}
                <div className="relative -my-7 z-10 flex flex-col items-center animate-popIn">
                  <div
                    className="w-28 h-28 sm:w-32 sm:h-32 rounded-3xl bg-white/95 p-3.5 border-4 border-purple-300 flex items-center justify-center"
                    style={{
                      boxShadow:
                        '0 20px 50px rgba(109, 40, 217, 0.42), 0 0 0 6px rgba(255, 255, 255, 0.55)',
                    }}
                  >
                    <FoodIcon iconKey={revealedWinner.iconKey} size={82} />
                  </div>
                  <span className="mt-2.5 px-5 py-1.5 rounded-full bg-gradient-to-r from-purple-600 to-violet-600 text-white font-bold text-base sm:text-lg shadow-lg border border-white/80 whitespace-nowrap">
                    {revealedWinner.name}
                  </span>
                </div>

                {/* Split Lower Colored Shell */}
                <div
                  className="w-24 h-12 sm:w-28 sm:h-14 rounded-b-full border-4 border-white/95 animate-shellBottomSplit shadow-xl pointer-events-none"
                  style={{
                    background: `radial-gradient(circle at 35% 25%, ${droppedPalette.light} 0%, ${droppedPalette.main} 62%, ${droppedPalette.dark} 100%)`,
                  }}
                />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
