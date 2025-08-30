import { config } from '../config/config.js'
import { getPerson } from '../customers/data.js'

const auth = config.get('auth')

export function validateCredentials (crn, _password) {
  if (auth.mode === 'basic' && auth.override === '' && auth.overrideFile === '') {
    return true
  }

  const person = getPerson(crn)

  if (!person) {
    return false
  }

  return true
}
