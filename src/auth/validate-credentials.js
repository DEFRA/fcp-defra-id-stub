import { getPerson } from '../people/data.js'

export async function validateCredentials (crn, _password, clientId) {
  const person = await getPerson(crn, clientId)

  return !!person
}
