import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  return {
    server: {
      port: 3000,
      host: '0.0.0.0',
      proxy: {
        '/upload': { target: 'http://127.0.0.1:8188', changeOrigin: true },
        '/prompt': { target: 'http://127.0.0.1:8188', changeOrigin: true },
        '/view': { target: 'http://127.0.0.1:8188', changeOrigin: true },
        '/system_stats': { target: 'http://127.0.0.1:8188', changeOrigin: true },
        '/ws': { target: 'ws://127.0.0.1:8188', ws: true, changeOrigin: true },
      }
    },
    plugins: [react()],
    define: {
      'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      }
    }
  };
});
