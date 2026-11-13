import React, { useEffect, useMemo, useRef, useState } from 'react';
import { pickWeightedItem } from '../../utils/random.js';
import { soundEngine } from '../../utils/sound.js';
import { FoodIcon } from '../FoodIcon.jsx';

const CAPSULES = [
  { x: 24, y: 54, rot: -15, bottom: '#F472B6' },
  { x: 52, y: 58, rot: 22, bottom: '#A78BFA' },
  { x: 76, y: 52, rot: -8, bottom: '#FBBF24' },
  { x: 35, y: 74, rot: 14, bottom: '#34D399' },
  { x: 64, y: 72, rot: -26, bottom: '#60A5FA' },
  { x: 18, y: 78, rot: 8, bottom: '#FB7185' },
  { x: 82, y: 76, rot: 18, bottom: '#FACC15' },
  { x: 48, y: 38, rot: -10, bottom: '#C084FC' },
  { x: 30, y: 40, rot: 24, bottom: '#FDBA74' },
  { x: 68, y: 39, rot: -18, bottom: '#5EEAD4' },
];

export function GashaponMode({ items, excludedIds, isDrawing, onStartDraw, onDrawComplete, replayTrigger }) {
  const activeItems = useMemo(
    () => items.filter((item) => !excludedIds.has(item.id)),
    [items, excludedIds]
  );

  // stage: 'idle' | 'turning' | 'tumbling' | 'dropping' | 'opened'
  const [stage, setStage] = useState('idle');
  const [knobAngle, setKnobAngle] = useState(0);
  const [droppedColor, setDroppedColor] = useState('#A78BFA');
  const [revealedWinner, setRevealedWinner] = useState(null);

  const timersRef = useRef([]);
  const lastReplayRef = useRef(replayTrigger);

  useEffect(() => {
    return () => {
      timersRef.current.forEach((t) => clearTimeout(t));
    };
  }, []);

  const twistMachine = () => {
    if (stage !== 'idle' || isDrawing || activeItems.length === 0) return;

    const { winner } = pickWeightedItem(items, excludedIds);
    if (!winner) return;

    timersRef.current.forEach((t) => clearTimeout(t));
    timersRef.current = [];

    onStartDraw?.();
    const chosenCap = CAPSULES[Math.floor(Math.random() * CAPSULES.length)];
    setDroppedColor(chosenCap.bottom);
    setRevealedWinner(winner);
    setStage('turning');
    setKnobAngle((a) => a + 360);
    soundEngine.playKnobTurn();

    timersRef.current.push(
      setTimeout(() => {
        setStage('tumbling');
      }, 600)
    );

    timersRef.current.push(
      setTimeout(() => {
        setStage('dropping');
        soundEngine.playTick(1.1);
      }, 1900)
    );

    timersRef.current.push(
      setTimeout(() => {
        setStage('opened');
        soundEngine.playCapsulePop();
        soundEngine.playWinFanfare();
      }, 2750)
    );

    timersRef.current.push(
      setTimeout(() => {
        setStage('idle');
        onDrawComplete?.(winner);
      }, 3650)
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

  return (
    <div className="relative flex flex-col items-center justify-center select-none">
      {/* Machine Container */}
      <div className="relative flex flex-col items-center">
        {/* Top Purple Cap */}
        <div
          className="w-28 h-6 rounded-t-full border-2 border-white/80 z-10"
          style={{
            background: 'linear-gradient(135deg, #C084FC 0%, #7C3AED 100%)',
            boxShadow: '0 -2px 10px rgba(124, 58, 237, 0.25)',
          }}
        />

        {/* Transparent Glass Dome */}
        <div
          className="relative w-[248px] h-[248px] sm:w-[276px] sm:h-[276px] rounded-full -mt-2 overflow-hidden border-[5px] border-white/90"
          style={{
            background:
              'radial-gradient(circle at 30% 25%, rgba(255,255,255,0.92) 0%, rgba(243,232,255,0.58) 55%, rgba(216,180,254,0.45) 100%)',
            boxShadow:
              'inset 0 10px 24px rgba(255,255,255,0.85), inset 0 -14px 24px rgba(124,58,237,0.18), 0 18px 36px rgba(109,40,217,0.2)',
          }}
        >
          {/* Floating / Tumbling Capsules */}
          {CAPSULES.map((cap, idx) => {
            const tumbleOffset =
              stage === 'tumbling'
                ? `translate(${Math.sin(idx * 2.1) * 26}px, ${Math.cos(idx * 1.7) * 32 - 18}px) rotate(${cap.rot + idx * 75}deg)`
                : `rotate(${cap.rot}deg)`;

            return (
              <div
                key={idx}
                className="absolute w-12 h-12 sm:w-14 sm:h-14 -translate-x-1/2 -translate-y-1/2 rounded-full overflow-hidden shadow-md transition-transform duration-300"
                style={{
                  left: `${cap.x}%`,
                  top: `${cap.y}%`,
                  transform: tumbleOffset,
                  transitionDelay: stage === 'tumbling' ? `${(idx % 4) * 55}ms` : '0ms',
                  border: '2px solid rgba(255,255,255,0.85)',
                }}
              >
                <div className="w-full h-1/2 bg-white/75" />
                <div className="w-full h-1/2" style={{ backgroundColor: cap.bottom }} />
                <div className="absolute top-1.5 left-2 w-2.5 h-1.5 rounded-full bg-white/90 rotate-[-25deg]" />
              </div>
            );
          })}

          {/* Glass specular arc */}
          <div
            className="absolute top-4 left-6 w-20 h-10 rounded-full pointer-events-none rotate-[-28deg]"
            style={{
              background: 'linear-gradient(180deg, rgba(255,255,255,0.8) 0%, rgba(255,255,255,0) 100%)',
            }}
          />
        </div>

        {/* Lower Machine Base */}
        <div
          className="relative w-[224px] sm:w-[248px] -mt-6 pt-8 pb-5 px-5 rounded-[30px] border-4 border-white/85 flex flex-col items-center"
          style={{
            background: 'linear-gradient(155deg, #A855F7 0%, #7C3AED 60%, #5B21B6 100%)',
            boxShadow:
              '0 22px 40px -10px rgba(109, 40, 217, 0.4), inset 0 4px 10px rgba(255,255,255,0.35)',
          }}
        >
          {/* Rotary Knob */}
          <button
            type="button"
            onClick={twistMachine}
            disabled={busy || isDrawing || activeItems.length === 0}
            aria-label="拧动扭蛋机"
            className={`relative w-20 h-20 rounded-full border-4 border-white/90 flex items-center justify-center transition-all duration-500 ${
              busy || activeItems.length === 0
                ? 'cursor-not-allowed'
                : 'cursor-pointer hover:scale-105 active:scale-95'
            }`}
            style={{
              background: 'linear-gradient(145deg, #FEF08A 0%, #F59E0B 100%)',
              boxShadow: '0 8px 18px rgba(120, 53, 15, 0.35)',
              transform: `rotate(${knobAngle}deg)`,
            }}
          >
            <div className="w-4 h-12 rounded-full bg-white/90 shadow-inner" />
          </button>

          <span className="mt-2.5 text-xs font-bold tracking-wide text-purple-100">
            {activeItems.length === 0
              ? '请先添加菜品'
              : busy
              ? '扭蛋掉落中...'
              : '点击旋钮扭出惊喜'}
          </span>

          {/* Dispenser Chute */}
          <div
            className="mt-3 w-24 h-12 rounded-t-2xl rounded-b-lg border-2 border-purple-300/60 flex items-center justify-center"
            style={{
              background: 'linear-gradient(180deg, #3B0764 0%, #581C87 100%)',
              boxShadow: 'inset 0 4px 10px rgba(0,0,0,0.45)',
            }}
          >
            <div className="w-16 h-1.5 rounded-full bg-purple-400/40" />
          </div>
        </div>
      </div>

      {/* Foreground Capsule Drop & Pop Overlay */}
      {(stage === 'dropping' || stage === 'opened') && (
        <div className="fixed inset-0 z-30 flex items-center justify-center pointer-events-none">
          <div className="relative flex flex-col items-center justify-center">
            {stage === 'dropping' && (
              <div
                className="w-28 h-28 rounded-full overflow-hidden border-4 border-white shadow-2xl animate-bounce"
                style={{ boxShadow: '0 20px 45px rgba(109, 40, 217, 0.45)' }}
              >
                <div className="w-full h-1/2 bg-white/95" />
                <div className="w-full h-1/2" style={{ backgroundColor: droppedColor }} />
              </div>
            )}

            {stage === 'opened' && revealedWinner && (
              <div className="relative flex flex-col items-center animate-[popIn_0.35s_ease-out]">
                <div className="w-32 h-32 rounded-3xl bg-white/95 p-4 shadow-[0_20px_50px_rgba(124,58,237,0.4)] border-4 border-purple-300 flex items-center justify-center">
                  <FoodIcon iconKey={revealedWinner.iconKey} size={90} />
                </div>
                <span className="mt-3 px-5 py-1.5 rounded-full bg-purple-600 text-white font-bold text-lg shadow-lg">
                  {revealedWinner.name}
                </span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
