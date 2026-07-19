/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // Azules institucionales de la Municipalidad de Gualán, extraídos del logo.
        // Anclas exactas (no tocar): 300 = azul claro, 500 = azul principal,
        // 600 = azul oscuro (hover), 900 = azul muy oscuro (texto/encabezados).
        primary: {
          50: '#f2fafd',
          100: '#e0f3fb',
          200: '#c2e5f4',
          300: '#88c8e4',
          400: '#27b1f1',
          500: '#0089c6',
          600: '#006eae',
          700: '#005a9e',
          800: '#004a94',
          900: '#003d8b',
        },
        // Dorado institucional (del logo). Es un acento, no un color principal:
        // usar en badges, detalles y texto corto sobre fondo oscuro, nunca en
        // botones de acción primaria ni en bloques largos de texto.
        dorado: {
          50: '#fffdf0',
          100: '#fffadb',
          200: '#fff5b2',
          300: '#ffee80',
          400: '#ffe73d',
          500: '#ffe000',
          600: '#e6b800',
          700: '#c28800',
          800: '#9f6604',
          900: '#7e4a07',
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
