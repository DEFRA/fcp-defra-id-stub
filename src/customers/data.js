import { config } from '../config/config.js'
import { schema } from './schema.js'
import { getLatestS3Data } from './s3.js'

const { mode, override, overrideFile } = config.get('auth')
const { s3Enabled, s3Bucket } = config.get('aws')

let people = []

const data = await import('./data.json', { with: { type: 'json' } })
people = data.default.people

if (override !== '') {
  const [crn, firstName, lastName, organisationId, sbi, name] = override.split(':')
  people = [{
    crn: Number(crn),
    firstName,
    lastName,
    organisations: [{
      organisationId,
      sbi: Number(sbi),
      name
    }]
  }]
}

if (overrideFile !== '') {
  const overrideData = await import(`/data/${overrideFile}`, { with: { type: 'json' } })

  const { error } = schema.validate(overrideData.default, { abortEarly: false })

  if (error) {
    throw new Error(`Invalid override file data: ${error.message}`)
  }

  people = overrideData.default.people
}

export async function getPerson (crn, clientId) {
  if (s3Enabled && clientId && s3Bucket) {
    const s3People = await getLatestS3Data(clientId)
    if (s3People && s3People.length > 0) {
      return s3People.find(person => person.crn === crn)
    }
  }

  if (mode === 'basic' && override === '' && overrideFile === '') {
    return people[0]
  }

  return people.find(person => person.crn === crn)
}

export async function getOrganisations (crn, clientId) {
  if (s3Enabled && clientId && s3Bucket) {
    const s3People = await getLatestS3Data(clientId)
    if (s3People && s3People.length > 0) {
      const s3Person = s3People.find(p => p.crn === crn)
      return s3Person ? s3Person.organisations : []
    }
  }

  if (mode === 'basic' && override === '' && overrideFile === '') {
    return people[0].organisations
  }

  const person = people.find(p => p.crn === crn)
  return person ? person.organisations : []
}

export async function getSelectedOrganisation (crn, { sbi, organisationId }, clientId) {
  let person

  if (s3Enabled && clientId && s3Bucket) {
    const s3People = await getLatestS3Data(clientId)
    if (s3People && s3People.length > 0) {
      person = s3People.find(p => p.crn === crn)
    }
  }

  if (!person) {
    if (mode === 'basic' && override === '' && overrideFile === '') {
      person = people[0]
    } else {
      person = people.find(p => p.crn === crn)
    }
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
