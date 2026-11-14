// Render the exact reviewed sources. PLAYWRIGHT_MODULE may point to an external installation.
import { createServer } from 'node:http'
import { readFile, writeFile } from 'node:fs/promises'
import { resolve, extname, sep, join } from 'node:path'
import { createRequire } from 'node:module'
import assert from 'node:assert/strict'
const require = createRequire(import.meta.url)
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright')
const root = process.cwd(), batch = 'marketing/instagram/revisao-2026-11'
const posts = JSON.parse(await readFile(join(batch, 'posts.json'), 'utf8'))
const server = createServer(async (request, response) => {
  const file = resolve(root, '.' + decodeURIComponent(new URL(request.url, 'http://localhost').pathname))
  if (!['public', batch].some(folder => file.startsWith(resolve(root, folder) + sep))) { response.writeHead(404).end(); return }
  try { response.setHeader('Content-Type', ({ '.html': 'text/html; charset=utf-8', '.png': 'image/png', '.webp': 'image/webp' })[extname(file)] || 'application/octet-stream'); response.end(await readFile(file)) } catch { response.writeHead(404).end() }
})
await new Promise(r => server.listen(0, '127.0.0.1', r))
const browser = await chromium.launch({ channel: 'chrome', headless: true }), checks = []
try {
  const page = await browser.newPage({ viewport: { width: 1080, height: 1350 }, deviceScaleFactor: 2 })
  for (const post of posts) {
    for (const story of [false, true]) {
      const height = story ? 1920 : 1350
      await page.setViewportSize({ width: 1080, height })
      for (let n = 1; n <= (story ? 2 : post.slides.length); n++) {
        const path = `${batch}/${post.folder}/${story ? 'story/stories' : 'slides'}.html?slide=${n}`
        await page.goto(`http://127.0.0.1:${server.address().port}/${path}`)
        await page.evaluate(() => document.fonts.ready)
        assert(await page.evaluate(() => document.fonts.check('600 40px Sora') && document.fonts.check('500 40px Manrope')), 'Fonts must load')
        await page.locator('img:visible').evaluateAll(images => Promise.all(images.map(image => image.decode())))
        const overflow = await page.locator('section:visible').evaluate(el => [...el.querySelectorAll('h1,h2,p,.brand,.foot,.sticker')].filter(e => { const r = e.getBoundingClientRect(); return r.right > 1080 || r.left < 0 || r.bottom > el.clientHeight || r.top < 0 }).map(e => e.textContent))
        assert.equal(overflow.length, 0, `${path}: ${overflow.join(', ')}`)
        await page.screenshot({ path: join(batch, post.folder, story ? 'story' : '', `${story ? 'story' : 'slide'}-${String(n).padStart(2, '0')}.png`) })
        checks.push({ path, width: 2160, height: height * 2, fontsLoaded: true, imagesDecoded: true, textInsideCanvas: true })
      }
    }
    console.log(`Rendered ${post.folder}`)
  }
  await writeFile(join(batch, 'render-check.json'), JSON.stringify(checks, null, 2))
} finally { await browser.close(); server.close() }
