import Joi from 'joi'
import { S3Client, ListObjectsV2Command, GetObjectCommand } from '@aws-sdk/client-s3'
import { config } from '../config/config.js'
import { createLogger } from '../common/helpers/logging/logger.js'

const { mode, override, overrideFile } = config.get('auth')
const { s3Enabled, s3Bucket, region, endpoint, accessKeyId, secretAccessKey } = config.get('aws')
const logger = createLogger()

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

let people = []
let s3Client = null

// Initialize S3 client if enabled
if (s3Enabled && s3Bucket) {
  s3Client = new S3Client({
    region,
    ...(endpoint && {
      endpoint,
      forcePathStyle: true,
      credentials: {
        accessKeyId,
        secretAccessKey
      }
    })
  })
}

// Helper function to get the most recent JSON file from S3 for a specific client
async function getLatestS3Data (clientId) {
  if (!s3Client || !s3Bucket) {
    return null
  }

  try {
    // List objects in the client-specific folder
    const listCommand = new ListObjectsV2Command({
      Bucket: s3Bucket,
      Prefix: `${clientId}/`,
      Delimiter: '/'
    })

    const listResponse = await s3Client.send(listCommand)

    if (!listResponse.Contents || listResponse.Contents.length === 0) {
      logger.warn(`No JSON files found in S3 bucket for client: ${clientId}`)
      return null
    }

    // Filter for JSON files and sort by last modified (most recent first)
    const jsonFiles = listResponse.Contents
      .filter(obj => obj.Key.endsWith('.json'))
      .sort((a, b) => new Date(b.LastModified) - new Date(a.LastModified))

    if (jsonFiles.length === 0) {
      logger.warn(`No JSON files found in S3 bucket for client: ${clientId}`)
      return null
    }

    // Get the most recent JSON file
    const mostRecentFile = jsonFiles[0]
    logger.info(`Loading most recent S3 data file for client ${clientId}: ${mostRecentFile.Key}`)

    const getCommand = new GetObjectCommand({
      Bucket: s3Bucket,
      Key: mostRecentFile.Key
    })

    const getResponse = await s3Client.send(getCommand)
    const dataString = await getResponse.Body.transformToString()
    const s3Data = JSON.parse(dataString)

    // Validate the data against the schema
    const { error } = schema.validate(s3Data, { abortEarly: false })

    if (error) {
      logger.error(`Invalid S3 data file for client ${clientId}: ${error.message}`)
      return null
    }

    logger.info(`Successfully loaded and validated S3 data for client: ${clientId}`)
    return s3Data.people
  } catch (error) {
    logger.error(`Error loading S3 data for client ${clientId}: ${error.message}`)
    return null
  }
}

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
  // Try to get S3 data first if enabled
  if (s3Enabled && clientId && s3Bucket) {
    const s3People = await getLatestS3Data(clientId)
    if (s3People && s3People.length > 0) {
      // If we have S3 data, always match by CRN
      return s3People.find(person => person.crn === crn)
    }
  }

  // No S3 data, use local data logic
  if (mode === 'basic' && override === '' && overrideFile === '') {
    return people[0]
  }

  return people.find(person => person.crn === crn)
}

export async function getOrganisations (crn, clientId) {
  // Try to get S3 data first if enabled
  if (s3Enabled && clientId && s3Bucket) {
    const s3People = await getLatestS3Data(clientId)
    if (s3People && s3People.length > 0) {
      // If we have S3 data, always match by CRN
      const s3Person = s3People.find(p => p.crn === crn)
      return s3Person ? s3Person.organisations : []
    }
  }

  // No S3 data, use local data logic
  if (mode === 'basic' && override === '' && overrideFile === '') {
    return people[0].organisations
  }

  const person = people.find(p => p.crn === crn)
  return person ? person.organisations : []
}

export async function getSelectedOrganisation (crn, { sbi, organisationId }, clientId) {
  let person

  // Try to get S3 data first if enabled
  if (s3Enabled && clientId && s3Bucket) {
    const s3People = await getLatestS3Data(clientId)
    if (s3People && s3People.length > 0) {
      // If we have S3 data, always match by CRN
      person = s3People.find(p => p.crn === crn)
    }
  }

  // No S3 data or person not found in S3, use local data logic
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
