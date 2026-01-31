/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#4CAF50', // Green
          dark: '#388E3C',
          light: '#C8E6C9',
        },
        secondary: {
          DEFAULT: '#F8BBD0', // Pink
          dark: '#F48FB1',
          light: '#FCE4EC',
        },
        neutral: {
          bg: '#F5F5DC', // Beige
          card: '#FFFFFF',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
