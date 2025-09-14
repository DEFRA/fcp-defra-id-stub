import { S3Client, ListObjectsV2Command, GetObjectCommand } from '@aws-sdk/client-s3'
import { config } from '../config/config.js'
import { createLogger } from '../common/helpers/logging/logger.js'
import { schema } from './schema.js'

const { s3Enabled, s3Bucket, region, endpoint, accessKeyId, secretAccessKey } = config.get('aws')
const logger = createLogger()

let s3Client = null

if (s3Enabled) {
  s3Client = new S3Client({
    region,
    ...(endpoint && {
      endpoint,
      forcePathStyle: true,
      credentials: { accessKeyId, secretAccessKey }
    })
  })
}

function ensureClient () {
  return s3Client
}

async function listObjects ({ prefix, delimiter = '/' } = {}) {
  const command = new ListObjectsV2Command({
    Bucket: s3Bucket,
    ...(prefix && { Prefix: prefix }),
    Delimiter: delimiter
  })
  return s3Client.send(command)
}

function filterAndSortJsonFiles (contents = []) {
  return contents
    .filter(obj => obj.Key?.endsWith('.json'))
    .sort((a, b) => new Date(b.LastModified) - new Date(a.LastModified))
}

async function fetchJsonObject (key) {
  const getCommand = new GetObjectCommand({ Bucket: s3Bucket, Key: key })
  const getResponse = await s3Client.send(getCommand)
  const dataString = await getResponse.Body.transformToString()
  return JSON.parse(dataString)
}

function validatePeopleData (raw, clientId) {
  const { error } = schema.validate(raw, { abortEarly: false })

  if (error) {
    logger.error(`Invalid S3 data file for client ${clientId}: ${error.message}`)
    return null
  }

  return raw.people
}

function formatTimestamp (date) {
  return new Date(date).toISOString().slice(0, 16).replace('T', ' ')
}

export async function getLatestS3Data (clientId) {
  if (!ensureClient()) {
    return null
  }

  try {
    const listResponse = await listObjects({ prefix: `${clientId}/` })
    if (!listResponse.Contents || listResponse.Contents.length === 0) {
      logger.warn(`No JSON files found in S3 bucket for client: ${clientId}`)
      return null
    }

    const jsonFiles = filterAndSortJsonFiles(listResponse.Contents)

    if (jsonFiles.length === 0) {
      logger.info(`No JSON files found in S3 bucket for client: ${clientId}`)
      return null
    }

    const mostRecentFile = jsonFiles[0]
    logger.info(`Loading most recent S3 data file for client ${clientId}: ${mostRecentFile.Key}`)
    const raw = await fetchJsonObject(mostRecentFile.Key)
    const people = validatePeopleData(raw, clientId)

    if (!people) {
      return null
    }

    logger.info(`Successfully loaded and validated S3 data for client: ${clientId}`)
    return people
  } catch (error) {
    logger.error(`Error loading S3 data for client ${clientId}: ${error.message}`)
    return null
  }
}

export async function getS3Datasets () {
  if (!ensureClient()) {
    return []
  }

  try {
    const listResponse = await listObjects()
    const prefixes = listResponse.CommonPrefixes || []

    if (prefixes.length === 0) {
      logger.warn('No client folders found in S3 bucket')
      return []
    }

    const datasets = []
    for (const prefixObj of prefixes) {
      const clientId = prefixObj.Prefix.replace(/\/$/, '')
      const clientObjects = await listObjects({ prefix: `${clientId}/` })
      const jsonFiles = filterAndSortJsonFiles(clientObjects.Contents || [])
      if (jsonFiles.length > 0) {
        const mostRecentFile = jsonFiles[0]
        datasets.push({
          clientId,
          filename: mostRecentFile.Key.split('/').pop(),
          lastModified: formatTimestamp(mostRecentFile.LastModified)
        })
      }
    }
    logger.info(`Found ${datasets.length} datasets in S3`)
    return datasets
  } catch (error) {
    logger.error(`Error listing S3 datasets: ${error.message}`)
    return []
  }
}

export async function downloadS3File (clientId, filename) {
  if (!ensureClient()) {
    return null
  }

  try {
    const key = `${clientId}/${filename}`
    const getCommand = new GetObjectCommand({ Bucket: s3Bucket, Key: key })
    const getResponse = await s3Client.send(getCommand)
    return getResponse.Body.transformToString()
  } catch (error) {
    logger.error(`Error downloading S3 file ${filename} for client ${clientId}: ${error.message}`)
    return null
  }
}
