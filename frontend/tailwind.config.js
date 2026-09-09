/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        navy: {
          950: '#09090b',
          900: '#0c0c0e',
          800: '#141416',
          700: '#1c1c1f',
        },
      },
      fontFamily: {
        syne: ['Fraunces', 'Georgia', 'serif'],
        display: ['Fraunces', 'Georgia', 'serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
        sans: ['Figtree', 'system-ui', 'sans-serif'],
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-6px)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      },
      animation: {
        float: 'float 5s ease-in-out infinite',
        shimmer: 'shimmer 1.8s linear infinite',
      },
    },
  },
  plugins: [],
};
