
import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    // Aumenta o limite para 2MB para acomodar bibliotecas de IA sem avisos
    chunkSizeWarningLimit: 2000,
    minify: 'esbuild',
    rollupOptions: {
      output: {
        // Função personalizada para garantir que cada biblioteca vá para seu próprio arquivo
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('react')) return 'vendor-react';
            if (id.includes('supabase')) return 'vendor-supabase';
            if (id.includes('google/genai')) return 'vendor-ai';
            return 'vendor-libs';
          }
        },
        chunkFileNames: 'assets/[name]-[hash].js',
        entryFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]'
      }
    }
  },
  server: {
    host: true,
    port: 5173
  }
});
