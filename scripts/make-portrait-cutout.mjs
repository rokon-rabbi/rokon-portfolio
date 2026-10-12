// Rebuilds src/assets/brand/rokon-cutout.webp from the original portrait.
//
// The portrait sits on one flat colour, so a flood fill from the top and side
// edges finds the backdrop without touching the shirt, which is close to it in
// hue. The bottom edge is not a seed for that reason: only the two slivers
// between the arms and the body are, each kept inside its own box.
//
// The cut-out is then finished for the dark stage it stands on. The edge is
// pulled in past the backdrop's blue fringe and repainted from the colours
// just inside it. The daylight is graded down and falls off along the body,
// so the face is the brightest thing in the picture. Two edge lights in the
// colours of the braces, mint on the left and teal on the right, lift him off
// the stage, and a soft shadow travels with him so he stands in front of
// whatever is behind. Nothing about his face or clothes is redrawn.
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

// Matte, in source pixels.
const SMOOTH = 2.2; // rounds the staircase the flood fill leaves
const INSET = 2; // how far the edge moves in, past the fringe
const TRUST = 3; // how much further in before a colour is believed
const FEATHER = 1.3;

// Grade. Channel values run 0 to 1.
const CONTRAST = 0.13;
const SHOULDER = 0.78; // above this the highlights roll off
const CLARITY = { radius: 38, amount: 0.13 };
const DETAIL = { radius: 1.4, amount: 0.25 };
const SATURATION = { skin: 0.92, cloth: 0.72 };
const COOL_SHADOWS = 0.05;

// Light. Heights are shares of the picture, from the top.
const FALLOFF = { from: 0.46, depth: 0.52 };
const RIM = { strength: 1.25, width: 13, softness: 9, wrap: 0.1 };
const LIGHTS = [
  { direction: [-0.94, -0.34], colour: [0.545, 0.937, 0.796], gain: 1 }, // mint, the opening brace
  { direction: [0.94, -0.34], colour: [0.3, 0.82, 0.8], gain: 1 }, // teal, the closing brace
  { direction: [0, -1], colour: [0.86, 0.96, 0.95], gain: 0.12 }, // a little on the hair
];
const SHADOW = { radius: 26, strength: 0.55 };

const { data, info } = await sharp(source).removeAlpha().raw().toBuffer({ resolveWithObject: true });
const { width, height } = info;
const pixels = width * height;
const channel = (index, offset) => data[index * 3 + offset];

const corner = [];
for (let y = 4; y < 60; y++) for (let x = 4; x < 60; x++) corner.push(y * width + x);
const backdrop = [0, 1, 2].map((offset) => corner.map((index) => channel(index, offset)).sort((a, b) => a - b)[corner.length >> 1]);
const isBackdrop = (index, tolerance) => backdrop.every((value, offset) => Math.abs(channel(index, offset) - value) <= tolerance);

const outside = new Uint8Array(pixels);
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

// ---- Matte ---------------------------------------------------------------
// The picture is cropped at the bottom, so that edge is not an edge of the
// figure: blurs repeat the last row below it and erosion ignores it.
const PAD = 240;
async function blurred(mask, sigma) {
  const levels = Buffer.alloc(pixels);
  for (let index = 0; index < pixels; index++) levels[index] = mask[index] ? 255 : 0;
  const result = await sharp(levels, { raw: { width, height, channels: 1 } })
    .extend({ bottom: PAD, extendWith: "copy" })
    .blur(sigma)
    .extract({ left: 0, top: 0, width, height })
    .toColourspace("b-w")
    .raw()
    .toBuffer({ resolveWithObject: true });
  if (result.info.channels !== 1) throw new Error(`Expected a one-channel matte, got ${result.info.channels}`);
  return result.data;
}
function eroded(mask, steps) {
  let current = mask;
  for (let step = 0; step < steps; step++) {
    const next = new Uint8Array(pixels);
    for (let y = 1; y < height; y++) {
      for (let x = 1; x < width - 1; x++) {
        const index = y * width + x;
        const below = y < height - 1 ? current[index + width] : 1;
        next[index] = current[index] && current[index - 1] && current[index + 1] && current[index - width] && below ? 1 : 0;
      }
    }
    current = next;
  }
  return current;
}

const rough = new Uint8Array(pixels);
for (let index = 0; index < pixels; index++) rough[index] = outside[index] ? 0 : 1;
const rounded = (await blurred(rough, SMOOTH)).map((level) => (level > 127 ? 1 : 0));
const figure = eroded(rounded, INSET);
const trusted = eroded(figure, TRUST);

// Pixels between the two masks carry some backdrop. Repaint them outward
// from the trusted colours, one ring at a time.
const colour = Float32Array.from(data);
const known = Uint8Array.from(trusted);
let ring = [];
for (let index = 0; index < pixels; index++) if (rough[index] && !trusted[index]) ring.push(index);
while (ring.length) {
  const painted = [];
  const waiting = [];
  for (const index of ring) {
    const x = index % width;
    const y = (index / width) | 0;
    let red = 0;
    let green = 0;
    let blue = 0;
    let count = 0;
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        if (x + dx < 0 || x + dx >= width || y + dy < 0 || y + dy >= height) continue;
        const near = index + dy * width + dx;
        if (!known[near]) continue;
        red += colour[near * 3];
        green += colour[near * 3 + 1];
        blue += colour[near * 3 + 2];
        count++;
      }
    }
    if (count) painted.push(index, red / count, green / count, blue / count);
    else waiting.push(index);
  }
  if (!painted.length) break;
  for (let entry = 0; entry < painted.length; entry += 4) {
    const index = painted[entry];
    colour.set([painted[entry + 1], painted[entry + 2], painted[entry + 3]], index * 3);
    known[index] = 1;
  }
  ring = waiting;
}
const matte = await blurred(figure, FEATHER);

// ---- Grade ---------------------------------------------------------------
const clamp = (value) => Math.min(1, Math.max(0, value));
const smooth = (from, to, value) => {
  const t = clamp((value - from) / (to - from));
  return t * t * (3 - 2 * t);
};
const luminance = (red, green, blue) => 0.2126 * red + 0.7152 * green + 0.0722 * blue;
// A gentle S-curve, then a shoulder so the brightest skin keeps its colour.
const tone = (value) => {
  const curved = value + CONTRAST * (value - 0.5) * (1 - Math.abs(2 * value - 1));
  if (curved <= SHOULDER) return curved;
  const over = (curved - SHOULDER) / (1 - SHOULDER);
  return SHOULDER + ((1 - SHOULDER) * 0.94 * (1 - Math.exp(-1.25 * over))) / (1 - Math.exp(-1.25));
};

const repainted = Buffer.from(colour.map((value) => Math.round(Math.min(255, Math.max(0, value)))));
const softened = (sigma) => sharp(repainted, { raw: { width, height, channels: 3 } }).blur(sigma).raw().toBuffer();
const [broad, fine] = await Promise.all([softened(CLARITY.radius), softened(DETAIL.radius)]);

const graded = new Float32Array(pixels * 3);
for (let index = 0; index < pixels; index++) {
  if (!matte[index]) continue;
  const rgb = [0, 1, 2].map((offset) => {
    const at = index * 3 + offset;
    const value = colour[at] + CLARITY.amount * (colour[at] - broad[at]) + DETAIL.amount * (colour[at] - fine[at]);
    return tone(Math.max(0, value) / 255);
  });
  const light = luminance(...rgb);
  // The shirt is the one large area of colour; it gives way to the face.
  const cloth = smooth(0, 0.12, rgb[2] - Math.max(rgb[0], rgb[1]));
  const saturation = SATURATION.skin + (SATURATION.cloth - SATURATION.skin) * cloth;
  // Shadows lean toward the stage's navy.
  const shade = (1 - smooth(0, 0.45, light)) * COOL_SHADOWS;
  graded[index * 3] = light + (rgb[0] - light) * saturation - shade * 0.9;
  graded[index * 3 + 1] = light + (rgb[1] - light) * saturation + shade * 0.1;
  graded[index * 3 + 2] = light + (rgb[2] - light) * saturation + shade * 0.8;
}

// ---- Light ---------------------------------------------------------------
const [edgeNear, edgeFar, shadow] = await Promise.all([blurred(figure, RIM.softness), blurred(figure, RIM.softness * 3.2), blurred(figure, SHADOW.radius)]);
// How open the view is from a point toward a light: 1 looking out of the
// figure, 0 looking further into it.
const open = (field, x, y) => {
  const column = Math.round(x);
  const row = Math.min(height - 1, Math.round(y));
  return column < 0 || column >= width || row < 0 ? 1 : 1 - field[row * width + column] / 255;
};

const cutout = Buffer.alloc(pixels * 4);
for (let y = 0; y < height; y++) {
  for (let x = 0; x < width; x++) {
    const index = y * width + x;
    const cover = matte[index] / 255;
    const cast = (shadow[index] / 255) * SHADOW.strength;
    const alpha = cover + cast * (1 - cover);
    cutout[index * 4 + 3] = Math.round(clamp(alpha) * 255);
    if (!cover) continue;

    const down = y / height;
    const falloff = 1 - FALLOFF.depth * smooth(FALLOFF.from, 1.02, down);
    const rgb = [graded[index * 3] * falloff, graded[index * 3 + 1] * falloff, graded[index * 3 + 2] * falloff];
    // An edge light shows the surface it lands on: strong on skin and cloth,
    // slight on dark hair. It is narrower around the head than the shoulders.
    const surface = 0.25 + Math.min(0.75, luminance(...rgb) * 1.3);
    const reach = (0.55 + 0.45 * smooth(0.36, 0.52, down)) * (1 - 0.6 * smooth(0.6, 1, down));
    for (const { direction, colour: tint, gain } of LIGHTS) {
      const [dx, dy] = direction;
      const near = open(edgeNear, x + dx * RIM.width, y + dy * RIM.width);
      const far = open(edgeFar, x + dx * RIM.width * 3, y + dy * RIM.width * 3);
      const lit = (smooth(0.2, 1, near) ** 2.2 * surface + RIM.wrap * smooth(0.1, 0.9, far)) * RIM.strength * gain * reach;
      for (let offset = 0; offset < 3; offset++) rgb[offset] += tint[offset] * lit * (1 - rgb[offset] * 0.6);
    }
    // Where the figure thins out at its edge, the shadow shows through.
    const share = cover / alpha;
    for (let offset = 0; offset < 3; offset++) cutout[index * 4 + offset] = Math.round(clamp(rgb[offset] * share) * 255);
  }
}
await sharp(cutout, { raw: { width, height, channels: 4 } }).webp({ quality: 94, alphaQuality: 100, effort: 6 }).toFile(output);

const kept = figure.reduce((sum, value) => sum + value, 0) / pixels;
console.log(`${output}: ${width}x${height}, figure covers ${(kept * 100).toFixed(1)}% of the frame`);
