import { defineConfig } from 'vite';
import { resolve } from 'path';
import { copyFileSync, mkdirSync, existsSync, cpSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export default defineConfig({
  test: {
    // Vite's `root` is set to `public/` for runtime, but tests live at repo root.
    // Without overriding `test.root`, Vitest won't discover `tests/**`.
    root: __dirname,
    globals: true,
    environment: 'jsdom',
    setupFiles: [resolve(__dirname, 'tests/setup.js')],
    include: ['tests/**/*.test.js', 'tests/**/*.spec.js', 'tests/ultimate-test-suite.js'],
    exclude: ['tests/e2e/**', 'node_modules/**', 'dist/**'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'tests/',
        'tools/',
        'scripts/',
        'electron/',
        'dist/',
        '*.config.js'
      ]
    }
  },
  root: resolve(__dirname, 'public'),
  server: {
    port: 3000,
    host: true,
    open: false,
    fs: {
      // Allow access to files outside public directory
      // This is needed because Vite root is 'public' but src is outside it
      allow: [
        '..',
        __dirname,
        resolve(__dirname, '..'),
        resolve(__dirname, 'public'),
        resolve(__dirname, 'road-to-war')
      ],
      // Strict mode disabled to allow accessing files outside root
      strict: false
    },
    strictPort: false,
    hmr: {
      protocol: 'ws',
      host: 'localhost'
    }
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'road-to-war')
    },
    // Better handling of file extensions
    extensions: ['.js', '.json', '.mjs', '.gd']
  },
  // Optimize dependencies
  optimizeDeps: {
    include: [],
    exclude: []
  },
  build: {
    outDir: '../dist',
    emptyOutDir: true,
    rollupOptions: {
      input: resolve(__dirname, 'public', 'index.html')
    },
    // Copy data files to dist
    copyPublicDir: true
  },
  base: './',
  plugins: [
    {
      name: 'copy-assets-dev',
      configureServer(server) {
        if (process.env.VITEST) return;
        // In dev mode, copy assets to public for serving
        const publicAssetsDir = resolve(__dirname, 'public/assets/sprites');
        const assetsSrc = resolve(__dirname, 'assets/sprites');
        if (existsSync(assetsSrc) && !existsSync(publicAssetsDir)) {
          mkdirSync(publicAssetsDir, { recursive: true });
          try {
            cpSync(assetsSrc, publicAssetsDir, { recursive: true });
            console.log('Copied assets/sprites to public/assets/sprites/ for dev');
          } catch (err) {
            console.warn('Could not copy assets for dev:', err.message);
          }
        }
      },
      closeBundle() {
        if (process.env.VITEST) return;
        // Ensure data directory exists in dist
        const dataDir = resolve(__dirname, 'dist/data');
        if (!existsSync(dataDir)) {
          mkdirSync(dataDir, { recursive: true });
        }
        
        // Copy data files
        const dataFiles = [
          'items.json',
          'enemies.json',
          'world-config.json',
          'achievements.json',
          'prestige-config.json'
        ];
        
        dataFiles.forEach(file => {
          const src = resolve(__dirname, 'public/data', file);
          const dest = resolve(__dirname, 'dist/data', file);
          if (existsSync(src)) {
            copyFileSync(src, dest);
            console.log(`Copied ${file} to dist/data/`);
          }
        });

        // Copy assets/sprites directory
        const assetsSrc = resolve(__dirname, 'assets/sprites');
        const assetsDest = resolve(__dirname, 'dist/assets/sprites');
        if (existsSync(assetsSrc)) {
          if (!existsSync(assetsDest)) {
            mkdirSync(assetsDest, { recursive: true });
          }
          try {
            cpSync(assetsSrc, assetsDest, { recursive: true });
            console.log('Copied assets/sprites to dist/assets/sprites/');
          } catch (err) {
            console.warn('Could not copy assets/sprites:', err.message);
          }
        }
      }
    }
  ]
});
