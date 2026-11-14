// Capture the existing, authenticated demo only. Never seeds or deletes account data.
// DEMO_PASSWORD in .env; run with node --env-file=.env scripts/capture-branding.mjs.
// PLAYWRIGHT_MODULE can point to an external install (no application dependency required).
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { mkdir } from 'node:fs/promises'
import { join } from 'node:path'
import sharp from 'sharp'

const require = createRequire(import.meta.url)
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright')
const origin = process.env.CAPTURE_ORIGIN || 'http://localhost:3000'
assert(['localhost', '127.0.0.1'].includes(new URL(origin).hostname), 'Use a local build for captures')
assert(process.env.DEMO_PASSWORD, 'Set DEMO_PASSWORD without printing it')
const destination = join(process.cwd(), 'public/images/landing')
await mkdir(destination, { recursive: true })
const browser = await chromium.launch({ channel: 'chrome', headless: true })
try {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 }, deviceScaleFactor: 2,
    locale: 'pt-BR', timezoneId: 'America/Sao_Paulo', colorScheme: 'dark',
    reducedMotion: 'reduce', serviceWorkers: 'block',
  })
  // No third-party trackers or AI calls. Reports retain their real-data local fallback.
  await context.route('**/*', route => {
    const url = new URL(route.request().url())
    if (url.origin !== origin || url.pathname === '/api/insights') return route.abort()
    return route.continue()
  })
  const login = await context.request.post(origin + '/api/auth/login', {
    headers: { Origin: origin }, data: { email: 'demo@vynta.digital', password: process.env.DEMO_PASSWORD },
  })
  assert(login.ok(), `Demo login returned ${login.status()}`)
  const result = await login.json()
  assert(result.success && result.user?.email === 'demo@vynta.digital' && result.user?.role === 'COURTESY', 'Unexpected account')
  const page = await context.newPage()
  const errors = []
  page.on('pageerror', e => errors.push(e.message))
  for (const route of ['finances', 'dashboard', 'cards', 'goals', 'habits', 'calendar', 'reports', 'notes', 'workout']) {
    for (const desktop of [false, ...(['finances', 'dashboard', 'cards'].includes(route) ? [true] : [])]) {
      // Keep the expanded desktop shell at 1600×1000 CSS px; downsample its @2x capture below.
      await page.setViewportSize(desktop ? { width: 1600, height: 1000 } : { width: 390, height: 844 })
      await page.goto(origin + '/' + route)
      assert.equal(new URL(page.url()).pathname, '/' + route)
      await page.locator('.app-shell > .app-content').waitFor({ state: 'visible' })
      await page.evaluate(() => document.fonts.ready)
      await page.locator('img:visible').evaluateAll(images => Promise.all(images.map(image => image.decode())))
      if (route === 'cards') {
        await page.locator('.recharts-bar-rectangle path').first().waitFor({ state: 'visible' })
        await page.waitForFunction(() => [...document.querySelectorAll('.recharts-bar-rectangle path')].some(p => p.getBoundingClientRect().height > 10))
      }
      if (route === 'calendar') await page.getByRole('button', { name: 'Próximo mês', exact: true }).waitFor()
      await page.waitForTimeout(1800)
      assert.equal(await page.locator('main .skeleton:visible, main [aria-label="Carregando relatório"]:visible').count(), 0, 'Wait for page content before capturing')
      // Viewport only: never export the global habits leaderboard or other users' names.
      if (route === 'habits') {
        const ranking = page.getByText('Ranking de Hábitos', { exact: true })
        if (await ranking.count()) assert((await ranking.boundingBox()).y > 844, 'Leaderboard must stay outside the capture')
      }
      const capture = await page.screenshot({ fullPage: false, animations: 'disabled' })
      const width = desktop ? 1600 : 780, height = desktop ? 1000 : 1688
      const filename = `${route}-${desktop ? 'desktop' : 'mobile'}.webp`
      await sharp(capture).resize(width, height).webp({ quality: 88 }).toFile(join(destination, filename))
      const metadata = await sharp(join(destination, filename)).metadata()
      assert.equal(metadata.width, width); assert.equal(metadata.height, height)
      console.log(`${filename}: ${width}×${height}`)
    }
  }
  assert.deepEqual(errors, [])
  await context.request.post(origin + '/api/auth/logout', { headers: { Origin: origin } })
  await context.close()
} finally { await browser.close() }
