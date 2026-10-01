/** Genera public/images/og.png (1200x630) con los colores de marca. Uso: node scripts/generate-og.mjs */
import { mkdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const out = join(root, 'public', 'images', 'og.png');

const svg = `<svg width="1200" height="630" xmlns="http://www.w3.org/2000/svg">
  <rect width="1200" height="630" fill="#0c0a09"/>
  <rect x="0" y="480" width="1200" height="12" fill="#ea580c"/>
  <rect x="0" y="138" width="1200" height="12" fill="#ea580c"/>
  <text x="600" y="300" text-anchor="middle" font-family="Impact, Haettenschweiler, Arial Black, sans-serif" font-size="120" fill="#ffffff" letter-spacing="2">CHILL</text>
  <text x="600" y="430" text-anchor="middle" font-family="Impact, Haettenschweiler, Arial Black, sans-serif" font-size="120" fill="#ea580c" letter-spacing="2">BURGER GRILL</text>
  <text x="600" y="545" text-anchor="middle" font-family="Arial, sans-serif" font-size="34" fill="#fdba74" letter-spacing="8">HAMBURGUESAS A LA PARRILLA · PEDÍ ONLINE</text>
</svg>`;

await mkdir(dirname(out), { recursive: true });
await sharp(Buffer.from(svg)).png({ compressionLevel: 9 }).toFile(out);
console.log('og.png generado en', out);
