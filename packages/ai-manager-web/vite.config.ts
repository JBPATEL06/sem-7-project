import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss() as any],
  server: {
    port: 5173,
    watch: {
      ignored: [
        '**/.ai-manager/**',
        '**/dist-server/**',
        '**/.tmp_projects/**',
        '**/*.sqlite',
        '**/*.enc',
        '**/*.db'
      ]
    },
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true
      }
    }
  }
});
