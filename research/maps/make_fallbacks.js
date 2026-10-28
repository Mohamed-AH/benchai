// Make the still images shown when a visitor's browser cannot draw the 3D maps.
// Build the site and serve it first, e.g.
//   bundle exec jekyll serve      (serves on http://localhost:4000)
//   node research/maps/make_fallbacks.js http://localhost:4000 riyadh
// Writes assets/maps/fallback/<ref>-<lang>.jpg and <ref>-<lang>-dark.jpg.
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

(async () => {
  const [base, ...refs] = process.argv.slice(2);
  const out = path.join(__dirname, '../../assets/maps/fallback');
  fs.mkdirSync(out, { recursive: true });
  const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  for (const ref of refs) {
    for (const lang of ['en', 'ar']) {
      for (const scheme of ['light', 'dark']) {
        const ctx = await browser.newContext({ viewport: { width: 700, height: 900 }, deviceScaleFactor: 2, colorScheme: scheme, reducedMotion: 'reduce' });
        const page = await ctx.newPage();
        const file = fs.readdirSync(path.join(__dirname, `../../${lang}/chapters`)).find(f => f.endsWith(`-${ref}.md`));
        await page.goto(`${base}/${lang}/chapters/${file.replace(/\.md$/, '.html')}`, { waitUntil: 'networkidle' });
        const stage = await page.$('.map-stage');
        await stage.scrollIntoViewIfNeeded();
        await page.waitForSelector('.chapter-map.is-live', { timeout: 60000 });
        await page.waitForTimeout(4000);
        await page.addStyleTag({ content: '.map-ui { display: none !important; }' });
        const name = `${ref}-${lang}${scheme === 'dark' ? '-dark' : ''}.jpg`;
        await stage.screenshot({ path: path.join(out, name), type: 'jpeg', quality: 78 });
        console.log('wrote', name);
        await ctx.close();
      }
    }
  }
  await browser.close();
})();
