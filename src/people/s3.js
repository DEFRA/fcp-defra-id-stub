import { S3Client, ListObjectsV2Command, GetObjectCommand } from '@aws-sdk/client-s3'
import { config } from '../config/config.js'
import { createLogger } from '../common/helpers/logging/logger.js'
import { schema } from './schema.js'

const { s3Enabled, s3Bucket, region, endpoint, accessKeyId, secretAccessKey } = config.get('aws')
const logger = createLogger()

let s3Client = null

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

export async function getLatestS3Data (clientId) {
  if (!s3Client || !s3Bucket) {
    return null
  }

  try {
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

    const jsonFiles = listResponse.Contents
      .filter(obj => obj.Key.endsWith('.json'))
      .sort((a, b) => new Date(b.LastModified) - new Date(a.LastModified))

    if (jsonFiles.length === 0) {
      logger.info(`No JSON files found in S3 bucket for client: ${clientId}`)
      return null
    }

    const mostRecentFile = jsonFiles[0]
    logger.info(`Loading most recent S3 data file for client ${clientId}: ${mostRecentFile.Key}`)

    const getCommand = new GetObjectCommand({
      Bucket: s3Bucket,
      Key: mostRecentFile.Key
    })

    const getResponse = await s3Client.send(getCommand)
    const dataString = await getResponse.Body.transformToString()
    const s3Data = JSON.parse(dataString)

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
