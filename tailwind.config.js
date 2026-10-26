/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        navy: {
          950: '#050b1a',
          900: '#0a1224',
          850: '#0d1830',
          800: '#111d38',
          700: '#1a2a4d',
          600: '#243659',
          500: '#2a4570',
        },
        accent: {
          cyan: '#06b6d4',
          blue: '#3b82f6',
          teal: '#14b8a6',
          green: '#10b981',
          amber: '#f59e0b',
          red: '#ef4444',
          purple: '#a78bfa',
        },
      },
      fontFamily: {
        sans: ['Space Grotesk', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      animation: {
        'fade-in': 'fade-in 0.4s ease-out forwards',
        'slide-in': 'slide-in 0.3s ease-out forwards',
      },
    },
  },
  plugins: [],
};
