import { config } from '../config/config.js'
import { getPerson } from '../customers/data.js'

const mode = config.get('auth.mode')

export function validateCredentials (crn, _password) {
  if (mode === 'basic') {
    return true
  }

  const person = getPerson(crn)

  if (!person) {
    return false
  }

  return true
}
