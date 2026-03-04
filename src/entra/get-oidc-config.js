import Wreck from '@hapi/wreck'
import { config } from '../config/config.js'

async function getOidcConfig () {
  const { payload } = await Wreck.get(config.get('entra.wellKnownUrl'), {
    json: true
  })

  return payload
}

export { getOidcConfig }
