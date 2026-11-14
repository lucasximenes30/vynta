// Isolated browser regressions: real components/CSS, synthetic data, no database or login.
// Run after npm run build. PLAYWRIGHT_MODULE may point to an external Playwright install.
import assert from 'node:assert/strict'
import { createServer } from 'node:http'
import { readFile, readdir } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { build } from 'esbuild'

const require = createRequire(import.meta.url)
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright')
const title = 'Reunião de planejamento com título muito longo para verificar os limites do calendário e da lista de compromissos'
const bundle = await build({
  stdin: {
    contents: `import React from 'react';
      import {createRoot} from 'react-dom/client';
      import Calendar from './app/calendar/CalendarClient';
      import Goals from './app/goals/GoalsClient';
      import Habits from './app/habits/HabitsClient';
      import Salary from './app/finances/SalaryModal';
      import Skeleton from './components/PageSkeleton';
      import Shell from './components/AppShell';
      import {ThemeProvider} from './lib/theme';
      const today = new Intl.DateTimeFormat('sv-SE',{timeZone:'America/Sao_Paulo'}).format(new Date());
      window.fetch = async(input, options) => {
        const url = String(input);
        if (url === '/api/salary') { window.salaryRequest = options; return Response.json({success:true}); }
        if (url.includes('/calendar/events')) return Response.json({events:[{
          id:'fixture-event', title:${JSON.stringify(title)}, description:'Dados sintéticos de teste',
          date:today+'T00:00:00Z', startTime:'14:00', endTime:'15:00', color:'bg-brand-500', category:'Trabalho', reminders:[60]
        }]});
        if (url.includes('/auth/me')) return Response.json({user:{id:'fixture',name:'Demo',role:'COURTESY'}});
        return Response.json({events:[],notifications:[],transactions:[],suggestions:[],categories:[],cards:[]});
      };
      const habits = <Habits session={{userId:'fixture',name:'Demo'}}
        initialHabits={[{id:'habit',title:'Beber dois litros de água diariamente',icon:'Droplets',color:'cyan',order:0,currentStreak:7,bestStreak:14,createdAt:today}]}
        initialCheckins={[]} initialPrevCheckins={[]} initialHistoricalScore={10} initialRanking={[]}
        weekDates={Array.from({length:7},(_,i)=>today.slice(0,8)+String(i+1).padStart(2,'0'))}/>;
      createRoot(document.getElementById('root')).render(<ThemeProvider><Shell>{location.pathname==='/skeleton'?<Skeleton variant="finances"/>:location.pathname==='/salary'?<Salary open initial={[{amount:1000.50,day:5,payDayType:'fixed'},{amount:1000.75,day:20,payDayType:'fixed'}]} onClose={()=>{}} onSaved={()=>{}}/>:location.pathname==='/goals'?<Goals initialGoals={[]}/>:location.pathname==='/habits'?habits:<Calendar/>}</Shell></ThemeProvider>);`,
    loader: 'tsx', resolveDir: process.cwd(),
  },
  bundle: true, write: false, jsx: 'automatic', format: 'iife',
  define: { 'process.env.NODE_ENV': '"production"', 'process.env': '{}' },
  plugins: [{
    name: 'next-fixtures',
    setup(b) {
      b.onResolve({ filter: /^next\/(navigation|link|image|dynamic)$/ }, a => ({ path: a.path, namespace: 'fixture' }))
      b.onLoad({ filter: /.*/, namespace: 'fixture' }, a => ({
        loader: 'jsx', resolveDir: process.cwd(),
        contents: a.path.endsWith('navigation')
          ? `export const useRouter=()=>({push:()=>{},replace:()=>{},refresh:()=>{},prefetch:()=>{}});export const usePathname=()=>location.pathname;export const useSearchParams=()=>new URLSearchParams();`
          : a.path.endsWith('dynamic') ? 'export default ()=>()=>null;'
          : a.path.endsWith('image') ? `import React from 'react';export default function Image({fill,priority,...p}){return <img {...p}/>}`
          : `import React from 'react';export const useLinkStatus=()=>({pending:false});export default function Link({children,...p}){return <a {...p}>{children}</a>}`,
      }))
    },
  }],
})
const css = Buffer.concat(await Promise.all((await readdir('.next/static/css'))
  .filter(f => f.endsWith('.css')).map(f => readFile('.next/static/css/' + f))))
const server = createServer(async (req, res) => {
  if (req.url === '/app.js') {
    res.setHeader('Content-Type', 'text/javascript'); res.end(bundle.outputFiles[0].text)
  } else if (req.url === '/style.css') {
    res.setHeader('Content-Type', 'text/css'); res.end(css)
  } else if (req.url === '/assets/logo/broto-mark.png') {
    res.setHeader('Content-Type', 'image/png'); res.end(await readFile('public/assets/logo/broto-mark.png'))
  } else {
    res.setHeader('Content-Type', 'text/html')
    res.end('<html><head><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/style.css"></head><body class="font-sans" style="--font-sans:Arial;--font-display:Arial"><div id="root"></div><script src="/app.js"></script></body></html>')
  }
})
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve))
const browser = await chromium.launch({ channel: 'chrome', headless: true })
try {
  const page = await browser.newPage({ viewport: { width: 320, height: 568 }, colorScheme: 'light', reducedMotion: 'reduce', timezoneId: 'America/Sao_Paulo' })
  const errors = []
  page.on('pageerror', e => errors.push(e.message))
  await page.goto(`http://127.0.0.1:${server.address().port}`)
  await page.getByText(title, { exact: true }).last().waitFor()
  for (const dark of [true, false, true]) {
    await page.emulateMedia({ colorScheme: dark ? 'dark' : 'light' })
    await page.waitForFunction(expected => document.documentElement.classList.contains('dark') === expected, dark)
  }
  for (const width of [320, 390, 430, 768, 1440]) {
    await page.setViewportSize({ width, height: width === 320 ? 568 : 844 })
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth), width)
    const bounds = await page.locator('main, header, .card').evaluateAll(els => els.every(el => {
      const r = el.getBoundingClientRect(); return r.left >= 0 && r.right <= innerWidth + 1
    }))
    assert(bounds, `Calendar content fits ${width}px`)
  }
  const sidebar = page.locator('.app-sidebar')
  await page.getByRole('button', { name: 'Recolher menu', exact: true }).click()
  await page.waitForFunction(() => document.querySelector('.app-sidebar').getBoundingClientRect().width === 80)
  assert.equal(await page.locator('.app-content').evaluate(el => getComputedStyle(el).paddingLeft), '80px')
  await page.getByRole('button', { name: 'Expandir menu', exact: true }).click()
  await page.waitForFunction(() => document.querySelector('.app-sidebar').getBoundingClientRect().width === 224)
  const activeTransform = await sidebar.locator('.nav-active-indicator').evaluate(el => getComputedStyle(el).transform)
  await sidebar.getByRole('link', { name: 'Finanças', exact: true }).hover()
  assert.equal(await sidebar.locator('.nav-hover-indicator').evaluate(el => new DOMMatrix(getComputedStyle(el).transform).m42), 54)
  assert.equal(await sidebar.locator('.nav-active-indicator').evaluate(el => getComputedStyle(el).transform), activeTransform, 'hover must not change current-page marker')
  await page.setViewportSize({ width: 320, height: 568 })
  await page.getByRole('button', { name: 'Mais', exact: true }).click()
  const menu = page.getByRole('dialog', { name: 'Navegação Rápida' })
  const menuBox = await menu.boundingBox()
  assert(menuBox.y >= 0 && menuBox.y + menuBox.height <= 568)
  await page.getByRole('button', { name: 'Sair da conta', exact: true }).scrollIntoViewIfNeeded()
  assert((await page.getByRole('button', { name: 'Sair da conta', exact: true }).boundingBox()).y >= 0)
  await page.keyboard.press('Escape')
  assert.equal(await menu.count(), 0)
  assert.equal(await page.evaluate(() => document.body.style.overflow), '')
  await page.emulateMedia({ reducedMotion: 'no-preference' })
  await page.getByRole('button', { name: 'Mais', exact: true }).click()
  await menu.waitFor()
  await page.waitForTimeout(300)
  await page.getByRole('button', { name: 'Fechar navegação rápida' }).click()
  await page.locator('.mobile-navigation-overlay').waitFor({ state: 'detached' })
  assert.equal(await page.evaluate(() => document.body.style.overflow), '', 'animated closing restores page scroll')
  await page.getByRole('button', { name: 'Mais', exact: true }).click()
  await menu.waitFor()
  await page.keyboard.press('Escape')
  await page.locator('.mobile-navigation-overlay').waitFor({ state: 'detached' })
  await page.emulateMedia({ reducedMotion: 'reduce' })
  const month = await page.locator('h3').first().textContent()
  await page.getByRole('button', { name: 'Próximo mês', exact: true }).click()
  assert.notEqual(await page.locator('h3').first().textContent(), month)
  await page.getByRole('button', { name: 'Mês anterior', exact: true }).click()
  assert.equal(await page.locator('h3').first().textContent(), month)
  await page.getByRole('button', { name: 'Novo evento', exact: true }).first().click()
  for (const width of [320, 390, 430]) {
    await page.setViewportSize({ width, height: 844 })
    const fields = await page.locator('#mobile-event-date, #mobile-event-startTime, #mobile-event-endTime').evaluateAll(els => els.map(el => {
      const { left, right, width } = el.getBoundingClientRect(); return { left, right, width }
    }))
    assert(fields.every(f => f.left >= 0 && f.right <= width && f.width > 0))
    assert(fields[1].right < fields[2].left, 'Start/end controls do not overlap')
  }
  // Simulate an overlaid keyboard: layout viewport stays tall while visual viewport shrinks/pans.
  await page.evaluate(() => {
    Object.defineProperty(visualViewport, 'height', { configurable: true, value: 390 })
    Object.defineProperty(visualViewport, 'offsetTop', { configurable: true, value: 70 })
    visualViewport.dispatchEvent(new Event('resize'))
  })
  await page.waitForFunction(() => document.querySelector('[aria-labelledby="mobile-event-title"]').getBoundingClientRect().height === 390)
  const modal = await page.getByRole('dialog').boundingBox()
  const footer = await page.getByRole('button', { name: 'Criar Evento', exact: true }).boundingBox()
  assert.equal(modal.y, 70)
  assert(footer.y >= 70 && footer.y + footer.height <= 460)
  await page.locator('textarea:visible').fill('Descrição demonstrativa')
  await page.getByRole('button', { name: 'Fechar evento', exact: true }).click()
  assert.equal(await page.getByRole('dialog').count(), 0)
  await page.setViewportSize({ width: 320, height: 568 })
  await page.goto(`http://127.0.0.1:${server.address().port}/goals`)
  await page.getByRole('button', { name: 'Nova Meta', exact: true }).click()
  const goalSave = await page.getByRole('button', { name: 'Criar Meta', exact: true }).boundingBox()
  assert(goalSave.y >= 0 && goalSave.y + goalSave.height <= 568, 'Goal footer stays inside short viewport')
  const goalDate = await page.locator('input[type=date]').boundingBox()
  assert(goalDate.x >= 0 && goalDate.x + goalDate.width <= 320)
  await page.goto(`http://127.0.0.1:${server.address().port}/habits`)
  const week = page.locator('.grid.grid-cols-7').first()
  assert.equal(await week.locator('button').count(), 7)
  assert(await week.locator('button').evaluateAll(els => els.every(e => e.getBoundingClientRect().right <= innerWidth)))
  const habitName = page.getByText('Beber dois litros de água diariamente', { exact: true })
  assert(await habitName.evaluate(e => e.scrollWidth <= e.clientWidth), 'Mobile habit name is readable')
  await page.getByRole('button', { name: 'Novo Hábito', exact: true }).click()
  await page.getByRole('button', { name: 'Criar Hábito', exact: true }).scrollIntoViewIfNeeded()
  const habitSave = await page.getByRole('button', { name: 'Criar Hábito', exact: true }).boundingBox()
  assert(habitSave.y >= 0 && habitSave.y + habitSave.height <= 568, 'Habit footer is reachable by scrolling')
  assert(await page.getByRole('dialog').locator('button[title]').evaluateAll(els => els.every(e => e.getBoundingClientRect().right <= innerWidth)))
  assert.deepEqual(errors, [])
  await page.goto(`http://127.0.0.1:${server.address().port}/salary`)
  const salary = page.getByRole('dialog', { name: 'Configurar salário' })
  await salary.waitFor()
  assert.equal(await page.locator('#salary-amount-0').inputValue(), '1000,5')
  await page.getByRole('button', { name: 'Salvar', exact: true }).scrollIntoViewIfNeeded()
  const salarySave = await page.getByRole('button', { name: 'Salvar', exact: true }).boundingBox()
  assert(salarySave.y >= 0 && salarySave.y + salarySave.height <= 568)
  await page.getByRole('button', { name: 'Salvar', exact: true }).click()
  const request = await page.evaluate(() => JSON.parse(window.salaryRequest.body))
  assert.deepEqual(request.payments.map(p => p.amount), [1000.5, 1000.75], 'reopening salary preserves centavos when saving')
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth), 320)
  await page.goto(`http://127.0.0.1:${server.address().port}/skeleton`)
  for (const width of [320, 390, 430]) {
    await page.setViewportSize({ width, height: 844 })
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth), width, 'loading placeholder fits mobile')
  }
  assert.equal(await page.locator('.page-loading-track').evaluate(el => getComputedStyle(el, '::after').animationName), 'none', 'reduced motion keeps loading feedback static')
  assert.deepEqual(errors, [])
  console.log('Mobile regressions passed: system theme, 5 widths, calendar, drawer, dates, simulated keyboard, goals footer, seven habit days, sidebar collapse/hover, salary centavos and footer. Not a physical keyboard/Safari test.')
} finally {
  await browser.close()
  await new Promise(resolve => server.close(resolve))
}
