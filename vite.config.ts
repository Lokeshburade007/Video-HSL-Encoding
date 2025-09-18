import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    // Exclude FFmpeg wasm libs from optimizer to avoid worker resolution issues
    exclude: ['lucide-react', '@ffmpeg/ffmpeg', '@ffmpeg/util', '@ffmpeg/core', '@ffmpeg/core-mt'],
  },
  worker: {
    format: 'es',
  },
});
