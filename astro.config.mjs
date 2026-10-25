// @ts-check
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';

import react from '@astrojs/react';

export default defineConfig({
  site: 'https://talora.example.com',
  build: { inlineStylesheets: 'auto' },
  compressHTML: true,
  vite: { plugins: [tailwindcss()] },
  integrations: [react()],
});