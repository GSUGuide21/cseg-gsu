/**
 * Copies MapLibre's web worker into public/vendor so the campus map can load it by URL.
 * MapLibre 6 finds its worker relative to its own file, which bundling breaks, so the map
 * calls setWorkerUrl() with this copy instead. Runs after every install (see "postinstall").
 * The file name carries the version, so the page and the worker always match.
 */
import { copyFileSync, mkdirSync, readdirSync, readFileSync, rmSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const pkg = join(root, 'node_modules', 'maplibre-gl')
const { version } = JSON.parse(readFileSync(join(pkg, 'package.json'), 'utf8'))
const outDir = join(root, 'public', 'vendor')
const name = `maplibre-gl-worker-${version}.mjs`

mkdirSync(outDir, { recursive: true })
for (const old of readdirSync(outDir)) if (old.startsWith('maplibre-gl-worker-') && old !== name) rmSync(join(outDir, old))
copyFileSync(join(pkg, 'dist', 'maplibre-gl-worker.mjs'), join(outDir, name))
console.log(`public/vendor/${name}`)
