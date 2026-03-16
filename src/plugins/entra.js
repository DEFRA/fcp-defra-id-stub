import Jwt from '@hapi/jwt'
import { getOidcConfig } from '../entra/get-oidc-config.js'
import { getSafeRedirect } from '../utils/get-safe-redirect.js'
import { config } from '../config/config.js'
import { refreshTokens } from '../auth/refresh-tokens.js'

export const entra = {
  plugin: {
    name: 'entra',
    register: async (server) => {
      if (config.get('entra.enabled')) {
        const oidcConfig = await getOidcConfig()

        // Bell is a third-party plugin that provides a common interface for OAuth 2.0 authentication
        // Used to authenticate users with Entra and a pre-requisite for the Cookie authentication strategy
        // Also used for changing organisations and signing out
        server.auth.strategy('entra', 'bell', getBellOptions(oidcConfig))

        // Cookie is a built-in authentication strategy for hapi.js that authenticates users based on a session cookie
        // Used for all non-Entra routes
        // Lax policy required to allow redirection after Entra sign out
        server.auth.strategy('session', 'cookie', getCookieOptions())

        // Do not set a default authentication strategy
        // Routes that need authentication should explicitly set auth: 'session' or auth: { strategy: 'session', scope: [...] }
        // Routes that don't need authentication should explicitly set auth: false
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

function getCookieOptions () {
  return {
    cookie: {
      password: config.get('cookie.password'),
      path: '/',
      isSecure: config.get('cookie.isSecure'),
      isSameSite: 'Lax'
    },
    redirectTo: function (request) {
      return `/auth/sign-in?redirect=${request.url.pathname}${request.url.search}`
    },
    validate: async (request, session) => validateToken(request, session)
  }
}

function getProfile (credentials, _params, _get) {
  const payload = Jwt.token.decode(credentials.token).decoded.payload

  // Map all JWT properties to the credentials object so it can be stored in the session
  // Add some additional properties to the profile object for convenience
  // login_hint is an optional claim.  A normal change request to CCoE is required to enable this.
  credentials.profile = {
    ...payload,
    sessionId: payload.sid,
    loginHint: payload.login_hint
  }
}

async function validateToken (request, session) {
  const userSession = await request.server.app.cache.get(session.sessionId)

  // If session does not exist, return an invalid session
  if (!userSession) {
    return { isValid: false }
  }

  // Verify Entra token has not expired
  try {
    const decoded = Jwt.token.decode(userSession.token)
    Jwt.token.verifyTime(decoded)
  } catch (err) {
    if (!config.get('entra.refreshTokens')) {
      request.server?.logger?.info(err.message)
      return { isValid: false }
    }
    const { access_token: token, refresh_token: refreshToken } = await refreshTokens(userSession.refreshToken)
    userSession.token = token
    userSession.refreshToken = refreshToken
    await request.server.app.cache.set(session.sessionId, userSession)
  }

  // Set the user's details on the request object and allow the request to continue
  // Depending on the service, additional checks can be performed here before returning `isValid: true`
  return { isValid: true, credentials: userSession }
}

export { getBellOptions, getCookieOptions }
