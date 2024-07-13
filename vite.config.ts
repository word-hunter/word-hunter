import fs from 'node:fs'
import path from 'node:path'
import { defineConfig } from 'vite'
import solidPlugin from 'vite-plugin-solid'
import { crx, ManifestV3Export } from '@crxjs/vite-plugin'
import manifest from './manifest.json'

/**
 * @HACK: Chrome 128 implements the use_dynamic_url feature. If it's set to true, chrome will not load
 * the content js file, and crx always set this field to true.
 */
function updateManifest() {
  const manifestPath = path.relative(__dirname, './build/manifest.json')
  const json = JSON.parse(fs.readFileSync(manifestPath, 'utf8'))

  if (json) {
    json.web_accessible_resources.forEach((resource: any) => {
      resource.use_dynamic_url = false
    })

    fs.writeFileSync(manifestPath, JSON.stringify(json, null, 2))
  }
}

function updateManifestPlugin() {
  return {
    name: 'update-manifest',
    transform: updateManifest,
    writeBundle: updateManifest
  }
}

export default defineConfig({
  build: {
    outDir: 'build',
    target: 'esnext',
    rollupOptions: {
      input: {
        review: 'src/review.html'
      }
    },
    sourcemap: false
  },
  plugins: [solidPlugin(), crx({ manifest: manifest as ManifestV3Export }), updateManifestPlugin()]
})
