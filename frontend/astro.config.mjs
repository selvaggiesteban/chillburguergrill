import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import tailwind from '@astrojs/tailwind';
import cloudflare from '@astrojs/cloudflare';

const buildId =
  process.env.CF_PAGES_COMMIT_SHA || process.env.GITHUB_SHA || process.env.DEPLOY_SHA || 'local';

export default defineConfig({
  output: 'server',
  adapter: cloudflare({ platformProxy: { enabled: true } }),
  integrations: [react(), tailwind({ applyBaseStyles: false })],
  site: 'https://chillburguergrill.com',
  vite: {
    // Namespace de cache edge por commit: cada deploy arranca con cache vacía.
    define: { __BUILD_ID__: JSON.stringify(buildId.slice(0, 12)) },
  },
});
