import { getSignOutUrl } from '../auth/get-sign-out-url.js'
import { validateState } from '../auth/state.js'
import { verifyToken } from '../auth/verify-token.js'
import { getSafeRedirect } from '../utils/get-safe-redirect.js'

export const entraAuth = [{
  method: 'GET',
  path: '/auth/sign-in',
  options: {
    auth: 'entra'
  },
  handler: function (_request, h) {
    return h.redirect('/')
  }
}, {
  method: 'GET',
  path: '/auth/sign-in-oidc',
  options: {
    auth: { strategy: 'entra', mode: 'try' }
  },
  handler: async function (request, h) {
    // If the user is not authenticated, redirect to the home page
    // This should only occur if the user tries to access the sign-in page directly and not part of the sign-in flow
    // eg if the user has bookmarked the Entra sign-in page or they have signed out and tried to go back in the browser
    if (!request.auth.isAuthenticated) {
      return h.view('errors/unauthorised')
    }

    const { profile, token, refreshToken } = request.auth.credentials
    // verify token returned from Entra against public key
    await verifyToken(token)

    const { roles } = profile
    // Store token and all useful data in the session cache
    await request.server.app.cache.set(profile.sessionId, {
      isAuthenticated: true,
      ...profile,
      scope: roles,
      token,
      refreshToken
    })

    // Create a new session using cookie authentication strategy which is used for all subsequent requests
    request.cookieAuth.set({ sessionId: profile.sessionId })

    // Redirect user to the page they were trying to access before signing in or to the home page if no redirect was set
    const redirect = request.yar.get('redirect') ?? '/'
    request.yar.clear('redirect')
    // Ensure redirect is a relative path to prevent redirect attacks
    const safeRedirect = getSafeRedirect(redirect)
    return h.redirect(safeRedirect)
  }
}, {
  method: 'GET',
  path: '/auth/sign-out',
  options: {
    auth: { strategy: 'session', mode: 'try' }
  },
  handler: async function (request, h) {
    if (request.auth.isAuthenticated) {
      if (request.auth.credentials?.sessionId) {
        // Clear the session cache before redirecting to Entra to clear SSO session
        await request.server.app.cache.drop(request.auth.credentials.sessionId)
      }

      // Clear local session cookie
      request.cookieAuth.clear()

      const signOutUrl = await getSignOutUrl(request, request.auth.credentials.loginHint)
      return h.redirect(signOutUrl)
    }

    // If not authenticated just redirect to home page
    return h.redirect('/')
  }
}, {
  method: 'GET',
  path: '/auth/sign-out-oidc',
  options: {
    auth: { strategy: 'session', mode: 'try' }
  },
  handler: async function (request, h) {
    if (request.auth.isAuthenticated) {
      // verify state parameter to prevent CSRF attacks
      validateState(request, request.query.state)

      // Clear session as a fail safe as should already be cleared in /auth/sign-out
      if (request.auth.credentials?.sessionId) {
        // Clear the session cache
        await request.server.app.cache.drop(request.auth.credentials.sessionId)
      }

      // Clear local session cookie as fail safe as should already be cleared in /auth/sign-out
      request.cookieAuth.clear()
    }

    return h.redirect('/')
  }
}]
