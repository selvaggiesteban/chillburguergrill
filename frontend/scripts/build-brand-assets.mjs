/**
 * Genera los assets de marca a partir de los originales del repo:
 *   - public/images/logo.webp        (logo optimizado, fondo transparente)
 *   - public/favicon.png             (emblema del logo, 32px)
 *   - public/apple-touch-icon.png    (emblema, 180px, fondo opaco)
 *   - public/favicon-192.png
 *   - public/images/menu/products/*.webp  (fotos de la carta, 1200x900)
 *
 * Uso: node scripts/build-brand-assets.mjs   (requiere los originales en la raíz)
 */
import { mkdir, readdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const repoRoot = dirname(root);
const pub = join(root, 'public');

// Fuente de la foto por slug de producto.
const MENU_PHOTOS = {
  cheeseburger: 'Cheeseburger .jpg',
  'oklahoma-tasty': 'Cebocheta.jpg',
  'bacon-cheddar-crispy': 'Bacon fotos nuevas 1.jpg',
  biggie: 'Biggie chill nueva foto .jpg',
  'cebocheta-smoke': 'Cebocheta 2.jpg',
  'blue-cream': 'Blue cheesefondo blancoeditcon IA.jpg',
  nuggets: 'Combo.jpg',
  'aros-de-cebolla': 'Aros de cebolla.jpg',
};

const MENU_DIR = join(repoRoot, 'Chill');
const W = 1200;
const H = 900;

/** Foto de portada por categoría (para las tarjetas del home). */
const CATEGORY_PHOTOS = {
  hamburguesas: 'Cheeseburger .jpg',
  'papas-guarniciones': 'Aros de cebolla.jpg',
};

/** Fallback SVG por categoría, con la paleta institucional. */
const CATEGORY_SVGS = ['hamburguesas', 'papas-guarniciones', 'bebidas', 'placeholder', 'default'];

async function buildLogo() {
  const src = join(repoRoot, 'logo.webp');
  await mkdir(join(pub, 'images'), { recursive: true });
  await sharp(src).resize(512, 512).webp({ quality: 82, effort: 6 }).toFile(join(pub, 'images', 'logo.webp'));
  console.log('logo.webp ✓');
}

/** Recorta el emblema (la parte inferior con la hamburguesa dorada) para favicons. */
async function buildFavicons() {
  const src = join(repoRoot, 'logo.webp');
  const emblem = sharp(src).extract({ left: 104, top: 250, width: 306, height: 238 });

  await emblem
    .clone()
    .resize(192, 192, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 1 } })
    .png()
    .toFile(join(pub, 'favicon-192.png'));

  await emblem
    .clone()
    .resize(32, 32, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 1 } })
    .png()
    .toFile(join(pub, 'favicon.png'));

  await emblem
    .clone()
    .resize(180, 180, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 1 } })
    .png()
    .toFile(join(pub, 'apple-touch-icon.png'));

  console.log('favicons ✓');
}

async function buildMenuPhotos() {
  const outDir = join(pub, 'images', 'menu', 'products');
  await mkdir(outDir, { recursive: true });

  const available = new Set((await readdir(MENU_DIR)).map((f) => f.trim()));
  let ok = 0;
  const missing = [];

  for (const [slug, filename] of Object.entries(MENU_PHOTOS)) {
    const match = [...available].find((f) => f === filename.trim());
    if (!match) {
      missing.push(filename);
      continue;
    }
    await sharp(join(MENU_DIR, match))
      .resize(W, H, { fit: 'cover', position: 'attention' })
      .webp({ quality: 76, effort: 6 })
      .toFile(join(outDir, `${slug}.webp`));
    ok += 1;
  }

  console.log(`fotos de carta: ${ok}/${Object.keys(MENU_PHOTOS).length} ✓`);
  if (missing.length) console.warn('faltantes:', missing.join(', '));
}

async function buildCategoryAssets() {
  const menuDir = join(pub, 'images', 'menu');
  await mkdir(join(menuDir, 'categories'), { recursive: true });

  const available = new Set((await readdir(MENU_DIR)).map((f) => f.trim()));
  for (const [slug, filename] of Object.entries(CATEGORY_PHOTOS)) {
    const match = [...available].find((f) => f === filename.trim());
    if (!match) {
      console.warn('categoría sin foto:', slug, filename);
      continue;
    }
    await sharp(join(MENU_DIR, match))
      .resize(800, 600, { fit: 'cover', position: 'attention' })
      .webp({ quality: 76, effort: 6 })
      .toFile(join(menuDir, 'categories', `${slug}.webp`));
  }

  for (const slug of CATEGORY_SVGS) {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600" role="img" aria-label="${slug}">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#a45cff"/>
      <stop offset="1" stop-color="#4e1a84"/>
    </linearGradient>
  </defs>
  <rect width="800" height="600" fill="url(#g)"/>
  <rect x="0" y="0" width="800" height="14" fill="#f0b010"/>
  <rect x="0" y="586" width="800" height="14" fill="#f0b010"/>
  <circle cx="400" cy="270" r="130" fill="#ffffff" fill-opacity="0.18"/>
  <text x="400" y="320" font-family="Impact, Haettenschweiler, 'Arial Narrow Bold', sans-serif" font-size="120" fill="#ffffff" text-anchor="middle" letter-spacing="6">CHILL</text>
  <text x="400" y="545" font-family="Impact, Haettenschweiler, 'Arial Narrow Bold', sans-serif" font-size="44" fill="#f0b010" text-anchor="middle" letter-spacing="4">BURGER GRILL</text>
</svg>
`;
    await mkdir(menuDir, { recursive: true });
    await writeFile(join(menuDir, `${slug}.svg`), svg, 'utf8');
  }

  console.log('assets de categoría ✓');
}

await buildLogo();
await buildFavicons();
await buildMenuPhotos();
await buildCategoryAssets();
