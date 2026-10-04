/** Genera public/images/og.png (1200x630) con los colores de marca. Uso: node scripts/generate-og.mjs */
import { mkdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const out = join(root, 'public', 'images', 'og.png');
const logo = join(dirname(root), 'logo.webp');

const svg = `<svg width="1200" height="630" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#2b1152"/>
      <stop offset="1" stop-color="#160b28"/>
    </linearGradient>
  </defs>
  <rect width="1200" height="630" fill="url(#bg)"/>
  <rect x="0" y="0" width="1200" height="14" fill="#f0b010"/>
  <rect x="0" y="616" width="1200" height="14" fill="#f0b010"/>
  <text x="600" y="470" text-anchor="middle" font-family="Impact, Haettenschweiler, 'Arial Narrow Bold', sans-serif" font-size="46" fill="#ffffff" letter-spacing="6">HAMBURGUESAS SMASH · GUARNICIONES · BEBIDAS</text>
  <text x="600" y="545" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="30" font-weight="bold" fill="#f0b010" letter-spacing="7">PEDÍ ONLINE · DELIVERY O RETIRO EN LOCAL</text>
  <text x="600" y="592" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="22" fill="#ffffff" fill-opacity="0.7" letter-spacing="4">LANÚS · BUENOS AIRES</text>
</svg>`;

await mkdir(dirname(out), { recursive: true });

const logoBuffer = await sharp(logo)
  .resize(340, 340, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
  .png()
  .toBuffer();

await sharp(Buffer.from(svg))
  .composite([{ input: logoBuffer, left: 430, top: 70 }])
  .png({ compressionLevel: 9 })
  .toFile(out);

console.log('og.png generado en', out);
