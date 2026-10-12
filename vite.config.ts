import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // Göreli yollar: GitHub Pages alt klasöründe (/kayit-asistani/) de çalışsın
  base: './',
})
