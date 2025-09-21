import { vi, describe, beforeAll, beforeEach, afterAll, test, expect } from 'vitest'
import http2 from 'node:http2'
import { AUTH_REQUEST } from '../../../../src/config/constants/cache-keys.js'

vi.mock('../../../../src/open-id/well-known.js')
vi.mock('../../../../src/auth/token.js')
vi.mock('../../../../src/auth/session.js')
vi.mock('../../../../src/auth/keys.js')

const { getWellKnown } = await import('../../../../src/open-id/well-known.js')
const { getTokens } = await import('../../../../src/auth/token.js')
const { endSession } = await import('../../../../src/auth/session.js')
const { getPublicKeys } = await import('../../../../src/auth/keys.js')

const { createServer } = await import('../../../../src/server.js')

const { constants: httpConstants } = http2
const { HTTP_STATUS_OK, HTTP_STATUS_FOUND, HTTP_STATUS_BAD_REQUEST } = httpConstants

const testWellKnown = { issuer: 'issuer' }
getWellKnown.mockReturnValue(testWellKnown)

const testTokens = { access_token: 'valid-access-token', refresh_token: 'valid-refresh-token' }

const testPublicKeys = { keys: ['public-key-1', 'public-key-2'] }
getPublicKeys.mockReturnValue(testPublicKeys)

let yarSetSpy
let yarResetSpy

describe('open-id routes', () => {
  let server

  beforeAll(async () => {
    server = await createServer()
    await server.initialize()

    server.ext('onPreHandler', (request, h) => {
      yarSetSpy = vi.spyOn(request.yar, 'set')
      yarResetSpy = vi.spyOn(request.yar, 'reset')
      return h.continue
    })
  })

  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterAll(async () => {
    await server.stop({ timeout: 0 })
  })

  describe('well known route', () => {
    const wellKnownUrl = '/idphub/b2c/b2c_1a_cui_cpdev_signupsigninsfi/.well-known/openid-configuration'

    test('should provide well known config and return status code 200', async () => {
      const { result, statusCode } = await server.inject({
        method: 'GET',
        url: wellKnownUrl
      })

      expect(result).toEqual(testWellKnown)
      expect(statusCode).toBe(HTTP_STATUS_OK)
    })
  })

  describe('authorization route', () => {
    const authorizationUrl = '/dcidmtest.onmicrosoft.com/b2c_1a_cui_cpdev_signupsigninsfi/oauth2/v2.0/authorize'

    let query

    beforeEach(() => {
      query = {
        serviceId: '11111111-1111-1111-1111-111111111111',
        client_id: '00000000-0000-0000-0000-000000000000',
        redirect_uri: 'https://example.com/callback',
        scope: 'openid',
      }
    })

    test('should redirect to sign in page if valid query parameters are provided', async () => {
      const response = await server.inject({
        method: 'GET',
        url: `${authorizationUrl}?${new URLSearchParams(query).toString()}`
      })

      expect(response.statusCode).toBe(HTTP_STATUS_FOUND)
      expect(response.headers.location).toBe('/dcidmtest.onmicrosoft.com/oauth2/authresp')
    })

    test('should save authorization request in session if valid query parameters are provided', async () => {
      await server.inject({
        method: 'GET',
        url: `${authorizationUrl}?${new URLSearchParams(query).toString()}`
      })

      expect(yarSetSpy).toHaveBeenCalledWith(AUTH_REQUEST, query)
    })

    test('should return 400 error if all query parameters are missing', async () => {
      const { result, statusCode } = await server.inject({
        method: 'GET',
        url: authorizationUrl
      })

      expect(statusCode).toBe(HTTP_STATUS_BAD_REQUEST)
      expect(result).toContain('<h1 class="govuk-heading-l">Bad request</h1>')
    })

    test('should return 400 error if serviceId is missing', async () => {
      delete query.serviceId
      const { result, statusCode } = await server.inject({
        method: 'GET',
        url: `${authorizationUrl}?${new URLSearchParams(query).toString()}`
      })

      expect(statusCode).toBe(HTTP_STATUS_BAD_REQUEST)
      expect(result).toContain('<h1 class="govuk-heading-l">Bad request</h1>')
    })

    test('should return 400 error if client_id is missing', async () => {
      delete query.client_id
      const { result, statusCode } = await server.inject({
        method: 'GET',
        url: `${authorizationUrl}?${new URLSearchParams(query).toString()}`
      })

      expect(statusCode).toBe(HTTP_STATUS_BAD_REQUEST)
      expect(result).toContain('<h1 class="govuk-heading-l">Bad request</h1>')
    })

    test('should return 400 error if redirect_uri is missing', async () => {
      delete query.redirect_uri
      const { result, statusCode } = await server.inject({
        method: 'GET',
        url: `${authorizationUrl}?${new URLSearchParams(query).toString()}`
      })

      expect(statusCode).toBe(HTTP_STATUS_BAD_REQUEST)
      expect(result).toContain('<h1 class="govuk-heading-l">Bad request</h1>')
    })

    test('should return 400 error if scope is missing', async () => {
      delete query.scope
      const { result, statusCode } = await server.inject({
        method: 'GET',
        url: `${authorizationUrl}?${new URLSearchParams(query).toString()}`
      })

      expect(statusCode).toBe(HTTP_STATUS_BAD_REQUEST)
      expect(result).toContain('<h1 class="govuk-heading-l">Bad request</h1>')
    })

    test('should return 400 error if redirect_uri is not a valid uri', async () => {
      query.redirect_uri = 'invalid-uri'
      const { result, statusCode } = await server.inject({
        method: 'GET',
        url: `${authorizationUrl}?${new URLSearchParams(query).toString()}`
      })

      expect(statusCode).toBe(HTTP_STATUS_BAD_REQUEST)
      expect(result).toContain('<h1 class="govuk-heading-l">Bad request</h1>')
    })

    test('should allow optional parameters', async () => {
      query = {
        ...query,
        p: 'b2c_1a_cui_cpdev_signupsigninsfi',
        response_mode: 'form_post',
        response_type: 'code',
        state: 'some-state',
        nonce: 'some-nonce',
        relationshipId: 'some-relationship-id',
        prompt: 'login',
        forceReselection: true
      }
      const response = await server.inject({
        method: 'GET',
        url: `${authorizationUrl}?${new URLSearchParams(query).toString()}`
      })

      expect(response.statusCode).toBe(HTTP_STATUS_FOUND)
      expect(response.headers.location).toBe('/dcidmtest.onmicrosoft.com/oauth2/authresp')
    })
  })

  describe('token route', () => {
    const tokenUrl = '/dcidmtest.onmicrosoft.com/b2c_1a_cui_cpdev_signupsigninsfi/oauth2/v2.0/token'

    let payload
    let query

    beforeEach(() => {
      payload = {
        grant_type: 'authorization_code',
        code: 'valid-code',
        redirect_uri: 'https://example.com/callback',
        client_id: '00000000-0000-0000-0000-000000000000',
        client_secret: 'valid-secret',
        scope: 'openid'
      }

      query = { ...payload }

      getTokens.mockReturnValue(testTokens)
    })

    test('should return tokens if valid parameters are provided in payload', async () => {
      const { result, statusCode } = await server.inject({
        method: 'POST',
        url: tokenUrl,
        payload
      })

      expect(result).toEqual(testTokens)
      expect(statusCode).toBe(HTTP_STATUS_OK)
    })

    test('should return tokens if valid parameters are provided in query', async () => {
      const { result, statusCode } = await server.inject({
        method: 'POST',
        url: `${tokenUrl}?${new URLSearchParams(query).toString()}`
      })

      expect(result).toEqual(testTokens)
      expect(statusCode).toBe(HTTP_STATUS_OK)
    })

    test('should return 400 error if all parameters are missing and payload is not provided', async () => {
      const { result, statusCode } = await server.inject({
        method: 'POST',
        url: tokenUrl
      })

      expect(statusCode).toBe(HTTP_STATUS_BAD_REQUEST)
      expect(result.message).toContain('"grant_type" is required')
      expect(result.message).toContain('"redirect_uri" is required')
      expect(result.message).toContain('"client_id" is required')
      expect(result.message).toContain('"client_secret" is required')
      expect(getTokens).not.toHaveBeenCalled()
    })

    test('should return 400 error if grant_type is not a valid value', async () => {
      payload.grant_type = 'invalid-grant-type'
      const { result, statusCode } = await server.inject({
        method: 'POST',
        url: tokenUrl,
        payload
      })

      expect(statusCode).toBe(HTTP_STATUS_BAD_REQUEST)
      expect(result.message).toContain('"grant_type" must be one of [authorization_code, refresh_token]')
      expect(getTokens).not.toHaveBeenCalled()
    })

    test('should return 401 error if authorization_code is not valid', async () => {
      getTokens.mockReturnValue(null)

      const { result, statusCode } = await server.inject({
        method: 'POST',
        url: tokenUrl,
        payload
      })

      expect(statusCode).toBe(401)
      expect(result.message).toBe('Invalid authorization code')
    })

    test('should return 401 error if refresh_token is not valid', async () => {
      payload.grant_type = 'refresh_token'
      payload.refresh_token = 'refresh-token'

      getTokens.mockReturnValue(null)

      const { result, statusCode } = await server.inject({
        method: 'POST',
        url: tokenUrl,
        payload
      })

      expect(statusCode).toBe(401)
      expect(result.message).toBe('Invalid refresh token')
    })
  })

  describe('sign out route', () => {
    const signOutUrl = '/idphub/b2c/b2c_1a_cui_cpdev_signupsigninsfi/signout'

    let query

    beforeEach(() => {
      query = {
        post_logout_redirect_uri: 'https://example.com/signout-callback',
        id_token_hint: 'valid-id-token',
        state: 'some-state'
      }
    })

    test('should redirect to post_logout_redirect_uri if valid query parameters are provided', async () => {
      const response = await server.inject({
        method: 'GET',
        url: `${signOutUrl}?${new URLSearchParams(query).toString()}`
      })

      expect(response.statusCode).toBe(HTTP_STATUS_FOUND)
      expect(response.headers.location).toBe(`${query.post_logout_redirect_uri}?state=${query.state}`)
    })

    test('should redirect to post_logout_redirect_uri without state if optional state is not provided', async () => {
      delete query.state
      const response = await server.inject({
        method: 'GET',
        url: `${signOutUrl}?${new URLSearchParams(query).toString()}`
      })

      expect(response.statusCode).toBe(HTTP_STATUS_FOUND)
      expect(response.headers.location).toBe(query.post_logout_redirect_uri)
    })

    test('should end session if valid query parameters are provided', async () => {
      const response = await server.inject({
        method: 'GET',
        url: `${signOutUrl}?${new URLSearchParams(query).toString()}`
      })

      expect(response.statusCode).toBe(HTTP_STATUS_FOUND)
      expect(endSession).toHaveBeenCalledWith(query.id_token_hint)
    })

    test('should reset session if valid query parameters are provided', async () => {
      await server.inject({
        method: 'GET',
        url: `${signOutUrl}?${new URLSearchParams(query).toString()}`
      })

      expect(yarResetSpy).toHaveBeenCalled()
    })
  })

  describe('jwks route', () => {
    const jwksUrl = '/dcidmtest.onmicrosoft.com/b2c_1a_cui_cpdev_signupsigninsfi/discovery/v2.0/keys'

    test('should provide public keys and return status code 200', async () => {
      const { result, statusCode } = await server.inject({
        method: 'GET',
        url: jwksUrl
      })

      expect(statusCode).toBe(200)
      expect(result).toEqual(testPublicKeys)
    })
  })
})
