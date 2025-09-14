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
      credentials: {
        accessKeyId,
        secretAccessKey
      }
    })
  })
}

export async function getLatestS3Data (clientId) {
  if (!s3Client) {
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

// get latest fs3 filenames for all clients
export async function getS3Datasets () {
  if (!s3Client) {
    return []
  }

  try {
    const listCommand = new ListObjectsV2Command({
      Bucket: s3Bucket,
      Delimiter: '/'
    })

    const listResponse = await s3Client.send(listCommand)

    if (!listResponse.CommonPrefixes || listResponse.CommonPrefixes.length === 0) {
      logger.warn('No client folders found in S3 bucket')
      return []
    }

    const datasets = []

    for (const prefixObj of listResponse.CommonPrefixes) {
      const clientId = prefixObj.Prefix.replace(/\/$/, '') // Remove trailing slash
      const clientListCommand = new ListObjectsV2Command({
        Bucket: s3Bucket,
        Prefix: `${clientId}/`,
        Delimiter: '/'
      })

      const clientListResponse = await s3Client.send(clientListCommand)
      if (clientListResponse.Contents && clientListResponse.Contents.length > 0) {
        const jsonFiles = clientListResponse.Contents
          .filter(obj => obj.Key.endsWith('.json'))
          .sort((a, b) => new Date(b.LastModified) - new Date(a.LastModified))

        if (jsonFiles.length > 0) {
          const mostRecentFile = jsonFiles[0]
          datasets.push({
            clientId,
            filename: mostRecentFile.Key.split('/').pop(),
            lastModified: new Date(mostRecentFile.LastModified).toISOString().slice(0, 16).replace('T', ' ')
          })
        }
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
  if (!s3Client) {
    return null
  }

  try {
    const getCommand = new GetObjectCommand({
      Bucket: s3Bucket,
      Key: `${clientId}/${filename}`
    })

    const getResponse = await s3Client.send(getCommand)
    const dataString = await getResponse.Body.transformToString()
    return dataString
  } catch (error) {
    logger.error(`Error downloading S3 file ${filename} for client ${clientId}: ${error.message}`)
    return null
  }
}
