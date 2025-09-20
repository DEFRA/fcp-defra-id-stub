import { getPerson } from '../data/people.js'

export async function validateCredentials (crn, _password, clientId) {
  const person = await getPerson(crn, clientId)

  return !!person
}
