import Joi from 'joi'
import { config } from '../config/config.js'

const { mode, override, overrideFile } = config.get('auth')

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

  const schema = Joi.object({
    people: Joi.array().items(Joi.object({
      crn: Joi.number().required(),
      firstName: Joi.string().required(),
      lastName: Joi.string().required(),
      organisations: Joi.array().items(Joi.object({
        organisationId: Joi.string().required(),
        sbi: Joi.number().required(),
        name: Joi.string().required()
      })).required()
    })).required()
  })

  const { error } = schema.validate(overrideData.default, { abortEarly: false })

  if (error) {
    throw new Error(`Invalid override file data: ${error.message}`)
  }

  people = overrideData.default.people
}

export function getPerson (crn) {
  if (mode === 'basic' && override === '' && overrideFile === '') {
    return people[0]
  }

  return people.find(person => person.crn === crn)
}

export function getOrganisations (crn) {
  if (mode === 'basic' && override === '' && overrideFile === '') {
    return people[0].organisations
  }

  return people.find(person => person.crn === crn).organisations
}

export function getSelectedOrganisation (crn, sbi) {
  if (mode === 'basic' && override === '' && overrideFile === '') {
    return people[0].organisations.find(org => org.sbi === sbi)
  }

  const person = people.find(p => p.crn === crn)

  return person.organisations.find(org => org.sbi === sbi)
}
