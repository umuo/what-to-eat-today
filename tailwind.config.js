/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      keyframes: {
        popIn: {
          '0%': { opacity: '0', transform: 'scale(0.82) translateY(8px)' },
          '100%': { opacity: '1', transform: 'scale(1) translateY(0)' },
        },
        floatSlow: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-6px)' },
        },
        shakeX: {
          '0%, 100%': { transform: 'translateX(0)' },
          '20%': { transform: 'translateX(-7px)' },
          '40%': { transform: 'translateX(7px)' },
          '60%': { transform: 'translateX(-5px)' },
          '80%': { transform: 'translateX(4px)' },
        },
        gashaTumble1: {
          '0%, 100%': { transform: 'translate(0px, 0px) rotate(0deg)' },
          '25%': { transform: 'translate(-22px, -46px) rotate(-95deg)' },
          '50%': { transform: 'translate(18px, -72px) rotate(-190deg)' },
          '75%': { transform: 'translate(-12px, -28px) rotate(-280deg)' },
        },
        gashaTumble2: {
          '0%, 100%': { transform: 'translate(0px, 0px) rotate(0deg)' },
          '25%': { transform: 'translate(26px, -54px) rotate(110deg)' },
          '50%': { transform: 'translate(-20px, -68px) rotate(215deg)' },
          '75%': { transform: 'translate(14px, -24px) rotate(305deg)' },
        },
        gashaTumble3: {
          '0%, 100%': { transform: 'translate(0px, 0px) rotate(0deg)' },
          '30%': { transform: 'translate(-16px, -64px) rotate(130deg)' },
          '65%': { transform: 'translate(24px, -38px) rotate(250deg)' },
        },
        capsuleDrop: {
          '0%': { opacity: '0', transform: 'translateY(-44px) scale(0.55) rotate(-18deg)' },
          '55%': { opacity: '1', transform: 'translateY(10px) scale(1.06) rotate(8deg)' },
          '78%': { transform: 'translateY(-6px) scale(0.98) rotate(-5deg)' },
          '100%': { opacity: '1', transform: 'translateY(0px) scale(1) rotate(0deg)' },
        },
        shellTopSplit: {
          '0%': { opacity: '1', transform: 'translate(0px, 0px) rotate(0deg) scale(1)' },
          '100%': { opacity: '0.95', transform: 'translate(-22px, -54px) rotate(-22deg) scale(0.94)' },
        },
        shellBottomSplit: {
          '0%': { opacity: '1', transform: 'translate(0px, 0px) rotate(0deg) scale(1)' },
          '100%': { opacity: '0.95', transform: 'translate(22px, 56px) rotate(18deg) scale(0.94)' },
        },
      },
      animation: {
        popIn: 'popIn 0.28s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        floatSlow: 'floatSlow 4.5s ease-in-out infinite',
        shakeX: 'shakeX 0.36s ease-in-out',
        gashaTumble1: 'gashaTumble1 0.48s ease-in-out infinite',
        gashaTumble2: 'gashaTumble2 0.54s ease-in-out infinite',
        gashaTumble3: 'gashaTumble3 0.44s ease-in-out infinite',
        capsuleDrop: 'capsuleDrop 0.58s cubic-bezier(0.22, 1, 0.36, 1) forwards',
        shellTopSplit: 'shellTopSplit 0.46s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        shellBottomSplit: 'shellBottomSplit 0.46s cubic-bezier(0.16, 1, 0.3, 1) forwards',
      },
    },
  },
  plugins: [],
};
