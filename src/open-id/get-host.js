import { config } from '../config/config.js'

export function getHost () {
  const overrideHost = config.get('wellKnown.host')

  if (overrideHost) {
    return overrideHost
  }

  const environment = config.get('environment')

  if (environment === 'local') {
    return `http://localhost:${config.get('port')}`
  }

  return `https://fcp-defra-id-stub.${environment}.cdp-int.defra.cloud`
}

export function getApiHost () {
  const overrideApiHost = config.get('wellKnown.apiHost')

  if (overrideApiHost) {
    return overrideApiHost
  }

  const host = getHost()

  if (host.includes('localhost')) {
    return host.replace('localhost', 'host.docker.internal')
  }

  return host
}
