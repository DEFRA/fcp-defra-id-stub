import Wreck from '@hapi/wreck'
import { getOidcConfig } from '../entra/get-oidc-config.js'
import { config } from '../config/config.js'

async function refreshTokens (refreshToken) {
  const { token_endpoint: url } = await getOidcConfig()

  const query = [
    `client_id=${config.get('entra.clientId')}`,
    `client_secret=${config.get('entra.clientSecret')}`,
    'grant_type=refresh_token',
    `scope=${config.get('entra.clientId')}/.default offline_access`,
    `refresh_token=${refreshToken}`,
    `redirect_uri=${config.get('entra.redirectUrl')}`
  ].join('&')

  const { payload } = await Wreck.post(`${url}?${query}`, {
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    json: true
  })

  // Payload will include both a new access token and a new refresh token
  // Refresh tokens can only be used once, so the new refresh token should be stored in place of the old one
  return payload
}

export { refreshTokens }
