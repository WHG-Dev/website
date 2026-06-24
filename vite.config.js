// ...existing code...
import { defineConfig } from 'vite';
import compress from 'vite-plugin-compression';
import copy from 'rollup-plugin-copy';
import { viteExternalsPlugin } from 'vite-plugin-externals'

export default defineConfig({
  // prevent dep pre-bundling for CDN-provided packages so dev/preview doesn't try to resolve them locally
  optimizeDeps: {
    exclude: ['three', 'three/addons', 'chart.js', 'chart.js/auto', 'sunrise-sunset-js']
  },
  build: {
    target: 'es2020',
    sourcemap: false,
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true
      },
      format: {
        comments: false
      }
    },
    cssCodeSplit: true,
    assetsInlineLimit: 4096,
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      // treat three, chart.js and sunrise-sunset-js (and their subpaths) as external so they are loaded from CDN via import-map
      external: [
        'three',
        /^three\/examples\/jsm\/.*/,
        'chart.js/auto',
        'sunrise-sunset-js'
      ],
      plugins: [
        copy({ targets: [{ src: 'models/**/*', dest: 'dist/models' }], hook: 'writeBundle' })
      ],
      output: {
        manualChunks(id) {
          if (!id) return;
          if (id.includes('node_modules')) return 'vendor';
        },
        globals: {
          three: 'THREE',
          'chart.js/auto': 'Chart',
          'sunrise-sunset-js': 'SunriseSunsetJS'

        }
      }
    }
  },
  plugins: [
    compress({ algorithm: 'brotliCompress' })
  ]
});