// Technical size exports; the approved original is preserved without retouching.
import sharp from 'sharp'
import { copyFile, mkdir } from 'node:fs/promises'
const source = 'marketing/branding/2026-11-rebrand/candidates/B1.png'
await mkdir('public/assets/logo', { recursive: true })
await copyFile(source, 'public/assets/logo/mascot-original.png')
for (const [path, size] of [
  ['public/assets/logo/broto-mark.png', 256], ['public/assets/logo/logo-mark.png', 256], ['public/assets/logo/logo.png', 512],
  ['public/icons/icon-192.png', 192], ['public/icons/icon-512.png', 512],
  ['public/icons/apple-touch-icon.png', 180], ['app/apple-icon.png', 180], ['app/icon.png', 192],
]) await sharp(source).resize(size, size).png().toFile(path)
await sharp(source).resize(640, 640).webp({ quality: 88 }).toFile('public/assets/logo/mascot.webp')
// Entire square artwork fits inside the maskable safe circle (radius 40%).
for (const size of [192, 512]) {
  const inner = Math.floor(size * 0.56)
  const buffer = await sharp(source).resize(inner, inner).png().toBuffer()
  await sharp({ create: { width: size, height: size, channels: 4, background: '#ADA6CE' } })
    .composite([{ input: buffer, gravity: 'centre' }]).png().toFile(`public/icons/icon-maskable-${size}.png`)
}
console.log('Approved B1 exported to app, PWA and shared brand assets.')

for (const file of ['icon-192.png', 'icon-512.png', 'icon-maskable-192.png', 'icon-maskable-512.png', 'apple-touch-icon.png']) {
  await copyFile(`public/icons/${file}`, `public/icons/broto-${file}`)
}
await sharp('marketing/branding/2026-11-rebrand/notification-badge-source.png').resize(96, 96).png().toFile('public/icons/badge-96.png')
await copyFile('public/icons/badge-96.png', 'public/icons/broto-badge-96.png')
