// Render only the requested local launch draft, without exposing env or application files.
import { createServer } from 'node:http'
import { readFile, mkdir } from 'node:fs/promises'
import { resolve, extname, sep, join } from 'node:path'
import { createRequire } from 'node:module'
import assert from 'node:assert/strict'
const require = createRequire(import.meta.url)
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright')
const root = process.cwd()
const draft = 'marketing/instagram/rascunhos/nova-fase'
const server = createServer(async (request, response) => {
  const pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname)
  const file = resolve(root, '.' + pathname)
  if (!['public', draft].some(folder => file.startsWith(resolve(root, folder) + sep))) { response.writeHead(404).end(); return }
  try {
    const data = await readFile(file)
    response.setHeader('Content-Type', ({ '.html': 'text/html; charset=utf-8', '.png': 'image/png', '.webp': 'image/webp' })[extname(file)] || 'application/octet-stream')
    response.end(data)
  } catch { response.writeHead(404).end() }
})
await new Promise(r => server.listen(0, '127.0.0.1', r))
const browser = await chromium.launch({ channel: 'chrome', headless: true })
try {
  const page = await browser.newPage({ viewport: { width: 1080, height: 1350 }, deviceScaleFactor: 2 })
  for (const story of [false, true]) {
    const folder = join(root, draft, story ? 'story' : '')
    await mkdir(folder, { recursive: true })
    await page.setViewportSize({ width: 1080, height: story ? 1920 : 1350 })
    for (let i = 1; i <= (story ? 2 : 7); i++) {
      await page.goto(`http://127.0.0.1:${server.address().port}/${draft}/${story ? 'story/stories' : 'slides'}.html?slide=${i}`)
      await page.evaluate(() => document.fonts.ready)
      assert(await page.evaluate(() => document.fonts.check('600 40px Sora')), 'Sora must load before render')
      await page.locator('img:visible').evaluateAll(images => Promise.all(images.map(image => image.decode())))
      await page.screenshot({ path: join(folder, `${story ? 'story' : 'slide'}-${String(i).padStart(2, '0')}.png`) })
      console.log(`${story ? 'Story' : 'Slide'} ${i} rendered`)
    }
  }
} finally { await browser.close(); server.close() }
