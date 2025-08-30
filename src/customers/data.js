import { config } from '../config/config.js'

const mode = config.get('auth.mode')

let people = []

if (mode === 'basic' || mode === 'mock') {
  const data = await import('./data.json', { with: { type: 'json' } })
  people = data.default.people
}

export function getPerson (crn) {
  if (mode === 'basic') {
    return people[0]
  }

  return people.find(person => person.crn === crn)
}

export function getOrganisations (crn) {
  if (mode === 'basic') {
    return people[0].organisations
  }

  return people.find(person => person.crn === crn).organisations
}

export function getSelectedOrganisation (crn, sbi) {
  if (mode === 'basic') {
    return people[0].organisations.find(org => org.sbi === sbi)
  }

  const person = people.find(person => person.crn === crn)

  return person.organisations.find(org => org.sbi === sbi)
}
