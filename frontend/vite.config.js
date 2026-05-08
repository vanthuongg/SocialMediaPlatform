// [auto] Vite build config
import { defineConfig, createLogger } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Suppress expected proxy noise in dev (client disconnect / backend restart)
const SUPPRESSED = ['ECONNABORTED', 'ECONNRESET', 'ECONNREFUSED'];
const logger = createLogger();
const originalError = logger.error.bind(logger);
logger.error = (msg, options) => {
  if (SUPPRESSED.some((code) => msg.includes(code))) return;
  originalError(msg, options);
};
const originalWarn = logger.warn.bind(logger);
logger.warn = (msg, options) => {
  if (SUPPRESSED.some((code) => msg.includes(code))) return;
  originalWarn(msg, options);
};

export default defineConfig({
  customLogger: logger,
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5174,
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
      '/socket.io': {
        target: 'http://localhost:5000',
        changeOrigin: true,
        ws: true,
        rewriteWsOrigin: true,
      },
    },
  },
});
