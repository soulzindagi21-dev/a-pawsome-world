import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(() => {
    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      plugins: [react()],
      // NOTE: GEMINI_API_KEY / OPENAI_API_KEY are deliberately NOT defined here.
      // `define` inlines values into the client bundle, where anyone can read
      // them from the shipped JS. Both keys now live only in the ai-proxy Edge
      // Function's server-side environment. Never add them back to this block.
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});
