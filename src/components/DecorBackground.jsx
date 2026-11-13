import React from 'react';

export function DecorBackground({ sidebarCollapsed = false }) {
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
      {/* Soft lavender gradient canvas */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(circle at 38% 36%, #FAF8FF 0%, #F2ECFE 52%, #EAE2FC 100%)',
        }}
      />

      {/* Organic wavy pastel blobs matching mockup */}
      <svg
        viewBox="0 0 1440 900"
        preserveAspectRatio="none"
        className="absolute inset-0 w-full h-full opacity-80"
      >
        <path
          d="M-40 180 C120 120 180 280 80 390 C-10 490 -40 420 -40 420 Z"
          fill="#E5DCFC"
          opacity="0.55"
        />
        <path
          d="M-60 720 C140 640 310 730 420 920 L-60 920 Z"
          fill="#DFD4FB"
          opacity="0.72"
        />
        <circle cx="805" cy="465" r="88" fill="#E3D9FB" opacity="0.55" />
        <path
          d="M740 920 C850 760 1120 680 1480 790 L1480 920 Z"
          fill="#E1D6FC"
          opacity="0.68"
        />
      </svg>

      {/* Bottom-left Ramen bowl illustration + yellow spark lines */}
      <div className="hidden min-[920px]:block absolute left-4 lg:left-10 bottom-3 lg:bottom-6 w-[104px] lg:w-[150px] xl:w-[176px] animate-floatSlow">
        <svg
          width="46"
          height="36"
          viewBox="0 0 46 36"
          className="mx-auto mb-[-10px] ml-10"
        >
          <path
            d="M12 28 L8 10"
            stroke="#FBBF24"
            strokeWidth="4.5"
            strokeLinecap="round"
          />
          <path
            d="M27 26 L31 6"
            stroke="#FBBF24"
            strokeWidth="4.5"
            strokeLinecap="round"
          />
        </svg>
        <div className="relative">
          <div
            className="absolute bottom-1 left-1/2 -translate-x-1/2 w-[78%] h-5 rounded-full blur-sm"
            style={{ background: 'rgba(139, 92, 246, 0.2)' }}
          />
          <img
            src="/assets/illustrations/hero-noodles.webp"
            alt=""
            draggable={false}
            className="relative w-full h-auto drop-shadow-[0_12px_18px_rgba(109,40,217,0.16)]"
          />
        </div>
      </div>

      {/* Bottom-right-center Burger illustration + yellow spark lines */}
      <div
        className={`hidden min-[920px]:block absolute bottom-3 lg:bottom-6 w-[86px] lg:w-[116px] xl:w-[134px] animate-floatSlow transition-all duration-300 ${
          sidebarCollapsed
            ? 'right-8 lg:right-16'
            : 'right-[298px] lg:right-[372px] xl:right-[405px]'
        }`}
        style={{ animationDelay: '1.2s' }}
      >
        <svg
          width="46"
          height="34"
          viewBox="0 0 46 34"
          className="mx-auto mb-[-8px] mr-4"
        >
          <path
            d="M18 26 L21 8"
            stroke="#FBBF24"
            strokeWidth="4.2"
            strokeLinecap="round"
          />
          <path
            d="M32 28 L39 13"
            stroke="#FBBF24"
            strokeWidth="4.2"
            strokeLinecap="round"
          />
        </svg>
        <div className="relative">
          <div
            className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-[80%] h-4 rounded-full blur-sm"
            style={{ background: 'rgba(139, 92, 246, 0.22)' }}
          />
          <img
            src="/assets/illustrations/hero-burger.webp"
            alt=""
            draggable={false}
            className="relative w-full h-auto drop-shadow-[0_10px_16px_rgba(109,40,217,0.18)]"
          />
        </div>
      </div>
    </div>
  );
}
