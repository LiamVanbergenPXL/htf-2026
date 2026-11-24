import { defineConfig, loadEnv, type Rolldown } from 'vite'
import { devtools } from '@tanstack/devtools-vite'

import { tanstackStart } from '@tanstack/react-start/plugin/vite'

import viteReact from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { nitro } from 'nitro/vite'

const IGNORED_SERVER_WARNINGS = new Set([
  'EVAL',
  'CIRCULAR_DEPENDENCY',
  'THIS_IS_UNDEFINED',
  'EMPTY_BUNDLE',
  'MODULE_LEVEL_DIRECTIVE',
])

const config = defineConfig(({ mode }) => {
  // Only load these server variables; never expose them through VITE_ or define.
  const serverEnv = loadEnv(mode, process.cwd(), ['OLLAMA_', 'AURI_'])
  for (const key of ['OLLAMA_BASE_URL', 'AURI_MODEL']) {
    if (process.env[key] === undefined && serverEnv[key] !== undefined) process.env[key] = serverEnv[key]
  }
  return {
    resolve: { tsconfigPaths: true },
    plugins: [
      devtools(),
      nitro({
        rollupConfig: {
          external: [/^@sentry\//],
          // Overrides nitro's own onwarn, so its default ignore list is repeated here.
          // MODULE_LEVEL_DIRECTIVE: "use client" in @tanstack/react-router is irrelevant
          // in the server bundle (no React Server Components), so the warning is noise.
          onwarn(warning: Rolldown.RolldownLog, warn: Rolldown.LoggingFunction) {
            if (IGNORED_SERVER_WARNINGS.has(warning.code ?? '')) return
            warn(warning)
          },
        },
      }),
      tailwindcss(),
      tanstackStart({
        router: {
          routeTreeFileHeader: [
            '/* eslint-disable */',
            '// @ts-nocheck',
            // The Start generator includes a type import used only with a custom start entry.
            '// noinspection JSUnusedGlobalSymbols,ES6UnusedImports',
          ],
        },
      }),
      viteReact(),
    ],
  }
})

export default config
