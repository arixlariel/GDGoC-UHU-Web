import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';

const SITE_URL = process.env.SITE_URL || 'https://gdguhu.com';
const BASE_PATH = process.env.BASE_PATH || '/';

export default defineConfig({
  site: SITE_URL,
  base: BASE_PATH,
  integrations: [tailwind()],
  output: 'static',
  build: {
    format: 'directory',
    inlineStylesheets: 'always',
  },
});
