import crypto from 'node:crypto'
import Jwt from '@hapi/jwt'
import { getWellKnown } from '../open-id/get-well-known.js'

const sessions = []

const { privateKey, publicKey } = crypto.generateKeyPairSync('rsa', {
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

const keyObject = crypto.createPublicKey(publicKey)
const jwk = keyObject.export({ format: 'jwk' })

export function createTokens (crn, organisation) {
  const sessionId = crypto.randomUUID()

  const session = {
    sessionId,
    accessCode: createAccessCode(),
    accessToken: createAccessToken(createTokenContent(sessionId, crn, organisation)),
    refreshToken: createRefreshToken()
  }

  sessions.push(session)

  return session
}

export function getTokens (accessCode) {
  const session = sessions.find(session => session.accessCode === accessCode)

  if (!session) {
    return null
  }

  return {
    access_token: session.accessToken,
    token_type: 'Bearer',
    expires_in: 86400,
    scope: 'openid profile email', // requested scopes
    refresh_token: session.refreshToken,
    id_token: session.accessToken
  }
}

export function getPublicKeys () {
  return {
    keys: [
      {
        ...jwk,
        use: 'sig',
        kid: 'defra-id-stub-key',
        alg: 'RS256'
      }
    ]
  }
}

export function endSession (accessToken) {
  const activeSession = sessions.find(session => session.accessToken === accessToken)

  if (!activeSession) {
    return
  }

  sessions.splice(sessions.indexOf(activeSession), 1)
}

function createAccessCode () {
  return crypto.randomBytes(32).toString('hex')
}

function createTokenContent (sessionId, crn, organisation) {
  const { organisationId, sbi, name } = organisation

  const { issuer } = getWellKnown()

  return {
    aud: crypto.randomUUID(),
    iss: issuer,
    exp: Math.floor(Date.now() / 1000) + 86400, // 24 hours
    nbf: Math.floor(Date.now() / 1000) - 30, // 30 seconds ago
    amr: 'one',
    aal: '1',
    serviceId: 'b82ab114-4a9a-ee11-be37-000d3adf7047', // service ID
    correlationId: crypto.randomUUID(),
    currentRelationshipId: '5890927',
    sessionId,
    contactId: crn,
    sub: '5add6531-c8c8-4e78-b57b-071002f21887',
    email: 'test@example.com',
    firstName: 'Andrew',
    lastName: 'Farmer',
    loa: 1,
    enrolmentCount: 1, // number of active enrolments
    enrolmentRequestCount: 0,
    relationships: [`${organisationId}:${sbi}:${name}:1:External:0`],
    roles: [`${organisationId}:Agent:3`],
    azp: '651a29ca-967b-414a-96cc-76740647fb3e', // client_id
    ver: '1.0',
    iat: Math.floor(Date.now() / 1000)
  }
}

function createAccessToken (payload) {
  return Jwt.token.generate(payload, {
    key: privateKey,
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
