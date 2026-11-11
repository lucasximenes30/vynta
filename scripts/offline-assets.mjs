import { readdir, writeFile } from 'node:fs/promises'
const files = await readdir('.next/static', { recursive: true })
await writeFile(
  'public/offline-assets.json',
  JSON.stringify(
    files
      .filter((file) => /\.(js|css|woff2?)$/.test(file))
      .map((file) => '/_next/static/' + file.replaceAll('\\', '/')),
  ),
)
