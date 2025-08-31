import crypto from 'node:crypto'
import path from 'node:path'
import fs from 'node:fs'
import Jwt from '@hapi/jwt'
import { getWellKnown } from '../open-id/get-well-known.js'

const keysDir = path.resolve(process.cwd(), 'keys')

const privateKeyPath = path.join(keysDir, 'private.pem')
const publicKeyPath = path.join(keysDir, 'public.pem')

let privateKey
let publicKey

if (fs.existsSync(privateKeyPath) && fs.existsSync(publicKeyPath)) {
  privateKey = fs.readFileSync(privateKeyPath, 'utf8')
  publicKey = fs.readFileSync(publicKeyPath, 'utf8')
} else {
  if (!fs.existsSync(keysDir)) {
    fs.mkdirSync(keysDir, { recursive: true })
  }
  const generated = crypto.generateKeyPairSync('rsa', {
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
  privateKey = generated.privateKey
  publicKey = generated.publicKey
  fs.writeFileSync(privateKeyPath, privateKey)
  fs.writeFileSync(publicKeyPath, publicKey)
}

const keyObject = crypto.createPublicKey(publicKey)
const jwk = keyObject.export({ format: 'jwk' })

const sessionsPath = path.join(keysDir, 'sessions.json')

let sessions = []

loadSessions()

function loadSessions () {
  if (fs.existsSync(sessionsPath)) {
    try {
      const data = JSON.parse(fs.readFileSync(sessionsPath, 'utf8'))
      // Filter out expired sessions
      const now = Date.now()
      sessions = data.filter(s => now - s.createdAt < 3600 * 1000)
    } catch (e) {
      sessions = []
    }
  }
}

function saveSessions () {
  fs.writeFileSync(sessionsPath, JSON.stringify(sessions, null, 2))
}

export function createTokens (person, organisationId, relationships, roles, authRequest) {
  const sessionId = crypto.randomUUID()
  const now = Date.now()
  const session = {
    sessionId,
    accessCode: createAccessCode(),
    accessToken: createAccessToken(createTokenContent(sessionId, person, organisationId, relationships, roles, authRequest)),
    refreshToken: createRefreshToken(),
    createdAt: now
  }
  sessions.push(session)
  saveSessions()
  return session
}

export function getTokens (accessCode) {
  const now = Date.now()
  // Remove expired sessions before searching
  sessions = sessions.filter(s => now - s.createdAt < 3600 * 1000)
  saveSessions()
  const activeSession = sessions.find(session => session.accessCode === accessCode)
  if (!activeSession) {
    return null
  }
  return {
    access_token: activeSession.accessToken,
    token_type: 'Bearer',
    expires_in: 86400,
    scope: 'openid profile email', // requested scopes
    refresh_token: activeSession.refreshToken,
    id_token: activeSession.accessToken
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
  saveSessions()
}

function createAccessCode () {
  return crypto.randomBytes(32).toString('hex')
}

function createTokenContent (sessionId, person, organisationId, relationships, roles, authRequest) {
  const { crn, firstName, lastName } = person
  const { clientId, serviceId } = authRequest

  const { issuer } = getWellKnown()

  return {
    aud: crypto.randomUUID(),
    iss: issuer,
    exp: Math.floor(Date.now() / 1000) + 86400, // 24 hours
    nbf: Math.floor(Date.now() / 1000) - 30, // 30 seconds ago
    amr: 'one',
    aal: '1',
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
