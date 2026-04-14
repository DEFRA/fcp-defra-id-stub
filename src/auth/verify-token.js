import { createPublicKey } from 'node:crypto'
import Wreck from '@hapi/wreck'
import Jwt from '@hapi/jwt'
import { getOidcConfig } from '../entra/get-oidc-config.js'

async function verifyToken (token) {
  const decoded = Jwt.token.decode(token)
  const { header } = decoded.decoded

  const { jwks_uri: uri } = await getOidcConfig()

  const { payload } = await Wreck.get(uri, {
    json: true
  })

  const { keys } = payload

  const jwk = keys.find(k => k.kid === header.kid || k.x5t === header.kid)

  if (!jwk) {
    throw new Error(`No matching JWK for kid ${header.kid}`)
  }

  const pem = createPublicKey({ key: jwk, format: 'jwk' }).export({ type: 'spki', format: 'pem' })

  Jwt.token.verify(decoded, { key: pem, algorithm: 'RS256' })
}

export { verifyToken }
