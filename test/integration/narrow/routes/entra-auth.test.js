import { constants } from 'http2'
import { vi, describe, beforeAll, afterAll, beforeEach, test, expect } from 'vitest'
import { mockOidcConfig } from '../helpers/setup-server-mocks.js'

const { HTTP_STATUS_FOUND, HTTP_STATUS_INTERNAL_SERVER_ERROR } = constants

const mockVerifyToken = vi.fn()
vi.mock('../../../../src/auth/verify-token.js', async () => ({
  verifyToken: mockVerifyToken
}))

const mockGetSafeRedirect = vi.fn()
vi.mock('../../../../src/utils/get-safe-redirect.js', () => ({
  getSafeRedirect: mockGetSafeRedirect
}))

const mockGetSignOutUrl = vi.fn()
vi.mock('../../../../src/auth/get-sign-out-url.js', () => ({
  getSignOutUrl: mockGetSignOutUrl
}))

const mockValidateState = vi.fn()
vi.mock('../../../../src/auth/state.js', () => ({
  createState: vi.fn(),
  validateState: mockValidateState
}))

const credentials = {
  sessionId: 'session-id',
  profile: {
    sessionId: 'session-id',
    crn: '1234567890',
    organisationId: '1234567',
    roles: ['Admin', 'User']
  },
  token: 'ENTRA-JWT',
  refreshToken: 'ENTRA-REFRESH-TOKEN'
}

const signOutUrl = 'https://oidc.example.com/sign-out'

let server
let path

describe('entra auth routes', () => {
  let originalEnv

  beforeAll(async () => {
    vi.clearAllMocks()

    mockGetSafeRedirect.mockReturnValue('/')

    // Save and set Entra env vars for these tests
    originalEnv = {
      ENTRA_ENABLED: process.env.ENTRA_ENABLED,
      ENTRA_WELL_KNOWN_URL: process.env.ENTRA_WELL_KNOWN_URL,
      ENTRA_TENANT_ID: process.env.ENTRA_TENANT_ID,
      ENTRA_CLIENT_ID: process.env.ENTRA_CLIENT_ID,
      ENTRA_CLIENT_SECRET: process.env.ENTRA_CLIENT_SECRET,
      ENTRA_REDIRECT_URL: process.env.ENTRA_REDIRECT_URL,
      ENTRA_SIGN_OUT_REDIRECT_URL: process.env.ENTRA_SIGN_OUT_REDIRECT_URL
    }

    process.env.ENTRA_ENABLED = 'true'
    process.env.ENTRA_WELL_KNOWN_URL = 'https://login.microsoftonline.com/test-tenant-id/v2.0/.well-known/openid-configuration'
    process.env.ENTRA_TENANT_ID = 'test-tenant-id'
    process.env.ENTRA_CLIENT_ID = 'test-client-id'
    process.env.ENTRA_CLIENT_SECRET = 'test-client-secret'
    process.env.ENTRA_REDIRECT_URL = 'http://localhost:3007/auth/sign-in-oidc'
    process.env.ENTRA_SIGN_OUT_REDIRECT_URL = 'http://localhost:3007'

    // Reset modules to force config to reload with new env vars
    vi.resetModules()

    // Import createServer after resetting modules and setting env vars
    const { createServer } = await import('../../../../src/server.js')
    server = await createServer()
    await server.initialize()
  })

  afterAll(async () => {
    if (server) {
      await server.stop()
    }
    // Restore original env vars
    for (const [key, value] of Object.entries(originalEnv)) {
      if (value !== undefined) {
        process.env[key] = value
      } else {
        delete process.env[key]
      }
    }
  })

  describe('GET /auth/sign-in', () => {
    beforeEach(() => {
      path = '/auth/sign-in'
    })

    test('redirects to / if authenticated', async () => {
      const response = await server.inject({
        url: path,
        auth: {
          strategy: 'entra',
          credentials
        }
      })
      expect(response.statusCode).toBe(HTTP_STATUS_FOUND)
      expect(response.headers.location).toBe('/')
    })

    test('redirects to oidc sign in if unauthenticated', async () => {
      const response = await server.inject({
        url: path
      })
      const redirect = new URL(response.headers.location)
      const params = new URLSearchParams(redirect.search)

      expect(response.statusCode).toBe(HTTP_STATUS_FOUND)
      expect(redirect.origin).toBe('https://oidc.example.com')
      expect(redirect.pathname).toBe('/authorize')
      expect(params.get('response_mode')).toBe('query')
      expect(params.get('client_id')).toBe(process.env.ENTRA_CLIENT_ID)
      expect(params.get('response_type')).toBe('code')
      expect(params.get('redirect_uri')).toBe(process.env.ENTRA_REDIRECT_URL)
      expect(params.get('state')).toBeDefined()
      expect(params.get('scope')).toBe(`${process.env.ENTRA_CLIENT_ID}/.default offline_access`)
    })
  })

  describe('GET /auth/sign-in-oidc', () => {
    beforeEach(() => {
      path = '/auth/sign-in-oidc'
    })

    test('redirects to oidc sign in page if unauthenticated', async () => {
      const response = await server.inject({
        url: path
      })
      expect(response.statusCode).toBe(HTTP_STATUS_FOUND)
      expect(response.headers.location.startsWith(mockOidcConfig.authorization_endpoint)).toBe(true)
    })

    test('should return unauthorised view if unauthenticated but redirected from Entra', async () => {
      // This scenario will only occur if the user has completed the Entra sign in process but did not start from the application
      // ie they have bookmarked the Entra sign in page or have navigated directly to it

      // To test this routing, we need to run Bell in simulation mode so the authentication flow is automatically completed
      const Bell = await import('@hapi/bell')
      Bell.simulate(() => {})

      // Because this needs to be set before the server is created, we'll create a new server instance to avoid conflicts with the existing tests
      const { createServer: createBellSimulatedServer } = await import('../../../../src/server.js')
      const bellSimulatedServer = await createBellSimulatedServer()
      await bellSimulatedServer.initialize()

      const response = await bellSimulatedServer.inject({
        url: `${path}?state=state&code=code`
      })

      bellSimulatedServer.stop()

      expect(response.request.response.source.template).toBe('errors/unauthorised')
    })

    test('should verify JWT token against public key', async () => {
      await server.inject({
        url: path,
        auth: {
          strategy: 'entra',
          credentials
        }
      })
      expect(mockVerifyToken).toHaveBeenCalledWith(credentials.token)
    })

    test('should return error page if token verification fails', async () => {
      mockVerifyToken.mockImplementationOnce(() => {
        throw new Error('Token verification failed')
      })

      const response = await server.inject({
        url: path,
        auth: {
          strategy: 'entra',
          credentials
        }
      })
      expect(response.statusCode).toBe(HTTP_STATUS_INTERNAL_SERVER_ERROR)
      expect(response.request.response.source.template).toBe('errors/500')
    })

    test('should set authentication status in session cache', async () => {
      await server.inject({
        url: path,
        auth: {
          strategy: 'entra',
          credentials
        }
      })
      const cache = await server.app.cache.get(credentials.profile.sessionId)
      expect(cache.isAuthenticated).toBe(true)
    })

    test('should set user profile properties at top level in session cache', async () => {
      await server.inject({
        url: path,
        auth: {
          strategy: 'entra',
          credentials
        }
      })
      const cache = await server.app.cache.get(credentials.profile.sessionId)
      expect(cache.sessionId).toBe(credentials.profile.sessionId)
    })

    test('should set scope from roles in session cache', async () => {
      await server.inject({
        url: path,
        auth: {
          strategy: 'entra',
          credentials
        }
      })
      const cache = await server.app.cache.get(credentials.profile.sessionId)
      expect(cache.scope).toEqual(credentials.profile.roles)
    })

    test('should set token and refresh token in session cache', async () => {
      await server.inject({
        url: path,
        auth: {
          strategy: 'entra',
          credentials
        }
      })
      const cache = await server.app.cache.get(credentials.profile.sessionId)
      expect(cache.token).toBe(credentials.token)
      expect(cache.refreshToken).toBe(credentials.refreshToken)
    })

    test('should set cookie session', async () => {
      const response = await server.inject({
        url: path,
        auth: {
          strategy: 'entra',
          credentials
        }
      })
      const sessionCookie = response.headers['set-cookie'].find(cookie => cookie.startsWith('fcp-defra-id-stub-session='))
      expect(sessionCookie).toBeDefined()
      expect(sessionCookie).not.toMatch(/Expires=/)
      expect(sessionCookie).not.toMatch(/Max-Age=/)
    })

    test('should ensure redirect path is safe', async () => {
      await server.inject({
        url: path,
        auth: {
          strategy: 'entra',
          credentials
        }
      })
      expect(mockGetSafeRedirect).toHaveBeenCalledWith('/')
    })

    test('redirects to safe redirect path', async () => {
      const response = await server.inject({
        url: path,
        auth: {
          strategy: 'entra',
          credentials
        }
      })
      expect(response.statusCode).toBe(HTTP_STATUS_FOUND)
      expect(response.headers.location).toBe('/')
    })
  })

  describe('GET /auth/sign-out', () => {
    beforeEach(() => {
      path = '/auth/sign-out'
      mockGetSignOutUrl.mockResolvedValue(signOutUrl)
    })

    test('redirects to oidc sign out url if authenticated with session cookie', async () => {
      const response = await server.inject({
        url: path,
        auth: {
          strategy: 'session',
          credentials
        }
      })
      expect(response.statusCode).toBe(HTTP_STATUS_FOUND)
      expect(response.headers.location).toBe(signOutUrl)
    })

    test('redirects to home page if unauthenticated', async () => {
      const response = await server.inject({
        url: path
      })
      expect(response.statusCode).toBe(HTTP_STATUS_FOUND)
      expect(response.headers.location).toBe('/')
    })

    test('should return error page if unable to get sign out url', async () => {
      mockGetSignOutUrl.mockImplementationOnce(() => {
        throw new Error('Unable to get sign out url')
      })

      const response = await server.inject({
        url: path,
        auth: {
          strategy: 'session',
          credentials
        }
      })
      expect(response.statusCode).toBe(HTTP_STATUS_INTERNAL_SERVER_ERROR)
      expect(response.request.response.source.template).toBe('errors/500')
    })
  })

  describe('GET /auth/sign-out-oidc', () => {
    beforeEach(() => {
      vi.clearAllMocks()
      path = '/auth/sign-out-oidc'
    })

    test('should validate state if authenticated', async () => {
      const state = 'state'
      await server.inject({
        url: `${path}?state=${state}`,
        auth: {
          strategy: 'session',
          credentials
        }
      })
      expect(mockValidateState).toHaveBeenCalledWith(expect.anything(), state)
    })

    test('should return error page if state validation fails', async () => {
      mockValidateState.mockImplementationOnce(() => {
        throw new Error('State validation failed')
      })

      const response = await server.inject({
        url: `${path}?state=state`,
        auth: {
          strategy: 'session',
          credentials
        }
      })
      expect(response.statusCode).toBe(HTTP_STATUS_INTERNAL_SERVER_ERROR)
      expect(response.request.response.source.template).toBe('errors/500')
    })

    test('should not validate state if unauthenticated', async () => {
      await server.inject({
        url: path
      })
      expect(mockValidateState).not.toHaveBeenCalled()
    })

    test('should clear session cache if authenticated and session id', async () => {
      await server.inject({
        url: path,
        auth: {
          strategy: 'session',
          credentials
        }
      })
      const cache = await server.app.cache.get(credentials.profile.sessionId)
      expect(cache).toBeNull()
    })

    test('should clear session cookie if authenticated and session id', async () => {
      const response = await server.inject({
        url: path,
        auth: {
          strategy: 'session',
          credentials
        }
      })
      const sessionCookie = response.headers['set-cookie'].find(cookie => cookie.startsWith('sid='))
      expect(sessionCookie).toBeDefined()
      expect(sessionCookie).toMatch(/Expires=/)
      expect(sessionCookie).toMatch(/Max-Age=0/)
    })

    test('should clear session cookie if authenticated and no session id', async () => {
      const response = await server.inject({
        url: path,
        auth: {
          strategy: 'session',
          credentials: {
            ...credentials,
            sessionId: null
          }
        }
      })
      const sessionCookie = response.headers['set-cookie'].find(cookie => cookie.startsWith('sid='))
      expect(sessionCookie).toBeDefined()
      expect(sessionCookie).toMatch(/Expires=/)
      expect(sessionCookie).toMatch(/Max-Age=0/)
    })

    test('should redirect to home page if authenticated', async () => {
      const response = await server.inject({
        url: path,
        auth: {
          strategy: 'session',
          credentials
        }
      })
      expect(response.statusCode).toBe(HTTP_STATUS_FOUND)
      expect(response.headers.location).toBe('/')
    })

    test('should redirect to home page if not authenticated', async () => {
      const response = await server.inject({
        url: path
      })
      expect(response.statusCode).toBe(HTTP_STATUS_FOUND)
      expect(response.headers.location).toBe('/')
    })
  })
})
