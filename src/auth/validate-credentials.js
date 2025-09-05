import { config } from '../config/config.js'
import { getPerson } from '../customers/data.js'

const auth = config.get('auth')
const { s3Enabled } = config.get('aws')

export async function validateCredentials (crn, _password, clientId) {
  if (auth.mode === 'basic' && auth.override === '' && auth.overrideFile === '' && !s3Enabled) {
    return true
  }

  const person = await getPerson(crn, clientId)

  if (!person) {
    return false
  }

  return true
}
