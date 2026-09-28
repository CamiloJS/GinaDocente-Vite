/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
    "./englishtech-ova-editor-complete/parts/**/*.{html,js}",
    "./public/ova-studio/**/*.html",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#fdf2f2',
          100: '#fde8e8',
          200: '#fbd5d5',
          300: '#f8b4b4',
          400: '#f98080',
          500: '#AD3333',
          600: '#942929',
          700: '#7a2222',
          800: '#611b1b',
          900: '#481414',
          950: '#2d0a0a',
        },
        slate: {
          850: '#15202b',
          900: '#0f172a',
          950: '#0a0f1d',
        },
      },
    },
  },
  plugins: [],
}
