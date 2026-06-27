/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#eff8ff',
          100: '#dbeefe',
          200: '#bfdffd',
          300: '#93c9fc',
          400: '#60aaf8',
          500: '#3b8af4',
          600: '#256be9',
          700: '#1d56d6',
          800: '#1e47ad',
          900: '#1e3f88',
        },
        farmacia: {
          green: '#10b981',
          yellow: '#f59e0b',
          red: '#ef4444',
          expired: '#6b7280',
        },
      },
    },
  },
  plugins: [],
};
