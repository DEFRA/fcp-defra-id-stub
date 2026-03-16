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

let webpackManifest

export async function context (request) {
  const ctx = request.response.source?.context || {}
  if (!webpackManifest) {
    try {
      webpackManifest = JSON.parse(readFileSync(manifestPath, 'utf-8'))
    } catch {
      logger.error(`Webpack ${path.basename(manifestPath)} not found`)
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
      const webpackAssetPath = webpackManifest?.[asset]
      return `${assetPath}/${webpackAssetPath ?? asset}`
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
