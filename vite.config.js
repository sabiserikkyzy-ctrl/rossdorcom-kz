import { defineConfig } from 'vite';
import { resolve } from 'node:path';

export default defineConfig({
  base: './',
  build: {
    rollupOptions: {
      input: {
        home: resolve(__dirname, 'index.html'),
        catalog: resolve(__dirname, 'catalog.html'),
        roadSystems: resolve(__dirname, 'products/road-systems.html'),
        power: resolve(__dirname, 'products/power.html'),
        engineering: resolve(__dirname, 'products/engineering.html')
      }
    }
  }
});
