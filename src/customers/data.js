import { config } from '../config/config.js'

const mode = config.get('auth.mode')
const override = config.get('auth.override')

let people = []

if (mode === 'basic' || mode === 'mock') {
  const data = await import('./data.json', { with: { type: 'json' } })
  people = data.default.people
}

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

export function getPerson (crn) {
  if (override !== '' && mode === 'basic') {
    return people[0]
  }

  return people.find(person => person.crn === crn)
}

export function getOrganisations (crn) {
  if (override !== '' && mode === 'basic') {
    return people[0].organisations
  }

  return people.find(person => person.crn === crn).organisations
}

export function getSelectedOrganisation (crn, sbi) {
  if (override !== '' && mode === 'basic') {
    return people[0].organisations.find(org => org.sbi === sbi)
  }

  const person = people.find(p => p.crn === crn)

  return person.organisations.find(org => org.sbi === sbi)
}
