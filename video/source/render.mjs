// usage: node render.mjs stills 1,3,6 outDir   |   node render.mjs video out.mp4
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import ffmpeg from 'ffmpeg-static';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const dir = path.dirname(fileURLToPath(import.meta.url));
const [mode, a, b] = process.argv.slice(2);
const FPS = 30, DUR = 40;

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
await page.goto('file://' + path.join(dir, 'index.html'), { waitUntil: 'load' });
await page.evaluate(() => window.ready);
await page.waitForTimeout(500);

if (mode === 'stills') {
  for (const t of a.split(',').map(Number)) {
    await page.evaluate((t) => render(t), t);
    await page.screenshot({ path: `${b}/t${String(t).padStart(5, '0')}.jpg`, type: 'jpeg', quality: 80 });
  }
} else {
  const ff = spawn(ffmpeg, ['-y', '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'png', '-i', '-',
    '-c:v', 'libx264', '-preset', 'slow', '-crf', '16', '-pix_fmt', 'yuv420p', '-tune', 'film', '-movflags', '+faststart', '-an', a],
    { stdio: ['pipe', 'inherit', 'inherit'] });
  const N = FPS * DUR;
  for (let i = 0; i < N; i++) {
    await page.evaluate((t) => render(t), i / FPS);
    const buf = await page.screenshot({ type: 'png' });
    if (!ff.stdin.write(buf)) await new Promise((r) => ff.stdin.once('drain', r));
    if (i % 150 === 0) console.log(`frame ${i}/${N}`);
  }
  ff.stdin.end();
  await new Promise((r) => ff.on('close', r));
}
await browser.close();
