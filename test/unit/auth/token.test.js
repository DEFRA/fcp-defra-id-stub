import { vi, describe, beforeEach, test, expect } from 'vitest'
import Jwt from '@hapi/jwt'
import crypto from 'node:crypto'

vi.mock('../../../src/auth/session.js')
vi.mock('../../../src/auth/keys.js')
vi.mock('../../../src/open-id/well-known.js')

const { createSession, findSessionBy, saveSessions } = await import('../../../src/auth/session.js')
const { getPrivateKey } = await import('../../../src/auth/keys.js')
const { getWellKnown } = await import('../../../src/open-id/well-known.js')

const { createTokens, getTokens } = await import('../../../src/auth/token.js')

const { privateKey } = crypto.generateKeyPairSync('rsa', {
  modulusLength: 2048,
  publicKeyEncoding: {
    type: 'spki',
    format: 'pem'
  },
  privateKeyEncoding: {
    type: 'pkcs8',
    format: 'pem'
  }
})

const wellKnown = {
  issuer: 'http://fcp-defra-id-stub-tests'
}

const person = { crn: 1234567890, firstName: 'John', lastName: 'Doe' }
const organisationId = '1234567'
const relationships = ['1234567:123456789:Farming Inc:1:External:0']
const roles = ['1234567:Agent:3']
const authRequest = {
  clientId: '00000000-0000-0000-0000-000000000000',
  serviceId: '11111111-1111-1111-1111-111111111111',
  nonce: 'abcdefg',
  scope: 'openid profile email'
}

describe('createTokens', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    getPrivateKey.mockReturnValue(privateKey)
    getWellKnown.mockReturnValue(wellKnown)
  })

  test('should return a valid session', () => {
    const session = createTokens(person, organisationId, relationships, roles, authRequest)

    expect(session).toBeDefined()
    expect(session.sessionId).toMatch(/^[0-9a-fA-F-]{36}$/)
    expect(session.accessCode).toEqual(expect.any(String))
    expect(session.accessToken).toEqual(expect.any(String))
    expect(session.refreshToken).toEqual(expect.any(String))
    expect(session.scope).toBe(authRequest.scope)
    expect(session.createdAt).toBeLessThanOrEqual(Date.now())
  })

  test('should create a session record', () => {
    const session = createTokens(person, organisationId, relationships, roles, authRequest)

    expect(createSession).toHaveBeenCalledTimes(1)
    expect(createSession).toHaveBeenCalledWith(expect.objectContaining({
      sessionId: session.sessionId,
      accessCode: session.accessCode,
      accessToken: session.accessToken,
      refreshToken: session.refreshToken,
      scope: authRequest.scope,
      createdAt: expect.any(Number)
    }))
  })
})

describe('getTokens', () => {
  const grantTypeAuthorizationCode = 'authorization_code'
  const grantTypeRefreshToken = 'refresh_token'

  let accessCode
  let refreshToken
  let accessToken

  let testSessions

  beforeEach(() => {
    vi.clearAllMocks()

    accessCode = 'access-code-123'
    refreshToken = 'refresh-token-123'

    accessToken = Jwt.token.generate({
      sessionId: 'session-id-123',
      contactId: person.crn,
      firstName: person.firstName,
      lastName: person.lastName,
      currentRelationshipId: organisationId,
      relationships,
      roles,
      azp: authRequest.clientId,
      serviceId: authRequest.serviceId
    }, {
      key: privateKey,
      algorithm: 'RS256'
    }, {
      header: {
        kid: 'defra-id-stub-key'
      }
    })

    testSessions = [{ accessCode, refreshToken, accessToken, scope: authRequest.scope }]

    findSessionBy.mockImplementation((property, value) => testSessions.find(s => s[property] === value))
  })

  test('should return token payload for valid access code', () => {
    const tokens = getTokens(accessCode, grantTypeAuthorizationCode, null)

    expect(tokens).toBeDefined()
    expect(tokens.access_token).toBe(accessToken)
    expect(tokens.token_type).toBe('Bearer')
    expect(tokens.expires_in).toBe(24 * 60 * 60)
    expect(tokens.scope).toBe(authRequest.scope)
    expect(tokens.refresh_token).toBe(refreshToken)
    expect(tokens.id_token).toBe(accessToken)
  })

  test('should return undefined if no session found for access code', () => {
    const tokens = getTokens('invalid-access-code', grantTypeAuthorizationCode, null)

    expect(tokens).toBeNull()
  })

  test('should return token payload for valid refresh token', () => {
    const tokens = getTokens(null, grantTypeRefreshToken, refreshToken)

    expect(tokens).toBeDefined()
    expect(tokens.token_type).toBe('Bearer')
    expect(tokens.expires_in).toBe(24 * 60 * 60)
    expect(tokens.scope).toBe(authRequest.scope)
  })

  test('should refresh access token when using refresh token', () => {
    const oldAccessToken = accessToken

    const tokens = getTokens(null, grantTypeRefreshToken, refreshToken)

    expect(tokens).toBeDefined()
    expect(tokens.access_token).toBeDefined()
    expect(tokens.access_token).not.toBe(oldAccessToken)
    expect(tokens.id_token).toBeDefined()
    expect(tokens.id_token).not.toBe(oldAccessToken)
  })

  test('should preserve token payload when refreshing access token', () => {
    const oldAccessToken = accessToken
    const oldPayload = Jwt.token.decode(oldAccessToken).decoded.payload

    const tokens = getTokens(null, grantTypeRefreshToken, refreshToken)
    const newAccessToken = tokens.access_token
    const newPayload = Jwt.token.decode(newAccessToken).decoded.payload

    expect(newPayload.sessionId).toBe(oldPayload.sessionId)
    expect(newPayload.contactId).toBe(oldPayload.contactId)
    expect(newPayload.firstName).toBe(oldPayload.firstName)
    expect(newPayload.lastName).toBe(oldPayload.lastName)
    expect(newPayload.currentRelationshipId).toBe(oldPayload.currentRelationshipId)
    expect(newPayload.relationships).toEqual(oldPayload.relationships)
    expect(newPayload.roles).toEqual(oldPayload.roles)
    expect(newPayload.azp).toBe(oldPayload.azp)
    expect(newPayload.serviceId).toBe(oldPayload.serviceId)
  })

  test('should refresh refresh token when using refresh token', () => {
    const oldRefreshToken = refreshToken

    const tokens = getTokens(null, grantTypeRefreshToken, refreshToken)

    expect(tokens).toBeDefined()
    expect(tokens.refresh_token).toBeDefined()
    expect(tokens.refresh_token).not.toBe(oldRefreshToken)
  })

  test('should save sessions after refreshing tokens', () => {
    getTokens(null, grantTypeRefreshToken, refreshToken)

    expect(saveSessions).toHaveBeenCalledTimes(1)
  })

  test('should return null if no session found for refresh token', () => {
    const tokens = getTokens(null, grantTypeRefreshToken, 'invalid-refresh-token')

    expect(tokens).toBeNull()
  })
})
