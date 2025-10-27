import Jwt from '@hapi/jwt'
import { getOidcConfig } from '../entra/get-oidc-config.js'
import { getSafeRedirect } from '../utils/get-safe-redirect.js'
import { config } from '../config/config.js'

export const entra = {
  plugin: {
    name: 'entra',
    register: async (server) => {
      if (config.get('entra.enabled')) {
        const oidcConfig = await getOidcConfig()
        server.auth.strategy('entra', 'bell', getBellOptions(oidcConfig))
      }
    }
  }
}

function getBellOptions (oidcConfig) {
  return {
    provider: {
      name: 'entra',
      protocol: 'oauth2',
      useParamsAuth: true,
      auth: oidcConfig.authorization_endpoint,
      token: oidcConfig.token_endpoint,
      scope: [`${config.get('entra.clientId')}/.default`, 'offline_access'],
      profile: (credentials, _params, _get) => getProfile(credentials, _params, _get)
    },
    clientId: config.get('entra.clientId'),
    clientSecret: config.get('entra.clientSecret'),
    password: config.get('cookie.password'),
    isSecure: config.get('cookie.isSecure'),
    forceHttps: config.get('cookie.isSecure'),
    location: function (request) {
      // If request includes a redirect query parameter, store it in the session to allow redirection after authentication
      if (request.query.redirect) {
        // Ensure redirect is a relative path to prevent redirect attacks
        const safeRedirect = getSafeRedirect(request.query.redirect)
        request.yar.set('redirect', safeRedirect)
      }

      return config.get('entra.redirectUrl')
    },
    providerParams: function (_request) {
      return {
        response_mode: 'query'
      }
    }
  }
}

function getProfile (credentials, _params, _get) {
  const payload = Jwt.token.decode(credentials.token).decoded.payload

  credentials.profile = {
    ...payload,
    sessionId: payload.sid
  }
}

export { getBellOptions, getCookieOptions }
