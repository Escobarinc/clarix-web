import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  build: {
    target: 'es2020',
    minify: 'terser',
    cssMinify: true,
    terserOptions: {
      compress: { drop_console: true, drop_debugger: true }
    },
    rollupOptions: {
      output: {
        manualChunks: {
          three: ['three'],
          motion: ['gsap', 'lenis']
        }
      }
    }
  },
  server: {
    host: true,
    port: 5173
  }
});
