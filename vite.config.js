import { defineConfig } from 'vite';

export default defineConfig({
  base: '/AtomVillage/', // Имя вашего репозитория
  build: {
    outDir: 'dist',
  },
  server: {
    https: true // Важно для работы с Telegram API
  }
}); 