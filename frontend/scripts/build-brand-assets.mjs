/**
 * Genera los assets de marca a partir de los originales del repo:
 *   - public/images/logo.webp        (logo optimizado, fondo transparente)
 *   - public/favicon.png             (logo completo, 32px, fondo transparente)
 *   - public/favicon-192.png         (logo completo, 192px)
 *   - public/favicon.ico             (16 + 32, para pedidos por defecto)
 *   - public/apple-touch-icon.png    (logo completo, 180px, fondo opaco)
 *   - public/images/menu/products/*.webp  (fotos de la carta, 1200x900)
 *
 * Uso: node scripts/build-brand-assets.mjs [logo|favicons|photos|categories]
 *      (sin argumentos = todos; requiere los originales en la raíz)
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

/** Logo completo (mascot + emblema) a un tamaño dado, con fondo transparente. */
function logoIcon(src, size) {
  return sharp(src).resize(size, size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } });
}

/** Contenedor .ico mínimo con entradas PNG (Vista+; lo entienden los navegadores actuales). */
function buildIco(entries) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(entries.length, 4);

  const dirEntries = [];
  let offset = 6 + 16 * entries.length;
  for (const { size, buf } of entries) {
    const entry = Buffer.alloc(16);
    entry.writeUInt8(size >= 256 ? 0 : size, 0);
    entry.writeUInt8(size >= 256 ? 0 : size, 1);
    entry.writeUInt8(0, 2);
    entry.writeUInt16LE(1, 4);
    entry.writeUInt16LE(32, 6);
    entry.writeUInt32LE(buf.length, 8);
    entry.writeUInt32LE(offset, 12);
    offset += buf.length;
    dirEntries.push(entry);
  }
  return Buffer.concat([header, ...dirEntries, ...entries.map((e) => e.buf)]);
}

/**
 * Favicons con el logo oficial completo (antes era sólo el recorte del emblema).
 * PNG transparentes + apple-touch opaco (iOS ignora la transparencia) + .ico.
 */
async function buildFavicons() {
  const src = join(repoRoot, 'logo.webp');

  await logoIcon(src, 32).png({ compressionLevel: 9 }).toFile(join(pub, 'favicon.png'));
  await logoIcon(src, 192).png({ compressionLevel: 9 }).toFile(join(pub, 'favicon-192.png'));

  // iOS pinta el ícono opaco; fondo claro para que lea bien la paleta del logo.
  await logoIcon(src, 180)
    .flatten({ background: '#ffffff' })
    .png({ compressionLevel: 9 })
    .toFile(join(pub, 'apple-touch-icon.png'));

  const icoEntries = [];
  for (const size of [16, 32]) {
    icoEntries.push({ size, buf: await logoIcon(src, size).png().toBuffer() });
  }
  await writeFile(join(pub, 'favicon.ico'), buildIco(icoEntries));

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

const step = process.argv[2];
const only = (name) => !step || step === name;

if (only('logo')) await buildLogo();
if (only('favicons')) await buildFavicons();
if (only('photos')) await buildMenuPhotos();
if (only('categories')) await buildCategoryAssets();
