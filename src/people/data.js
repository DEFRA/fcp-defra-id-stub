import { config } from '../config/config.js'
import { getData } from './source.js'

const source = config.get('auth.source')

export async function getPerson (crn, clientId) {
  const { people, s3 } = await getData(clientId)

  if (source === 'basic' && !s3) {
    return people[0]
  }

  return people.find(person => person.crn === crn)
}

export async function getOrganisations (crn, clientId) {
  const { people, s3 } = await getData(clientId)

  if (source === 'basic' && !s3) {
    return people[0].organisations || []
  }

  return people.find(p => p.crn === crn)?.organisations || []
}

export async function getSelectedOrganisation (crn, { sbi, organisationId }, clientId) {
  let person

  const { people, s3 } = await getData(clientId)

  if (source === 'basic' && !s3) {
    person = people[0]
  } else {
    person = people.find(p => p.crn === crn)
  }

  if (!person) {
    return null
  }

  if (sbi) {
    return person.organisations.find(org => org.sbi === sbi)
  }

  if (organisationId) {
    return person.organisations.find(org => org.organisationId === organisationId)
  }

  return null
}
