import { beforeAll, beforeEach, afterAll, describe, test, expect } from 'vitest'
import { S3Client, CreateBucketCommand, PutObjectCommand, DeleteObjectCommand, ListObjectsV2Command, DeleteBucketCommand } from '@aws-sdk/client-s3'
import { getLatestS3Data, getS3Datasets, downloadS3File } from '../../../../src/data/s3.js'
import { config } from '../../../../src/config/config.js'

const { s3Bucket, region, endpoint, accessKeyId, secretAccessKey } = config.get('aws')

const validPeopleData = {
  people: [
    {
      crn: 1234567890,
      firstName: 'John',
      lastName: 'Doe',
      organisations: [
        {
          organisationId: 'org1',
          sbi: 123456789,
          name: 'Test Organisation 1'
        }
      ]
    }
  ]
}

const invalidPeopleData = {
  people: [
    {
      crn: 'invalid',
      firstName: 'Jane',
      lastName: 'Smith'
    }
  ]
}

let s3Client

describe('s3 data functions (local integration)', () => {
  beforeAll(async () => {
    s3Client = new S3Client({
      region,
      endpoint,
      forcePathStyle: true,
      credentials: { accessKeyId, secretAccessKey }
    })

    try {
      await s3Client.send(new CreateBucketCommand({ Bucket: s3Bucket }))
    } catch (error) {
      if (!error.message.includes('BucketAlreadyOwnedByYou')) {
        console.warn(`Error creating bucket: ${error.message}`)
      }
    }
  })

  beforeEach(async () => {
    await cleanupTestData()
  })

  afterAll(async () => {
    await cleanupTestData()
    try {
      await s3Client.send(new DeleteBucketCommand({ Bucket: s3Bucket }))
    } catch (error) {
      console.warn(`Error deleting bucket: ${error.message}`)
    }
  })

  async function cleanupTestData () {
    try {
      const listResponse = await s3Client.send(new ListObjectsV2Command({ Bucket: s3Bucket }))
      if (listResponse.Contents) {
        for (const object of listResponse.Contents) {
          await s3Client.send(new DeleteObjectCommand({ Bucket: s3Bucket, Key: object.Key }))
        }
      }
    } catch (error) {
      console.warn(`Error cleaning up test data: ${error.message}`)
    }
  }

  async function uploadTestFile (key, content) {
    await s3Client.send(new PutObjectCommand({
      Bucket: s3Bucket,
      Key: key,
      Body: JSON.stringify(content),
      ContentType: 'application/json'
    }))
  }

  describe('getLatestS3Data', () => {
    test('should return null when S3 is not enabled', async () => {
    })

    test('should return null when no files exist for client', async () => {
      const result = await getLatestS3Data('nonexistent-client')
      expect(result).toBeNull()
    })

    test('should return people data from most recent valid file', async () => {
      const clientId = 'test-client-1'

      await uploadTestFile(`${clientId}/old-data.json`, validPeopleData)

      await new Promise(resolve => setTimeout(resolve, 100))

      const newerData = {
        people: [
          {
            crn: 9876543210,
            firstName: 'Newer',
            lastName: 'Data',
            organisations: [
              {
                organisationId: 'org2',
                sbi: 987654321,
                name: 'Newer Organisation'
              }
            ]
          }
        ]
      }
      await uploadTestFile(`${clientId}/new-data.json`, newerData)

      const result = await getLatestS3Data(clientId)
      expect(result).toEqual(newerData.people)
    })

    test('should return null for invalid JSON file', async () => {
      const clientId = 'test-client-invalid'

      await s3Client.send(new PutObjectCommand({
        Bucket: s3Bucket,
        Key: `${clientId}/invalid.json`,
        Body: 'invalid json content',
        ContentType: 'application/json'
      }))

      const result = await getLatestS3Data(clientId)
      expect(result).toBeNull()
    })

    test('should return null for invalid schema', async () => {
      const clientId = 'test-client-schema'
      await uploadTestFile(`${clientId}/invalid-schema.json`, invalidPeopleData)

      const result = await getLatestS3Data(clientId)
      expect(result).toBeNull()
    })

    test('should ignore non-JSON files', async () => {
      const clientId = 'test-client-mixed'

      await s3Client.send(new PutObjectCommand({
        Bucket: s3Bucket,
        Key: `${clientId}/readme.txt`,
        Body: 'This is not JSON',
        ContentType: 'text/plain'
      }))

      await uploadTestFile(`${clientId}/data.json`, validPeopleData)

      const result = await getLatestS3Data(clientId)
      expect(result).toEqual(validPeopleData.people)
    })
  })

  describe('getS3Datasets', () => {
    test('should return empty array when no datasets exist', async () => {
      const result = await getS3Datasets()
      expect(result).toEqual([])
    })

    test('should return dataset information for all clients', async () => {
      const client1 = 'test-client-1'
      const client2 = 'test-client-2'

      await uploadTestFile(`${client1}/data.json`, validPeopleData)
      await uploadTestFile(`${client2}/invalid.json`, invalidPeopleData)

      const result = await getS3Datasets()
      expect(result).toHaveLength(2)

      const client1Dataset = result.find(ds => ds.clientId === client1)
      expect(client1Dataset).toBeDefined()
      expect(client1Dataset.filename).toBe('data.json')
      expect(client1Dataset.valid).toBe(true)
      expect(client1Dataset.lastModified).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/)

      const client2Dataset = result.find(ds => ds.clientId === client2)
      expect(client2Dataset).toBeDefined()
      expect(client2Dataset.filename).toBe('invalid.json')
      expect(client2Dataset.valid).toBe(false)
      expect(client2Dataset.errorMessage).toContain('must be a number')
    })

    test('should return most recent file per client', async () => {
      const clientId = 'test-client-recent'

      await uploadTestFile(`${clientId}/old.json`, validPeopleData)

      await new Promise(resolve => setTimeout(resolve, 100))

      await uploadTestFile(`${clientId}/new.json`, validPeopleData)

      const result = await getS3Datasets()
      expect(result).toHaveLength(1)
      expect(result[0].clientId).toBe(clientId)
      expect(result[0].filename).toBe('new.json')
    })

    test('should handle invalid JSON files gracefully', async () => {
      const clientId = 'test-client-broken'

      await s3Client.send(new PutObjectCommand({
        Bucket: s3Bucket,
        Key: `${clientId}/broken.json`,
        Body: '{ invalid json',
        ContentType: 'application/json'
      }))

      const result = await getS3Datasets()
      expect(result).toHaveLength(1)
      expect(result[0].clientId).toBe(clientId)
      expect(result[0].filename).toBe('broken.json')
      expect(result[0].valid).toBe(false)
      expect(result[0].errorMessage).toContain('Failed to parse JSON')
    })
  })

  describe('downloadS3File', () => {
    test('should return null when file does not exist', async () => {
      const result = await downloadS3File('nonexistent-client', 'nonexistent.json')
      expect(result).toBeNull()
    })

    test('should return file content when file exists', async () => {
      const clientId = 'test-download-client'
      const filename = 'download-test.json'
      const content = validPeopleData

      await uploadTestFile(`${clientId}/${filename}`, content)

      const result = await downloadS3File(clientId, filename)
      expect(result).toBe(JSON.stringify(content))
    })

    test('should handle non-JSON files', async () => {
      const clientId = 'test-download-text'
      const filename = 'text-file.txt'
      const content = 'This is plain text content'

      await s3Client.send(new PutObjectCommand({
        Bucket: s3Bucket,
        Key: `${clientId}/${filename}`,
        Body: content,
        ContentType: 'text/plain'
      }))

      const result = await downloadS3File(clientId, filename)
      expect(result).toBe(content)
    })

    test('should handle special characters in filenames', async () => {
      const clientId = 'test-special-chars'
      const filename = 'file with spaces & symbols.json'
      const content = validPeopleData

      await uploadTestFile(`${clientId}/${filename}`, content)

      const result = await downloadS3File(clientId, filename)
      expect(result).toBe(JSON.stringify(content))
    })
  })
})
