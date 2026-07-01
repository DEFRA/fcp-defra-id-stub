import hapiPulse from 'hapi-pulse'
import { createLogger } from './logging/logger.js'
import { config } from '../../config/config.js'

const tenSeconds = 10 * 1000
const oneSecond = 1 * 1000

const pulse = {
  plugin: hapiPulse,
  options: {
    logger: createLogger(),
    timeout: config.get('isDevelopment') ? oneSecond : tenSeconds
  }
}

export { pulse }
