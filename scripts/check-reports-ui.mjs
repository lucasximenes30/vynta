import assert from 'node:assert/strict'
import { createServer } from 'node:http'
import { readFile, readdir, mkdtemp, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createRequire } from 'node:module'
import { build } from 'esbuild'
const require = createRequire(import.meta.url)
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright')
const output = await mkdtemp(join(tmpdir(), 'vynta-ui-'))
const bundle = await build({
  stdin: {
    contents: `import React from 'react'; import {createRoot} from 'react-dom/client'; import Reports from './app/reports/ReportsClient'; import Help from './app/settings/help/HelpClient'; import Tour from './components/tour/TourHost'; import {analyzeFinancialHealth} from './lib/financialHealth'; const period=new Intl.DateTimeFormat('sv-SE',{timeZone:'America/Sao_Paulo',year:'numeric',month:'2-digit'}).format(new Date()); const initial={period,summary:{income:1000,expense:1300,balance:-300,transactionCount:4},previous:{income:900,expense:800,balance:100,transactionCount:3},comparison:{incomeChange:100,expenseChange:500,balanceChange:-400},categories:[{category:'Restaurant',amount:1000},{category:'Transport',amount:300}],months:[period,'2026-10','2027-10'],trend:Array.from({length:6},(_,i)=>({month:'out.',year:2026,income:900+i*20,expense:800+i*100}))}; const health=analyzeFinancialHealth([{id:'1',title:'Salário',date:period+'-01',type:'INCOME',category:'Salary',amount:1000},{id:'2',title:'Pizza',date:period+'-05',type:'EXPENSE',category:'Restaurant',amount:1300}],period); window.fetch=async(input,options)=>{const url=String(input);if(url.includes('advanced'))return Response.json(health);if(url.includes('monthly')) {const params=new URL(url,location.origin).searchParams; return Response.json({...initial,period:params.get('year')+'-'+params.get('month')})}if(url.includes('insights'))return Response.json({insights:[{type:'tip',text:'Revise os lançamentos do período.'}]});return Response.json({})};createRoot(document.getElementById('root')).render(<><main>{location.pathname.includes('help')?<Help/>:<Reports initialReport={initial}/>}</main><Tour/></>);`,
    loader: 'tsx',
    resolveDir: process.cwd(),
  },
  bundle: true,
  write: false,
  format: 'iife',
  jsx: 'automatic',
  define: { 'process.env.NODE_ENV': '"production"' },
  plugins: [
    {
      name: 'next-fixtures',
      setup(b) {
        b.onResolve({ filter: /^next\/(dynamic|link|navigation)$/ }, (a) => ({
          path: a.path,
          namespace: 'mock',
        }))
        b.onLoad({ filter: /.*/, namespace: 'mock' }, (a) => ({
          loader: 'jsx',
          resolveDir: process.cwd(),
          contents: a.path.endsWith('dynamic')
            ? `import React from 'react'; export default function dynamic(load){const C=React.lazy(load);return props=><React.Suspense fallback={<p>Carregando…</p>}><C {...props}/></React.Suspense>}`
            : a.path.endsWith('link')
              ? `import React from 'react';export default function Link({children,...props}){return <a {...props}>{children}</a>}`
              : `export const useRouter=()=>({push:path=>location.assign(path),refresh:()=>{},replace:path=>location.replace(path)});export const usePathname=()=>location.pathname;export const useSearchParams=()=>new URLSearchParams(location.search);`,
        }))
      },
    },
  ],
})
const css = Buffer.concat(
  await Promise.all(
    (await readdir('.next/static/css'))
      .filter((f) => f.endsWith('.css'))
      .map((f) => readFile('.next/static/css/' + f)),
  ),
)
const server = createServer((req, res) => {
  if (req.url === '/app.js') {
    res.setHeader('Content-Type', 'text/javascript')
    res.end(bundle.outputFiles[0].text)
  } else if (req.url === '/style.css') {
    res.setHeader('Content-Type', 'text/css')
    res.end(css)
  } else {
    res.setHeader('Content-Type', 'text/html')
    res.end(
      '<!doctype html><html class="dark"><head><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/style.css"></head><body style="--font-sans:Arial;--font-display:Arial" class="font-sans"><div id="root"></div><script src="/app.js"></script></body></html>',
    )
  }
})
await new Promise((r) => server.listen(0, '127.0.0.1', r))
const origin = `http://127.0.0.1:${server.address().port}`
const browser = await chromium.launch({ channel: 'chrome', headless: true })
try {
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1000 },
    reducedMotion: 'reduce',
  })
  const errors = []
  page.on('pageerror', (e) => errors.push(e.message))
  await page.goto(origin + '/reports')
  assert.equal(
    await page.locator('#report-month').isVisible(),
    false,
    'desktop uses the custom picker',
  )
  await page.getByRole('button', { name: /Período do relatório:/ }).click()
  assert.equal(
    await page
      .getByRole('button', { name: 'Próximo ano', exact: true })
      .isDisabled(),
    true,
  )
  const future = await page
    .locator('#report-month-options button:disabled')
    .count()
  assert(future >= 1)
  await page.keyboard.press('Escape')
  assert.equal(await page.locator('#report-month-options').count(), 0)
  await page
    .getByRole('button', { name: /Saúde financeira do período/ })
    .click()
  await page.getByText('O que compõe sua pontuação').waitFor()
  assert(
    await page.getByText('Sobra para guardar', { exact: true }).isVisible(),
    'breakdown remains visible with reduced motion',
  )
  assert(!(await page.getByText('-953%').count()))
  await page
    .locator('#advanced-report')
    .screenshot({ path: join(output, 'desktop.png') })
  await page.getByRole('button', { name: 'Semanal', exact: true }).click()
  await page.getByText('Semana a semana', { exact: true }).waitFor()
  assert((await page.getByText(/a .*nov\./).count()) > 0)
  await page.getByRole('button', { name: 'Alertas', exact: true }).click()
  await page
    .getByText('Ainda falta histórico para comparar', { exact: true })
    .waitFor()
  await page.setViewportSize({ width: 390, height: 844 })
  await page.getByRole('button', { name: 'Score', exact: true }).click()
  await page
    .locator('#advanced-report')
    .screenshot({ path: join(output, 'mobile.png') })
  assert(await page.locator('#report-month').isVisible())
  assert(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
    'no mobile horizontal overflow',
  )
  assert(
    !(await page.locator('#report-month option').allTextContents()).some((v) =>
      v.includes('2027'),
    ),
  )
  await page.goto(origin + '/settings/help')
  await page.getByLabel('Buscar um assunto').fill('offline')
  assert(
    await page
      .getByRole('button', { name: 'Sem internet e sincronização' })
      .count(),
  )
  await page
    .getByRole('button', { name: 'Sem internet e sincronização' })
    .click()
  await page.getByText('No iPhone/iPad:', { exact: false }).waitFor()
  await page
    .getByRole('button', { name: 'Refazer tutorial', exact: true })
    .click()
  await page
    .getByRole('button', { name: 'Pular tutorial', exact: true })
    .last()
    .click()
  await page
    .getByRole('button', { name: 'Sair do tutorial', exact: true })
    .click()
  assert.equal(await page.getByRole('dialog').count(), 0)
  assert.deepEqual(errors, [])
  console.log(
    'UI checks passed: month bounds, desktop picker, mobile layout, reduced motion, weekly labels, honest alerts, FAQ search and replay/skip tutorial. Screenshots: ' +
      output,
  )
} finally {
  await browser.close()
  await new Promise((r) => server.close(r))
}
