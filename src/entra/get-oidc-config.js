import Wreck from '@hapi/wreck'
import { config } from '../config/config.js'

async function getOidcConfig () {
  const wellKnownUrl = config.get('entra.wellKnownUrl')

  if (!wellKnownUrl) {
    throw new Error('ENTRA_WELL_KNOWN_URL must be set when ENTRA_ENABLED=true')
  }

  const { payload } = await Wreck.get(wellKnownUrl, {
    json: true
  })

  return payload
}

export { getOidcConfig }
