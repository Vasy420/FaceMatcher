/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        navy: {
          950: '#0A0F1E',
          900: '#0D1528',
          800: '#111C35',
          700: '#162040',
        },
      },
      fontFamily: {
        syne: ['Syne', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
        sans: ['"DM Sans"', 'sans-serif'],
      },
      keyframes: {
        scan: {
          '0%': { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(100vh)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-8px)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        ping_slow: {
          '0%, 100%': { transform: 'scale(1)', opacity: '1' },
          '50%': { transform: 'scale(1.8)', opacity: '0' },
        },
      },
      animation: {
        scan: 'scan 4s linear infinite',
        float: 'float 5s ease-in-out infinite',
        shimmer: 'shimmer 2.5s linear infinite',
        ping_slow: 'ping_slow 2s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};
