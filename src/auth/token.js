import crypto from 'node:crypto'
import Jwt from '@hapi/jwt'
import { getWellKnown } from '../open-id/get-well-known.js'
import { getPrivateKey } from './keys.js'
import { createSession, findSessionBy, saveSessions } from './session.js'

export function createTokens (person, organisationId, relationships, roles, authRequest) {
  const sessionId = crypto.randomUUID()

  const session = {
    sessionId,
    accessCode: createAccessCode(),
    accessToken: createAccessToken(createTokenContent(sessionId, person, organisationId, relationships, roles, authRequest)),
    refreshToken: createRefreshToken(),
    scope: authRequest.scope,
    createdAt: Date.now()
  }

  createSession(session)

  return session
}

export function getTokens (accessCode, grantType, refreshToken) {
  let activeSession

  if (accessCode) {
    activeSession = findSessionBy('accessCode', accessCode)
  }

  if (grantType === 'refresh_token' && refreshToken) {
    activeSession = findSessionBy('refreshToken', refreshToken)

    if (activeSession) {
      activeSession.accessToken = refreshAccessToken(activeSession.accessToken)
      activeSession.refreshToken = createRefreshToken()
      saveSessions()
    }
  }

  if (!activeSession) {
    return null
  }

  return {
    access_token: activeSession.accessToken,
    token_type: 'Bearer',
    expires_in: 86400,
    scope: activeSession.scope,
    refresh_token: activeSession.refreshToken,
    id_token: activeSession.accessToken
  }
}

export function refreshAccessToken (accessToken) {
  const {
    sessionId,
    crn,
    firstName,
    lastName,
    currentRelationshipId: organisationId,
    relationships,
    roles,
    azp: clientId,
    serviceId
  } = Jwt.token.decode(accessToken).decoded.payload

  return createAccessToken(createTokenContent(sessionId, { crn, firstName, lastName }, organisationId, relationships, roles, { clientId, serviceId }))
}

function createAccessCode () {
  return crypto.randomBytes(32).toString('hex')
}

function createTokenContent (sessionId, person, organisationId, relationships, roles, authRequest) {
  const { crn, firstName, lastName } = person
  const { clientId, serviceId, nonce } = authRequest

  const { issuer } = getWellKnown()

  return {
    aud: crypto.randomUUID(),
    iss: issuer,
    exp: Math.floor(Date.now() / 1000) + 86400, // 24 hours
    nbf: Math.floor(Date.now() / 1000) - 30, // 30 seconds ago
    amr: 'one',
    aal: '1',
    nonce,
    serviceId,
    correlationId: crypto.randomUUID(),
    currentRelationshipId: organisationId,
    sessionId,
    contactId: crn,
    sub: '5add6531-c8c8-4e78-b57b-071002f21887',
    email: 'test@example.com',
    firstName,
    lastName,
    loa: 1,
    enrolmentCount: 1, // number of active enrolments
    enrolmentRequestCount: 0,
    relationships,
    roles,
    azp: clientId,
    ver: '1.0',
    iat: Math.floor(Date.now() / 1000)
  }
}

function createAccessToken (payload) {
  return Jwt.token.generate(payload, {
    key: getPrivateKey(),
    algorithm: 'RS256'
  }, {
    header: {
      kid: 'defra-id-stub-key'
    }
  })
}

function createRefreshToken () {
  return crypto.randomBytes(256).toString('base64url')
}
