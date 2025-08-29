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

let webpackManifest

export function context (request) {
  const ctx = request.response.source?.context || {}
  if (!webpackManifest) {
    try {
      webpackManifest = JSON.parse(readFileSync(manifestPath, 'utf-8'))
    } catch (err) {
      logger.error(`Webpack ${path.basename(manifestPath)} not found`)
    }
  }

  return {
    ...ctx,
    assetPath: `${assetPath}/assets/rebrand`,
    serviceName: config.get('serviceName'),
    serviceUrl: '/',
    breadcrumbs: [],
    getAssetPath (asset) {
      const webpackAssetPath = webpackManifest?.[asset]
      return `${assetPath}/${webpackAssetPath ?? asset}`
    }
  }
}
