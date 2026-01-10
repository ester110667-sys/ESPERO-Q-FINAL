
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  define: {
    // Define apenas o necessário para evitar erros de 'process is not defined'
    // e permite que a API_KEY seja injetada se estiver disponível no ambiente de build
    'process.env.API_KEY': JSON.stringify(process.env.API_KEY || ''),
    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'development'),
  },
  build: {
    chunkSizeWarningLimit: 2000,
    minify: 'esbuild',
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('react')) return 'vendor-react';
            if (id.includes('supabase')) return 'vendor-supabase';
            if (id.includes('google/genai')) return 'vendor-ai';
            return 'vendor-libs';
          }
        }
      }
    }
  },
  server: {
    host: true,
    port: 5173
  }
});
