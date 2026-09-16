import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig({
  plugins: [react(), tailwindcss() as any],
  define: {
    'process.env.IS_PREACT': JSON.stringify('false')
  },
  resolve: {
    alias: {
      '@excalidraw/excalidraw': path.resolve(
        __dirname,
        'node_modules/@excalidraw/excalidraw/dist/excalidraw.development.js'
      )
    }
  },
  server: {
    port: 5173,
    fs: {
      allow: ['..']
    },
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
        changeOrigin: true,
        configure: (proxy, _options) => {
          proxy.on('error', (_err, _req, res) => {
            if (!res.headersSent) {
              res.writeHead(503, {
                'Content-Type': 'application/json'
              });
              res.end(JSON.stringify({
                error: 'Backend Express server is starting up or temporarily offline.',
                code: 'SERVICE_UNAVAILABLE'
              }));
            }
          });
        }
      }
    }
  }
});
