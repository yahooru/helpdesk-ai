// Renders the brand mark into every icon file the app ships. Run after changing the mark:
//   node scripts/generate-icons.mjs
// Writes src/app/icon.svg, src/app/favicon.ico, src/app/apple-icon.png, public/logo.svg,
// public/icon-192.png, public/icon-512.png and public/icon-maskable-512.png.
import { writeFile } from "node:fs/promises";
import sharp from "sharp";

const ENAMEL = "#2747C8";
const BRASS = "#E9A62B";
const INK = "#0F1B2D";

/** The mark on a 32-unit grid: bubble + tail in `body`, bell in `bell`, button in brass. */
function mark({ body, bell }) {
  return `
  <rect x="2.5" y="3.5" width="27" height="21" rx="8" fill="${body}"/>
  <path d="M7.6 20.5v7.6c0 .9 1 1.4 1.7.8l7.4-5.9z" fill="${body}"/>
  <rect x="15.25" y="10.4" width="1.5" height="3.2" rx=".5" fill="${bell}"/>
  <path d="M9.6 19a6.4 6.4 0 0 1 12.8 0z" fill="${bell}"/>
  <rect x="8.2" y="19.9" width="15.6" height="2" rx="1" fill="${bell}"/>
  <circle cx="16" cy="9.4" r="1.9" fill="${BRASS}"/>`;
}

const glyph = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">${mark({ body: ENAMEL, bell: "#fff" })}\n</svg>\n`;

/** Full-bleed tile for home screens: inverted mark on enamel, scaled into the safe zone. */
function tile(size, scale) {
  const inner = 32 * scale;
  const offset = (32 - inner) / 2;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 32 32">
  <rect width="32" height="32" fill="${ENAMEL}"/>
  <g transform="translate(${offset} ${offset + 0.6}) scale(${scale})">${mark({ body: "#fff", bell: ENAMEL })}</g>
</svg>`;
}

const logo = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 176 32" role="img" aria-label="HelpDesk AI">
  ${mark({ body: ENAMEL, bell: "#fff" })}
  <text x="40" y="22.5" font-family="Archivo, 'Helvetica Neue', Arial, sans-serif" font-size="19" font-weight="650" letter-spacing="-0.4" fill="${INK}">HelpDesk AI</text>
</svg>\n`;

async function png(svg, size) {
  // Rasterize well above the target size, then downsample for crisp edges.
  const sized = svg.replace(/<svg ([^>]*?)(width="\d+" height="\d+" )?viewBox/, `<svg $1width="${size * 4}" height="${size * 4}" viewBox`);
  return sharp(Buffer.from(sized)).resize(size, size).png().toBuffer();
}

/** ICO container holding PNG frames (supported by every current browser). */
function ico(frames) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(frames.length, 4);
  const entries = [];
  let offset = 6 + 16 * frames.length;
  for (const { size, data } of frames) {
    const e = Buffer.alloc(16);
    e.writeUInt8(size >= 256 ? 0 : size, 0);
    e.writeUInt8(size >= 256 ? 0 : size, 1);
    e.writeUInt8(0, 2);
    e.writeUInt8(0, 3);
    e.writeUInt16LE(1, 4);
    e.writeUInt16LE(32, 6);
    e.writeUInt32LE(data.length, 8);
    e.writeUInt32LE(offset, 12);
    offset += data.length;
    entries.push(e);
  }
  return Buffer.concat([header, ...entries, ...frames.map((f) => f.data)]);
}

await writeFile("src/app/icon.svg", glyph);
await writeFile("public/logo.svg", logo);
const frames = [];
for (const size of [16, 32, 48]) frames.push({ size, data: await png(glyph, size) });
await writeFile("src/app/favicon.ico", ico(frames));
await writeFile("src/app/apple-icon.png", await png(tile(180, 0.72), 180));
await writeFile("public/icon-192.png", await png(tile(192, 0.72), 192));
await writeFile("public/icon-512.png", await png(tile(512, 0.72), 512));
await writeFile("public/icon-maskable-512.png", await png(tile(512, 0.6), 512));
console.log("icons written");
