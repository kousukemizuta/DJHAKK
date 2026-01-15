import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  root: 'public',
  base: '/',
  
  build: {
    outDir: '../dist',
    emptyOutDir: true,
    
    rollupOptions: {
      input: {
        // HTML Pages
        index: resolve(__dirname, 'public/index.html'),
        timeline: resolve(__dirname, 'public/timeline.html'),
        events: resolve(__dirname, 'public/events.html'),
        productions: resolve(__dirname, 'public/productions.html'),
        place: resolve(__dirname, 'public/place.html'),
        messages: resolve(__dirname, 'public/messages.html'),
        chat: resolve(__dirname, 'public/chat.html'),
        create: resolve(__dirname, 'public/create.html'),
        profile: resolve(__dirname, 'public/profile.html'),
      },
      
      output: {
        // JS chunks
        entryFileNames: 'js/[name]-[hash].js',
        chunkFileNames: 'js/chunks/[name]-[hash].js',
        assetFileNames: (assetInfo) => {
          const ext = assetInfo.name.split('.').pop();
          if (/css/i.test(ext)) {
            return 'css/[name]-[hash][extname]';
          }
          if (/png|jpe?g|svg|gif|webp|ico/i.test(ext)) {
            return 'images/[name]-[hash][extname]';
          }
          if (/woff2?|eot|ttf|otf/i.test(ext)) {
            return 'fonts/[name]-[hash][extname]';
          }
          return 'assets/[name]-[hash][extname]';
        },
        
        // Manual chunk splitting for better caching
        manualChunks: {
          // Firebase SDK (rarely changes)
          'firebase-vendor': [],
          
          // Common utilities
          'common': [
            'public/js/config.js',
            'public/js/ui.js',
          ],
          
          // Auth and data
          'core': [
            'public/js/auth.js',
            'public/js/data.js',
            'public/js/interactions.js',
          ],
          
          // Payment (only loaded when needed)
          'payment': [
            'public/js/stripe.js',
          ],
          
          // Audio player (only loaded when needed)
          'audio': [
            'public/js/audio-player.js',
          ],
        },
      },
    },
    
    // Minification
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: false, // Keep console.log for debugging
        drop_debugger: true,
      },
    },
    
    // CSS optimization
    cssCodeSplit: true,
    
    // Source maps for debugging
    sourcemap: false,
    
    // Asset inlining threshold (4kb)
    assetsInlineLimit: 4096,
  },
  
  // Development server
  server: {
    port: 3000,
    open: true,
    cors: true,
  },
  
  // Preview server (for testing production build)
  preview: {
    port: 4173,
  },
  
  // Optimization
  optimizeDeps: {
    include: [],
  },
  
  // CSS processing
  css: {
    devSourcemap: true,
  },
});
