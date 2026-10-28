// Make the still images shown when a visitor's browser cannot draw the 3D maps.
// Build the site and serve it first, e.g.
//   bundle exec jekyll serve      (serves on http://localhost:4000)
//   node research/maps/make_fallbacks.js http://localhost:4000 riyadh qassim timeline
// Writes assets/maps/fallback/<ref>-<lang>.jpg and <ref>-<lang>-dark.jpg.
// With PHONE=1 it renders at phone width instead and writes <ref>-<lang>-m.jpg and <ref>-<lang>-m-dark.jpg,
// so phones see the same framing as the live map rather than a cropped desktop image.
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

(async () => {
  const [base, ...refs] = process.argv.slice(2);
  const out = path.join(__dirname, '../../assets/maps/fallback');
  fs.mkdirSync(out, { recursive: true });
  const phone = process.env.PHONE === '1';
  const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  for (const ref of refs) {
    for (const lang of ['en', 'ar']) {
      for (const scheme of ['light', 'dark']) {
        const ctx = await browser.newContext({ viewport: phone ? { width: 390, height: 844 } : { width: 700, height: 900 }, deviceScaleFactor: 2, colorScheme: scheme, reducedMotion: 'reduce' });
        const page = await ctx.newPage();
        const file = fs.readdirSync(path.join(__dirname, `../../${lang}/chapters`)).find(f => f.endsWith(`-${ref}.md`));
        const url = file ? `${base}/${lang}/chapters/${file.replace(/\.md$/, '.html')}` : `${base}/${lang}/${ref}.html`;
        await page.goto(url, { waitUntil: 'networkidle' });
        const stage = await page.$('.map-stage');
        await stage.scrollIntoViewIfNeeded();
        await page.waitForSelector('.chapter-map.is-live', { timeout: 60000 });
        await page.waitForTimeout(4000);
        await page.addStyleTag({ content: '.map-ui { display: none !important; }' });
        const name = `${ref}-${lang}${phone ? '-m' : ''}${scheme === 'dark' ? '-dark' : ''}.jpg`;
        // a clip rather than an element shot: the live canvas never counts as "stable"
        const box = await stage.boundingBox();
        if (phone) { box.y += 2; box.height -= 4; } // leave out the stage's top and bottom rules; the page draws its own
        await page.screenshot({ path: path.join(out, name), type: 'jpeg', quality: phone ? 72 : 78, clip: box, timeout: 120000 });
        console.log('wrote', name);
        await ctx.close();
      }
    }
  }
  await browser.close();
})();
