/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Institucional: violeta (capucha de la mascota) + dorado (emblema).
        brand: {
          50: '#faf6ff',
          100: '#f3e9ff',
          200: '#e7d5ff',
          300: '#d5b5ff',
          400: '#be8fff',
          500: '#a45cff',
          600: '#8b2fe6',
          700: '#7421c4',
          800: '#601da3',
          900: '#4e1a84',
        },
        gold: {
          300: '#ffd76a',
          400: '#ffc431',
          500: '#f0b010',
          600: '#d19406',
          700: '#a97705',
        },
        paper: '#fbf8f4',
        ink: {
          800: '#1c1917',
          900: '#0c0a09',
        },
      },
      fontFamily: {
        display: ['Roboto', 'system-ui', 'sans-serif'],
        sans: ['Roboto', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
