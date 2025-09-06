import { config } from '../config/config.js'
import { schema } from './schema.js'
import { getLatestS3Data } from './s3.js'

const { source, override, overrideFile } = config.get('auth')
const { s3Enabled } = config.get('aws')

let people = []

const data = await import('./data.json', { with: { type: 'json' } })
people = data.default.people

if (source === 'override') {
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

if (source === 'file') {
  const overrideData = await import(`/data/${overrideFile}`, { with: { type: 'json' } })

  const { error } = schema.validate(overrideData.default, { abortEarly: false })

  if (error) {
    throw new Error(`Invalid override file data: ${error.message}`)
  }

  people = overrideData.default.people
}

export async function getData (clientId) {
  if (s3Enabled) {
    const s3People = await getLatestS3Data(clientId)
    if (s3People && s3People.length > 0) {
      return { people: s3People, s3: true }
    }
  }

  return { people, s3: false }
}
