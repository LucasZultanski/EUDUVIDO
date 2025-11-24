/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'primary': '#50C878',
        'primary-dark': '#3da860',
        'dark-bg': '#23272a',
        'dark-surface': '#2c2f33',
        'text-main': '#ffffff',
        'text-secondary': '#99aab5',
        'neon-green': '#50C878',
        'main-white': '#ffffff',
      },
      fontFamily: {
        'poppins': ['Poppins', 'sans-serif'],
        'roboto': ['Roboto', 'sans-serif'],
        'sans': ['Poppins', 'sans-serif'],
      },
      boxShadow: {
        'card': '0 4px 20px rgba(80, 200, 120, 0.1)',
        'card-hover': '0 8px 30px rgba(80, 200, 120, 0.15)',
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-out',
      },
      backgroundImage: {
        'gradient-dark': 'linear-gradient(135deg, #2c2f33 0%, #23272a 100%)',
      },
    },
  },
  plugins: [],
}
