import path from 'node:path'
import { readFileSync } from 'node:fs'
import { config } from '../config.js'
import { createLogger } from '../../common/helpers/logging/logger.js'

const logger = createLogger()
const assetPath = config.get('assetPath')
const manifestPath = path.join(
  config.get('root'),
  '.public/assets-manifest.json'
)

const entraEnabled = config.get('entra.enabled')

let assetManifest

function buildAssetMap (manifest) {
  const map = {}
  for (const chunk of Object.values(manifest)) {
    if (chunk.isEntry) {
      map['application.js'] = chunk.file
      if (chunk.css?.[0]) {
        map['stylesheets/application.css'] = chunk.css[0]
      }
    }
  }
  return map
}

export async function context (request) {
  const ctx = request.response.source?.context || {}
  if (!assetManifest) {
    try {
      assetManifest = buildAssetMap(JSON.parse(readFileSync(manifestPath, 'utf-8')))
    } catch {
      logger.error(`Vite ${path.basename(manifestPath)} not found`)
    }
  }

  const defaultContext = {
    ...ctx,
    assetPath: `${assetPath}/assets/rebrand`,
    serviceName: config.get('serviceName'),
    serviceUrl: '/',
    authSource: config.get('auth.source'),
    s3Enabled: config.get('aws.s3Enabled'),
    entraEnabled,
    getAssetPath (asset) {
      const viteAssetPath = assetManifest?.[asset]
      return `${assetPath}/${viteAssetPath ?? asset}`
    }
  }

  if (!entraEnabled || !request.auth?.isAuthenticated) {
    return defaultContext
  }

  return {
    ...defaultContext,
    auth: request.auth.credentials
  }
}
