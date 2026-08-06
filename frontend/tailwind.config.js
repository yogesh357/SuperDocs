/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: "#080A10",
        secondary: "#0F1322",
        cardbg: "#161B30",
        borderDark: "#262E4D",
        accentGold: "#FFB800",
        accentGoldHover: "#E3A008",
        accentPurple: "#8B5CF6",
        successGreen: "#00F090",
      },
      fontFamily: {
        display: ['Outfit', 'sans-serif'],
        body: ['Plus Jakarta Sans', 'sans-serif'],
      },
      boxShadow: {
        glow: '0 0 15px rgba(255, 184, 0, 0.15)',
      }
    },
  },
  plugins: [],
}
