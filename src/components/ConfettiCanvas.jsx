import React, { useEffect, useRef } from 'react';

const COLORS = ['#A855F7', '#F43F5E', '#FBBF24', '#34D399', '#60A5FA', '#FB923C'];

export function ConfettiCanvas({ active }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    if (!active) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let rafId = null;
    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    const particles = Array.from({ length: 90 }).map(() => ({
      x: canvas.width * (0.2 + Math.random() * 0.6),
      y: canvas.height * 0.42,
      vx: (Math.random() - 0.5) * 14,
      vy: -Math.random() * 13 - 4,
      size: 6 + Math.random() * 7,
      rot: Math.random() * 360,
      vRot: (Math.random() - 0.5) * 14,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      alpha: 1,
    }));

    const tick = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      let alive = false;

      particles.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.34;
        p.vx *= 0.985;
        p.rot += p.vRot;
        p.alpha = Math.max(0, p.alpha - 0.0085);

        if (p.alpha > 0.02 && p.y < canvas.height + 40) {
          alive = true;
          ctx.save();
          ctx.globalAlpha = p.alpha;
          ctx.translate(p.x, p.y);
          ctx.rotate((p.rot * Math.PI) / 180);
          ctx.fillStyle = p.color;
          ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size * 0.55);
          ctx.restore();
        }
      });

      if (alive) {
        rafId = requestAnimationFrame(tick);
      }
    };

    rafId = requestAnimationFrame(tick);
    return () => {
      window.removeEventListener('resize', resize);
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, [active]);

  if (!active) return null;
  return <canvas ref={canvasRef} className="fixed inset-0 z-40 pointer-events-none" />;
}
