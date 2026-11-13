import { defineConfig } from 'astro/config';
import svelte from '@astrojs/svelte';
export default defineConfig({
  output: 'static',
  integrations: [svelte()],
  publicDir: './.generated/assets',
  outDir: './dist',
  base: new URL(process.env.SITE_URL || 'https://peakpune.com').pathname,
  build: { format: 'directory' },
  compressHTML: false,
});
