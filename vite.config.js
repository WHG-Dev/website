import { defineConfig } from 'vite';
import   {visualizer } from 'rollup-plugin-visualizer';
import compress from 'vite-plugin-compression';
import copy from 'rollup-plugin-copy';

export default defineConfig({
  build: {
    target: 'es2020',               // moderner Output -> kleinere Bundles
    sourcemap: false,
    minify: 'terser',               // oder 'esbuild' (schneller)
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true
      },
      format: {
        comments: false
      }
    },
    cssCodeSplit: true,             // CSS in mehrere Dateien splitten
    assetsInlineLimit: 4096,        // Größe (bytes) bis zu der Assets inline werden
    chunkSizeWarningLimit: 600,     // optional: Warnlimit anpassen
    rollupOptions: {
      // copy plugin added so we can include additional static folders (models/) in the final `dist`
      plugins: [
        copy({ targets: [{ src: 'models/**/*', dest: 'dist/models' }], hook: 'writeBundle' })
      ],
      output: {
        // einfache Aufsplitterung: node_modules -> vendor, spezielle große libs in eigene chunks
        manualChunks(id) {
          if (!id) return;
          if (id.includes('node_modules')) {
            if (id.includes('chart.js')) return 'vendor-chartjs';
            if (id.includes('three')) return 'vendor-three';
            return 'vendor';
          }
        }
      }
    }
  },
  plugins: [
    visualizer({ filename: 'dist/stats.html', open: false }), // bundle analysieren
    compress({ algorithm: 'brotliCompress' })                 // generiert .br .gz
  ]
});