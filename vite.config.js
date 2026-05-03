import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  root: '.',
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        dashboard: resolve(__dirname, 'owner/dashboard.html'),
        upload: resolve(__dirname, 'admin/upload.html'),
        kelola: resolve(__dirname, 'admin/kelola.html'),
        log: resolve(__dirname, 'admin/log.html'),
        akun: resolve(__dirname, 'admin/akun.html'),
      }
    }
  }
});
