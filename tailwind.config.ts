import type { Config } from 'tailwindcss';

export default {
  content: [
    './src/**/*.{js,jsx,ts,tsx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        spotify: {
          green: '#1db954',
          darkgreen: '#1aa34a',
          black: '#191414',
        }
      }
    },
  },
  plugins: [],
} satisfies Config;









