/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#eef6ff',
          100: '#d9eaff',
          200: '#b5d4ff',
          300: '#85b6ff',
          400: '#4f8fff',
          500: '#2a6cf5',
          600: '#1c54d8',
          700: '#1a43ae',
          800: '#1a3a8a',
          900: '#1b336f',
        },
      },
      boxShadow: {
        card: '0 1px 2px rgba(17,24,39,.04), 0 4px 16px rgba(17,24,39,.06)',
      },
    },
  },
  plugins: [],
};
