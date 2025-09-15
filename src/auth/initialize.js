import { createKeys } from './keys.js'
import { loadSessions } from './session.js'

export function initializeAuth () {
  createKeys()
  loadSessions()
}
