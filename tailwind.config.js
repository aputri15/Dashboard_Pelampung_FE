/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./admin/**/*.{html,js}",
    "./owner/**/*.{html,js}",
    "./assets/**/*.{js,css}"
  ],
  theme: {
    extend: {
      colors: {
        bgMain: '#0F172A',
        surface: '#1E293B',
        borderMain: '#334155',
        textMain: '#F1F5F9',
        textSub: '#CBD5E1',
        textMuted: '#64748B',
        primary: '#3B82F6',
        success: '#22C55E',
        warning: '#F59E0B',
        danger: '#EF4444',
      }
    },
  },
  plugins: [require("daisyui")],
  daisyui: {
    themes: ["light", "dark"],
  },
}
