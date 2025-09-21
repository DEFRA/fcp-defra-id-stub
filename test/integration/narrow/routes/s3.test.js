import http2 from 'node:http2'
import { beforeAll, beforeEach, afterAll, describe, test, expect, vi } from 'vitest'
import { createServer } from '../../../../src/server.js'

const { constants: httpConstants } = http2
const { HTTP_STATUS_OK, HTTP_STATUS_BAD_REQUEST, HTTP_STATUS_NOT_FOUND, HTTP_STATUS_INTERNAL_SERVER_ERROR } = httpConstants

vi.mock('../../../../src/data/s3.js', () => ({
  getS3Datasets: vi.fn(),
  downloadS3File: vi.fn()
}))

vi.mock('../../../../src/common/helpers/logging/logger.js', () => ({
  createLogger: () => ({
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn()
  })
}))

const mockDatasets = [
  {
    clientId: 'test-client-1',
    filename: 'test-dataset-1.json',
    lastModified: '2024-01-01T10:00:00Z',
    valid: true,
    errorMessage: null
  },
  {
    clientId: 'test-client-2',
    filename: 'test-dataset-2.json',
    lastModified: '2024-01-02T11:00:00Z',
    valid: false,
    errorMessage: 'Invalid schema'
  }
]

const mockFileContent = 'test file content'

let server

describe('s3 routes (S3 enabled)', () => {
  beforeAll(async () => {
    server = await createServer()
  })

  beforeEach(async () => {
    const { getS3Datasets, downloadS3File } = await import('../../../../src/data/s3.js')

    vi.clearAllMocks()

    getS3Datasets.mockResolvedValue(mockDatasets)
    downloadS3File.mockResolvedValue(mockFileContent)
  })

  afterAll(async () => {
    await server.stop()
  })

  describe('S3 view route', () => {
    test('GET should return status code 200', async () => {
      const result = await server.inject({ method: 'GET', url: '/s3' })
      expect(result.statusCode).toBe(HTTP_STATUS_OK)
    })

    test('GET should render the S3 view with datasets', async () => {
      const result = await server.inject({ method: 'GET', url: '/s3' })
      expect(result.payload).toContain('test-client-1')
      expect(result.payload).toContain('test-client-2')
      expect(result.payload).toContain('test-dataset-1.json')
      expect(result.payload).toContain('test-dataset-2.json')
    })

    test('GET should call getS3Datasets', async () => {
      const { getS3Datasets } = await import('../../../../src/data/s3.js')

      await server.inject({ method: 'GET', url: '/s3' })
      expect(getS3Datasets).toHaveBeenCalledTimes(1)
    })

    test('GET should render the S3 view with empty datasets', async () => {
      const { getS3Datasets } = await import('../../../../src/data/s3.js')
      getS3Datasets.mockResolvedValue([])

      const result = await server.inject({ method: 'GET', url: '/s3' })
      expect(result.statusCode).toBe(HTTP_STATUS_OK)
      expect(result.payload).toContain('No datasets have been uploaded')
    })

    test('GET should handle getS3Datasets error gracefully', async () => {
      const { getS3Datasets } = await import('../../../../src/data/s3.js')
      getS3Datasets.mockRejectedValue(new Error('S3 connection failed'))

      const result = await server.inject({ method: 'GET', url: '/s3' })
      expect(result.statusCode).toBe(HTTP_STATUS_INTERNAL_SERVER_ERROR)
    })
  })

  describe('S3 download route', () => {
    test('GET should return 400 if clientId missing', async () => {
      const result = await server.inject({
        method: 'GET',
        url: '/s3/download?filename=test.json'
      })
      expect(result.statusCode).toBe(HTTP_STATUS_BAD_REQUEST)
      expect(result.payload).toContain('&quot;clientId&quot; is required')
    })

    test('GET should return 400 if filename missing', async () => {
      const result = await server.inject({
        method: 'GET',
        url: '/s3/download?clientId=test'
      })
      expect(result.statusCode).toBe(HTTP_STATUS_BAD_REQUEST)
      expect(result.payload).toContain('&quot;filename&quot; is required')
    })

    test('GET should return 400 if both clientId and filename missing', async () => {
      const result = await server.inject({ method: 'GET', url: '/s3/download' })
      expect(result.statusCode).toBe(HTTP_STATUS_BAD_REQUEST)
      expect(result.payload).toContain('&quot;clientId&quot; is required')
      expect(result.payload).toContain('&quot;filename&quot; is required')
    })

    test('GET should return 404 if file not found', async () => {
      const { downloadS3File } = await import('../../../../src/data/s3.js')
      downloadS3File.mockResolvedValue(null)

      const result = await server.inject({
        method: 'GET',
        url: '/s3/download?clientId=test&filename=notfound.json'
      })
      expect(result.statusCode).toBe(HTTP_STATUS_NOT_FOUND)
    })

    test('GET should return file content if file exists', async () => {
      const result = await server.inject({
        method: 'GET',
        url: '/s3/download?clientId=test&filename=test.json'
      })
      expect(result.statusCode).toBe(HTTP_STATUS_OK)
      expect(result.payload).toBe('test file content')
    })

    test('GET should call downloadS3File with correct parameters', async () => {
      const { downloadS3File } = await import('../../../../src/data/s3.js')

      await server.inject({
        method: 'GET',
        url: '/s3/download?clientId=test&filename=test.json'
      })
      expect(downloadS3File).toHaveBeenCalledWith('test', 'test.json')
    })

    test('GET should handle downloadS3File error gracefully', async () => {
      const { downloadS3File } = await import('../../../../src/data/s3.js')
      downloadS3File.mockRejectedValue(new Error('S3 download failed'))

      const result = await server.inject({
        method: 'GET',
        url: '/s3/download?clientId=test&filename=test.json'
      })
      expect(result.statusCode).toBe(HTTP_STATUS_INTERNAL_SERVER_ERROR)
    })

    test('GET should handle malformed query parameters', async () => {
      const result = await server.inject({
        method: 'GET',
        url: '/s3/download?clientId=&filename='
      })
      expect(result.statusCode).toBe(HTTP_STATUS_BAD_REQUEST)
    })
  })
})
