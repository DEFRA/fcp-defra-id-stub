import path from 'node:path'
import fs from 'node:fs'
import { getStorageDirectory } from './storage.js'

const SESSION_DURATION = 60 * 60 * 1000 // 1 hour in milliseconds

let sessionsPath
let sessions = []

export function loadSessions () {
  sessionsPath = getSessionsPath()

  if (fs.existsSync(sessionsPath)) {
    try {
      sessions = JSON.parse(fs.readFileSync(sessionsPath, 'utf8'))
      clearExpiredSessions()
    } catch {
      sessions = []
    }
  }
}

export function saveSessions () {
  fs.writeFileSync(sessionsPath, JSON.stringify(sessions, null, 2))
}

export function createSession (session) {
  sessions.push(session)
  saveSessions()
}

export function findSessionBy (field, value) {
  clearExpiredSessions()

  return sessions.find(session => session[field] === value)
}

export function endSession (accessToken) {
  const activeSession = sessions.find(session => session.accessToken === accessToken)
  if (!activeSession) {
    return
  }
  sessions.splice(sessions.indexOf(activeSession), 1)
  saveSessions()
}

export function clearExpiredSessions () {
  const now = Date.now()
  sessions = sessions.filter(s => now - s.createdAt < SESSION_DURATION)
  saveSessions()
}

function getSessionsPath () {
  const storageDirectory = getStorageDirectory()

  return path.join(storageDirectory, 'sessions.json')
}
