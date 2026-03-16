import http2 from 'node:http2'
import { beforeAll, beforeEach, afterAll, describe, test, expect, vi } from 'vitest'
import '../helpers/setup-server-mocks.js'

// Enable S3 for all tests
process.env.AWS_S3_ENABLED = 'true'

const { constants: httpConstants } = http2
const { HTTP_STATUS_OK, HTTP_STATUS_BAD_REQUEST, HTTP_STATUS_NOT_FOUND, HTTP_STATUS_INTERNAL_SERVER_ERROR, HTTP_STATUS_FORBIDDEN, HTTP_STATUS_FOUND } = httpConstants

vi.mock('../../../../src/data/s3.js', () => ({
  getS3Datasets: vi.fn(),
  downloadS3File: vi.fn(),
  uploadS3File: vi.fn(),
  deleteS3File: vi.fn()
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

const { getS3Datasets, downloadS3File, uploadS3File, deleteS3File } = await import('../../../../src/data/s3.js')

function buildMultipartPayload ({ clientId, filename, fileContent }) {
  const boundary = 'testboundary'
  const body = [
    `--${boundary}`,
    'Content-Disposition: form-data; name="clientId"',
    '',
    clientId,
    `--${boundary}`,
    `Content-Disposition: form-data; name="file"; filename="${filename}"`,
    'Content-Type: application/json',
    '',
    fileContent,
    `--${boundary}--`
  ].join('\r\n')
  const payload = Buffer.from(body)
  return {
    payload,
    headers: {
      'content-type': `multipart/form-data; boundary=${boundary}`,
      'content-length': payload.length.toString()
    }
  }
}

describe('s3 routes', () => {
  let server

  beforeAll(async () => {
    const { createServer } = await import('../../../../src/server.js')
    server = await createServer()
    await server.initialize()
  })

  beforeEach(() => {
    vi.clearAllMocks()

    getS3Datasets.mockResolvedValue(mockDatasets)
    downloadS3File.mockResolvedValue(mockFileContent)
    uploadS3File.mockResolvedValue(undefined)
    deleteS3File.mockResolvedValue(undefined)
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
      await server.inject({ method: 'GET', url: '/s3' })
      expect(getS3Datasets).toHaveBeenCalledTimes(1)
    })

    test('GET should render the S3 view with empty datasets', async () => {
      getS3Datasets.mockResolvedValue([])

      const result = await server.inject({ method: 'GET', url: '/s3' })
      expect(result.statusCode).toBe(HTTP_STATUS_OK)
      expect(result.payload).toContain('No datasets have been uploaded')
    })

    test('GET should handle getS3Datasets error gracefully', async () => {
      getS3Datasets.mockRejectedValue(new Error('S3 connection failed'))

      const result = await server.inject({ method: 'GET', url: '/s3' })
      expect(result.statusCode).toBe(HTTP_STATUS_INTERNAL_SERVER_ERROR)
    })

    test('GET should not show upload button when Entra is not enabled', async () => {
      const result = await server.inject({ method: 'GET', url: '/s3' })
      expect(result.payload).not.toContain('Upload new dataset')
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
      await server.inject({
        method: 'GET',
        url: '/s3/download?clientId=test&filename=test.json'
      })
      expect(downloadS3File).toHaveBeenCalledWith('test', 'test.json')
    })

    test('GET should handle downloadS3File error gracefully', async () => {
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

describe('s3 routes (protected routes with Entra)', () => {
  const adminCredentials = {
    sessionId: 'session-id-admin',
    isAuthenticated: true,
    scope: ['S3.Amend'],
    token: 'ENTRA-JWT',
    refreshToken: 'ENTRA-REFRESH-TOKEN'
  }

  const userCredentials = {
    sessionId: 'session-id-user',
    isAuthenticated: true,
    scope: ['S3.View'],
    token: 'ENTRA-JWT',
    refreshToken: 'ENTRA-REFRESH-TOKEN'
  }

  let server
  let originalEnv

  beforeAll(async () => {
    // Save and set Entra env vars for these tests
    originalEnv = {
      ENTRA_ENABLED: process.env.ENTRA_ENABLED,
      ENTRA_WELL_KNOWN_URL: process.env.ENTRA_WELL_KNOWN_URL,
      ENTRA_TENANT_ID: process.env.ENTRA_TENANT_ID,
      ENTRA_CLIENT_ID: process.env.ENTRA_CLIENT_ID,
      ENTRA_CLIENT_SECRET: process.env.ENTRA_CLIENT_SECRET,
      ENTRA_REDIRECT_URL: process.env.ENTRA_REDIRECT_URL,
      ENTRA_SIGN_OUT_REDIRECT_URL: process.env.ENTRA_SIGN_OUT_REDIRECT_URL
    }

    process.env.ENTRA_ENABLED = 'true'
    process.env.ENTRA_WELL_KNOWN_URL = 'https://login.microsoftonline.com/test-tenant-id/v2.0/.well-known/openid-configuration'
    process.env.ENTRA_TENANT_ID = 'test-tenant-id'
    process.env.ENTRA_CLIENT_ID = 'test-client-id'
    process.env.ENTRA_CLIENT_SECRET = 'test-client-secret'
    process.env.ENTRA_REDIRECT_URL = 'http://localhost:3007/auth/sign-in-oidc'
    process.env.ENTRA_SIGN_OUT_REDIRECT_URL = 'http://localhost:3007'

    // Reset modules to force config to reload with new env vars
    vi.resetModules()

    // Import createServer after resetting modules and setting env vars
    const { createServer } = await import('../../../../src/server.js')
    server = await createServer()
    await server.initialize()
  })

  afterAll(async () => {
    if (server) {
      await server.stop()
    }
    // Restore original env vars
    for (const [key, value] of Object.entries(originalEnv)) {
      if (value !== undefined) {
        process.env[key] = value
      } else {
        delete process.env[key]
      }
    }
  })

  beforeEach(() => {
    vi.clearAllMocks()

    getS3Datasets.mockResolvedValue([{
      clientId: 'test-client-1',
      filename: 'test-dataset-1.json',
      lastModified: '2024-01-01T10:00:00Z',
      valid: true,
      errorMessage: null
    }])
    uploadS3File.mockResolvedValue(undefined)
    deleteS3File.mockResolvedValue(undefined)
  })

  describe('S3 view route', () => {
    test('GET /s3 should not require authentication', async () => {
      const result = await server.inject({ method: 'GET', url: '/s3' })
      expect(result.statusCode).toBe(HTTP_STATUS_OK)
    })

    test('GET /s3 should render view for authenticated users', async () => {
      const result = await server.inject({
        method: 'GET',
        url: '/s3',
        auth: {
          strategy: 'session',
          credentials: adminCredentials
        }
      })
      expect(result.statusCode).toBe(HTTP_STATUS_OK)
    })

    test('GET /s3 should show Sign in link for unauthenticated users', async () => {
      const result = await server.inject({ method: 'GET', url: '/s3' })
      expect(result.payload).toContain('Sign in')
      expect(result.payload).not.toContain('Sign out')
    })

    test('GET /s3 should show Sign out link for authenticated users', async () => {
      const result = await server.inject({
        method: 'GET',
        url: '/s3',
        auth: {
          strategy: 'session',
          credentials: adminCredentials
        }
      })
      expect(result.payload).toContain('Sign out')
      expect(result.payload).not.toContain('Sign in')
    })

    test('GET /s3 should show Upload new dataset button for authenticated users', async () => {
      const result = await server.inject({
        method: 'GET',
        url: '/s3',
        auth: {
          strategy: 'session',
          credentials: adminCredentials
        }
      })
      expect(result.payload).toContain('Upload new dataset')
    })

    test('GET /s3 should not show Upload new dataset button for unauthenticated users', async () => {
      const result = await server.inject({ method: 'GET', url: '/s3' })
      expect(result.payload).not.toContain('Upload new dataset')
    })
  })

  describe('S3 create route', () => {
    test('GET /s3/create should redirect to sign-in if unauthenticated', async () => {
      const result = await server.inject({ method: 'GET', url: '/s3/create' })
      expect(result.statusCode).toBe(HTTP_STATUS_FOUND)
      expect(result.headers.location).toContain('/auth/sign-in')
    })

    test('GET /s3/create should return 200 for authenticated admin users', async () => {
      const result = await server.inject({
        method: 'GET',
        url: '/s3/create',
        auth: {
          strategy: 'session',
          credentials: adminCredentials
        }
      })
      expect(result.statusCode).toBe(HTTP_STATUS_OK)
    })

    test('GET /s3/create should render file upload form', async () => {
      const result = await server.inject({
        method: 'GET',
        url: '/s3/create',
        auth: {
          strategy: 'session',
          credentials: adminCredentials
        }
      })
      expect(result.payload).toContain('enctype="multipart/form-data"')
      expect(result.payload).toContain('type="file"')
      expect(result.payload).not.toContain('<textarea')
    })

    test('GET /s3/create should return 403 for authenticated non-admin users', async () => {
      const result = await server.inject({
        method: 'GET',
        url: '/s3/create',
        auth: {
          strategy: 'session',
          credentials: userCredentials
        }
      })
      expect(result.statusCode).toBe(HTTP_STATUS_FORBIDDEN)
    })
  })

  describe('S3 upload route with authentication', () => {
    const validFileContent = '{"test": "data"}'

    test('POST /s3/upload should redirect to sign-in if unauthenticated', async () => {
      const result = await server.inject({
        method: 'POST',
        url: '/s3/upload'
      })
      expect(result.statusCode).toBe(HTTP_STATUS_FOUND)
      expect(result.headers.location).toContain('/auth/sign-in')
    })

    test('POST /s3/upload should redirect to /s3 for authenticated admin users', async () => {
      const { payload, headers } = buildMultipartPayload({
        clientId: 'test-client',
        filename: 'test.json',
        fileContent: validFileContent
      })
      const result = await server.inject({
        method: 'POST',
        url: '/s3/upload',
        payload,
        headers,
        auth: {
          strategy: 'session',
          credentials: adminCredentials
        }
      })
      expect(result.statusCode).toBe(HTTP_STATUS_FOUND)
      expect(result.headers.location).toBe('/s3')
    })

    test('POST /s3/upload should return 403 for authenticated non-admin users', async () => {
      const { payload, headers } = buildMultipartPayload({
        clientId: 'test-client',
        filename: 'test.json',
        fileContent: validFileContent
      })
      const result = await server.inject({
        method: 'POST',
        url: '/s3/upload',
        payload,
        headers,
        auth: {
          strategy: 'session',
          credentials: userCredentials
        }
      })
      expect(result.statusCode).toBe(HTTP_STATUS_FORBIDDEN)
    })

    test('POST /s3/upload should call uploadS3File with correct parameters for admin', async () => {
      const { payload, headers } = buildMultipartPayload({
        clientId: 'test-client',
        filename: 'test.json',
        fileContent: validFileContent
      })
      await server.inject({
        method: 'POST',
        url: '/s3/upload',
        payload,
        headers,
        auth: {
          strategy: 'session',
          credentials: adminCredentials
        }
      })
      expect(uploadS3File).toHaveBeenCalledWith('test-client', 'test.json', validFileContent)
    })

    test('POST /s3/upload should handle uploadS3File error gracefully', async () => {
      uploadS3File.mockRejectedValue(new Error('S3 upload failed'))
      const { payload, headers } = buildMultipartPayload({
        clientId: 'test-client',
        filename: 'test.json',
        fileContent: validFileContent
      })
      const result = await server.inject({
        method: 'POST',
        url: '/s3/upload',
        payload,
        headers,
        auth: {
          strategy: 'session',
          credentials: adminCredentials
        }
      })
      expect(result.statusCode).toBe(HTTP_STATUS_INTERNAL_SERVER_ERROR)
    })

    test('POST /s3/upload should return 400 with s3-create view when clientId is missing', async () => {
      const { payload, headers } = buildMultipartPayload({
        clientId: '',
        filename: 'test.json',
        fileContent: validFileContent
      })
      const result = await server.inject({
        method: 'POST',
        url: '/s3/upload',
        payload,
        headers,
        auth: {
          strategy: 'session',
          credentials: adminCredentials
        }
      })
      expect(result.statusCode).toBe(HTTP_STATUS_BAD_REQUEST)
      expect(result.payload).toContain('There is a problem')
      expect(result.payload).toContain('Enter a Client ID')
    })

    test('POST /s3/upload should return 400 with s3-create view when file is not .json', async () => {
      const { payload, headers } = buildMultipartPayload({
        clientId: 'test-client',
        filename: 'test.xlsx',
        fileContent: validFileContent
      })
      const result = await server.inject({
        method: 'POST',
        url: '/s3/upload',
        payload,
        headers,
        auth: {
          strategy: 'session',
          credentials: adminCredentials
        }
      })
      expect(result.statusCode).toBe(HTTP_STATUS_BAD_REQUEST)
      expect(result.payload).toContain('There is a problem')
      expect(result.payload).toContain('File must be a .json file')
    })
  })

  describe('S3 delete confirm route', () => {
    test('GET /s3/delete should redirect to sign-in if unauthenticated', async () => {
      const result = await server.inject({
        method: 'GET',
        url: '/s3/delete?clientId=test-client&filename=test.json'
      })
      expect(result.statusCode).toBe(HTTP_STATUS_FOUND)
      expect(result.headers.location).toContain('/auth/sign-in')
    })

    test('GET /s3/delete should return 200 for authenticated admin users', async () => {
      const result = await server.inject({
        method: 'GET',
        url: '/s3/delete?clientId=test-client&filename=test.json',
        auth: { strategy: 'session', credentials: adminCredentials }
      })
      expect(result.statusCode).toBe(HTTP_STATUS_OK)
      expect(result.payload).toContain('Confirm delete')
      expect(result.payload).toContain('test-client')
      expect(result.payload).toContain('test.json')
    })

    test('GET /s3/delete should return 400 if clientId missing', async () => {
      const result = await server.inject({
        method: 'GET',
        url: '/s3/delete?filename=test.json',
        auth: { strategy: 'session', credentials: adminCredentials }
      })
      expect(result.statusCode).toBe(HTTP_STATUS_BAD_REQUEST)
    })

    test('GET /s3/delete should return 403 for non-admin users', async () => {
      const result = await server.inject({
        method: 'GET',
        url: '/s3/delete?clientId=test-client&filename=test.json',
        auth: { strategy: 'session', credentials: userCredentials }
      })
      expect(result.statusCode).toBe(HTTP_STATUS_FORBIDDEN)
    })
  })

  describe('S3 delete route with authentication', () => {
    const validPayload = {
      clientId: 'test-client',
      filename: 'test.json'
    }

    test('POST /s3/delete should redirect to sign-in if unauthenticated', async () => {
      const result = await server.inject({
        method: 'POST',
        url: '/s3/delete',
        payload: validPayload
      })
      expect(result.statusCode).toBe(HTTP_STATUS_FOUND)
      expect(result.headers.location).toContain('/auth/sign-in')
    })

    test('POST /s3/delete should redirect to /s3 for authenticated admin users', async () => {
      const result = await server.inject({
        method: 'POST',
        url: '/s3/delete',
        payload: validPayload,
        auth: {
          strategy: 'session',
          credentials: adminCredentials
        }
      })
      expect(result.statusCode).toBe(HTTP_STATUS_FOUND)
      expect(result.headers.location).toBe('/s3')
    })

    test('POST /s3/delete should return 403 for authenticated non-admin users', async () => {
      const result = await server.inject({
        method: 'POST',
        url: '/s3/delete',
        payload: validPayload,
        auth: {
          strategy: 'session',
          credentials: userCredentials
        }
      })
      expect(result.statusCode).toBe(HTTP_STATUS_FORBIDDEN)
    })

    test('POST /s3/delete should call deleteS3File with correct parameters for admin', async () => {
      await server.inject({
        method: 'POST',
        url: '/s3/delete',
        payload: validPayload,
        auth: {
          strategy: 'session',
          credentials: adminCredentials
        }
      })
      expect(deleteS3File).toHaveBeenCalledWith('test-client', 'test.json')
    })
  })
})
