import { config } from '../config/config.js'

export function getHost () {
  const environment = config.get('environment')

  if (environment === 'local') {
    return `http://localhost:${config.get('port')}`
  }

  return `https://fcp-defra-id-stub.${environment}.cdp-int.defra.cloud`
}
