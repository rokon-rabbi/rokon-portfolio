// Rebuilds src/assets/brand/rokon-cutout.webp from the original portrait.
//
// The portrait sits on one flat colour, so a flood fill from the top and side
// edges finds the backdrop without touching the shirt, which is close to it in
// hue. The bottom edge is not a seed for that reason: only the two slivers
// between the arms and the body are, each kept inside its own box.
//
//   node scripts/make-portrait-cutout.mjs
import sharp from "sharp";

const source = new URL("../src/assets/brand/rokon-portrait.jpg", import.meta.url).pathname;
const output = new URL("../src/assets/brand/rokon-cutout.webp", import.meta.url).pathname;
const TOLERANCE = 4;
const GAPS = [
  [395, 1700, 500],
  [1415, 1740, 1500],
];

const { data, info } = await sharp(source).removeAlpha().raw().toBuffer({ resolveWithObject: true });
const { width, height } = info;
const channel = (index, offset) => data[index * 3 + offset];

const corner = [];
for (let y = 4; y < 60; y++) for (let x = 4; x < 60; x++) corner.push(y * width + x);
const backdrop = [0, 1, 2].map((offset) => corner.map((index) => channel(index, offset)).sort((a, b) => a - b)[corner.length >> 1]);
const isBackdrop = (index, tolerance) => backdrop.every((value, offset) => Math.abs(channel(index, offset) - value) <= tolerance);

const outside = new Uint8Array(width * height);
function flood(seeds, [left, top, right, bottom], tolerance) {
  const stack = [];
  const visit = (x, y) => {
    if (x < left || y < top || x > right || y > bottom) return;
    const index = y * width + x;
    if (outside[index] || !isBackdrop(index, tolerance)) return;
    outside[index] = 1;
    stack.push(index);
  };
  seeds.forEach(([x, y]) => visit(x, y));
  while (stack.length) {
    const index = stack.pop();
    const x = index % width;
    const y = (index / width) | 0;
    visit(x - 1, y);
    visit(x + 1, y);
    visit(x, y - 1);
    visit(x, y + 1);
  }
}

const edges = [];
for (let x = 0; x < width; x++) edges.push([x, 0]);
for (let y = 0; y < height; y++) edges.push([0, y], [width - 1, y]);
flood(edges, [0, 0, width - 1, height - 1], TOLERANCE);
for (const [left, top, right] of GAPS) {
  const seeds = [];
  for (let x = left; x <= right; x++) seeds.push([x, height - 1]);
  flood(seeds, [left, top, right, height - 1], TOLERANCE - 1);
}

const mask = Buffer.alloc(width * height);
for (let index = 0; index < mask.length; index++) mask[index] = outside[index] ? 0 : 255;
// Feather the edge, then pull it in so no backdrop fringe survives.
const feathered = await sharp(mask, { raw: { width, height, channels: 1 } })
  .blur(1.8)
  .linear(2.2, -150)
  .toColourspace("b-w")
  .raw()
  .toBuffer({ resolveWithObject: true });
if (feathered.info.channels !== 1) throw new Error(`Expected a one-channel matte, got ${feathered.info.channels}`);

const cutout = Buffer.alloc(width * height * 4);
for (let index = 0; index < width * height; index++) {
  cutout[index * 4] = channel(index, 0);
  cutout[index * 4 + 1] = channel(index, 1);
  cutout[index * 4 + 2] = channel(index, 2);
  cutout[index * 4 + 3] = feathered.data[index];
}
await sharp(cutout, { raw: { width, height, channels: 4 } }).webp({ quality: 94, alphaQuality: 100, effort: 6 }).toFile(output);

const kept = 1 - outside.reduce((sum, value) => sum + value, 0) / outside.length;
console.log(`${output}: ${width}x${height}, figure covers ${(kept * 100).toFixed(1)}% of the frame`);
