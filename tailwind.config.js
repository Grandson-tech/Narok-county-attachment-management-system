/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './*.{html,js}',
    './pages/**/*.{html,js}',
    './components/**/*.html',
    './assets/js/**/*.js'
  ],
  theme: {
    extend: {
      colors: {
        county: {
          green: '#0f5c3a',
          gold: '#d4a72c',
          charcoal: '#1f2937'
        }
      }
    }
  },
  plugins: []
};
