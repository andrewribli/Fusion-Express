import sharp from "sharp";
import fs from "fs";
import path from "path";

const src = process.argv[2];
const outDir = "apps/mobile/assets";

if (!src || !fs.existsSync(src)) {
  console.error("Usage: node scripts/make-mobile-icons.mjs <logo.png>");
  process.exit(1);
}

fs.mkdirSync(outDir, { recursive: true });

const meta = await sharp(src).metadata();
console.log("source", meta.width, meta.height, "alpha=" + meta.hasAlpha);

// App icon: crop to the bag mark only (top ~62%), pad on black, 1024, no alpha.
// Full logo text is unreadable at home-screen size and Apple often rejects it.
const cropHeight = Math.round(meta.height * 0.62);
const bag = await sharp(src)
  .extract({ left: 0, top: 0, width: meta.width, height: cropHeight })
  .resize(820, 820, {
    fit: "contain",
    background: { r: 0, g: 0, b: 0, alpha: 1 },
  })
  .png()
  .toBuffer();

await sharp({
  create: {
    width: 1024,
    height: 1024,
    channels: 3,
    background: { r: 0, g: 0, b: 0 },
  },
})
  .composite([{ input: bag, gravity: "centre" }])
  .png()
  .toFile(path.join(outDir, "icon.png"));

await sharp(path.join(outDir, "icon.png")).toFile(
  path.join(outDir, "adaptive-icon.png"),
);

// Splash: full logo centered on black
const logo = await sharp(src)
  .resize(780, 780, {
    fit: "contain",
    background: { r: 0, g: 0, b: 0, alpha: 0 },
  })
  .png()
  .toBuffer();

await sharp({
  create: {
    width: 1284,
    height: 2778,
    channels: 3,
    background: { r: 0, g: 0, b: 0 },
  },
})
  .composite([{ input: logo, gravity: "centre" }])
  .png()
  .toFile(path.join(outDir, "splash.png"));

await sharp(path.join(outDir, "icon.png"))
  .resize(48, 48)
  .png()
  .toFile(path.join(outDir, "favicon.png"));

fs.copyFileSync(src, path.join(outDir, "gracerun-logo-source.png"));

for (const name of ["icon", "adaptive-icon", "splash", "favicon"]) {
  const m = await sharp(path.join(outDir, `${name}.png`)).metadata();
  console.log(name, `${m.width}x${m.height}`, "alpha=" + m.hasAlpha);
}
