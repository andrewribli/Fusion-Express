import { chromium } from 'playwright';
import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

const OUT_DIR = 'screenshots/app-store';
const BASE_URL = 'https://www.gracerun.fit';
const WIDTH = 1320;
const HEIGHT = 2868;

const PAGES = [
  { name: '01-home',     path: '/cuhk' },
  { name: '02-fusion',   path: '/fusion' },
  { name: '03-cart',     path: '/cart' },
  { name: '04-checkout', path: '/checkout' },
  { name: '05-runner',   path: '/runner' },
];

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });

  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: WIDTH, height: HEIGHT },
    deviceScaleFactor: 1,
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
    isMobile: true,
    hasTouch: true,
  });

  for (const page of PAGES) {
    const url = BASE_URL + page.path;
    console.log(`\nCapturing ${page.name} from ${url}`);

    const p = await context.newPage();
    try {
      await p.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
      await p.waitForTimeout(1500); // let layout settle

      const rawPath = path.join(OUT_DIR, `${page.name}-raw.png`);
      await p.screenshot({ path: rawPath, fullPage: false });

      // Ensure exact dimensions with sharp
      const finalPath = path.join(OUT_DIR, `${page.name}.png`);
      await sharp(rawPath)
        .resize(WIDTH, HEIGHT, { fit: 'cover', position: 'top' })
        .png()
        .toFile(finalPath);

      fs.unlinkSync(rawPath);

      const meta = await sharp(finalPath).metadata();
      const ok = meta.width === WIDTH && meta.height === HEIGHT;
      console.log(`  ${ok ? '✓' : '✗'} ${page.name}.png — ${meta.width}x${meta.height}`);
    } catch (err) {
      console.error(`  ✗ Failed: ${err.message}`);
    } finally {
      await p.close();
    }
  }

  await browser.close();
  console.log(`\nScreenshots saved to ${OUT_DIR}/`);
}

main().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});
