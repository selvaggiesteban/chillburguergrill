import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import tailwind from '@astrojs/tailwind';
import cloudflare from '@astrojs/cloudflare';

// Id único por build: si no hay commit (build local), igual cambia entre builds
// para que un deploy manual también arranque con la cache vacía.
const commit = process.env.CF_PAGES_COMMIT_SHA || process.env.GITHUB_SHA || process.env.DEPLOY_SHA;
const buildId = commit
  ? commit.slice(0, 12)
  : `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

export default defineConfig({
  output: 'server',
  adapter: cloudflare({ platformProxy: { enabled: true } }),
  integrations: [react(), tailwind({ applyBaseStyles: false })],
  site: 'https://chillburguergrill.com',
  vite: {
    // Namespace de cache edge por commit: cada deploy arranca con cache vacía.
    define: { __BUILD_ID__: JSON.stringify(buildId.slice(0, 12)) },
    ssr: {
      noExternal: ['jquery', 'slick-carousel'],
    },
  },
});
