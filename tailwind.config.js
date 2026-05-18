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
        // Light mode base
        bgMain: '#F8FAFC',
        surface: '#FFFFFF',
        borderMain: '#E2E8F0',
        textMain: '#1E293B',
        textSub: '#475569',
        textMuted: '#94A3B8',
        // Per-page accent colors (Admin)
        accentUpload: '#4A90D9',   // Blue Sapphire - Upload Data
        accentKelola: '#2BAE8E',   // Teal Green   - Kelola Data
        accentLog: '#F5821F',      // Warm Orange  - Log Upload
        accentAkun: '#E91E63',     // Hot Pink     - Manajemen Akun
        // Semantic
        primary: '#4A90D9',
        success: '#22C55E',
        warning: '#F59E0B',
        danger: '#EF4444',
      }
    },
  },
  plugins: [require("daisyui")],
  daisyui: {
    themes: ["light"],
  },
}
