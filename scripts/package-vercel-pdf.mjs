import { copyFile, mkdir } from 'node:fs/promises'
import { join } from 'node:path'

if (process.env.VERCEL) {
  // Run after Nitro has emitted its Vercel routes and function metadata.
  const dir = '.vercel/output/functions/__server.func/node_modules/pdfkit'
  await mkdir(dir, { recursive: true })
  await copyFile('node_modules/pdfkit/js/pdfkit.standalone.js', join(dir, 'index.js'))
  await copyFile('node_modules/pdfkit/LICENSE', join(dir, 'LICENSE'))
}
