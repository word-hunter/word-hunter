import { defineConfig } from 'vite'
import solidPlugin from 'vite-plugin-solid'
import { crx, ManifestV3Export } from '@crxjs/vite-plugin'
import manifest from './manifest.json'

export default defineConfig({
  build: {
    outDir: 'build',
    target: 'esnext'
  },
  plugins: [solidPlugin(), crx({ manifest: manifest as ManifestV3Export })]
})
