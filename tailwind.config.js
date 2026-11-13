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
      },
      animation: {
        popIn: 'popIn 0.28s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        floatSlow: 'floatSlow 4.5s ease-in-out infinite',
        shakeX: 'shakeX 0.36s ease-in-out',
      },
    },
  },
  plugins: [],
};
