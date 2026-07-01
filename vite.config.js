import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { cp } from 'node:fs/promises'
import { defineConfig } from 'vite'
import { NodePackageImporter } from 'sass'

const dirname = import.meta.dirname

const govukFrontendPath = path.dirname(
  fileURLToPath(import.meta.resolve('govuk-frontend/package.json'))
)

export default defineConfig(({ mode }) => ({
  root: path.resolve(dirname, 'src/client'),
  build: {
    outDir: path.resolve(dirname, '.public'),
    emptyOutDir: true,
    manifest: 'assets-manifest.json',
    sourcemap: mode === 'production' ? true : 'inline',
    rollupOptions: {
      input: {
        application: path.resolve(dirname, 'src/client/javascript/application.js')
      },
      output: {
        entryFileNames: mode === 'production'
          ? 'javascript/[name].[hash:7].min.js'
          : 'javascript/[name].js',
        chunkFileNames: mode === 'production'
          ? 'javascript/[name].[chunkhash:7].min.js'
          : 'javascript/[name].js',
        assetFileNames: ({ names }) => {
          const name = names[0] ?? ''
          if (/\.css$/.test(name)) {
            return mode === 'production'
              ? 'stylesheets/[name].[hash:7].min.css'
              : 'stylesheets/[name].css'
          }
          if (/\.(woff2?|eot|ttf|otf)$/.test(name)) {
            return 'assets/fonts/[name][extname]'
          }
          return 'assets/images/[name][extname]'
        }
      }
    }
  },
  css: {
    lightningcss: {
      errorRecovery: true
    },
    preprocessorOptions: {
      scss: {
        importers: [new NodePackageImporter()],
        loadPaths: [
          path.resolve(dirname, 'src/client/stylesheets'),
          path.resolve(dirname, 'src/views/macros')
        ],
        quietDeps: true,
        sourceMapIncludeSources: true
      }
    }
  },
  plugins: [
    {
      name: 'copy-static-assets',
      apply: 'build',
      async writeBundle () {
        await cp(
          path.join(govukFrontendPath, 'dist/govuk/assets'),
          path.resolve(dirname, '.public/assets'),
          { recursive: true }
        )
      }
    }
  ]
}))
