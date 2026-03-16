import { describe, beforeAll, afterAll, test, expect, vi } from 'vitest'
import http2 from 'node:http2'
import '../helpers/setup-server-mocks.js'

const { createServer } = await import('../../../../src/server.js')

const { constants: httpConstants } = http2
const { HTTP_STATUS_OK } = httpConstants

describe('index route', () => {
  let server

  beforeAll(async () => {
    server = await createServer()
    await server.initialize()
  })

  afterAll(async () => {
    await server.stop({ timeout: 0 })
  })

  test('should return status code 200', async () => {
    const { statusCode } = await server.inject({
      method: 'GET',
      url: '/'
    })

    expect(statusCode).toBe(HTTP_STATUS_OK)
  })

  test('should render the index view', async () => {
    const { result } = await server.inject({
      method: 'GET',
      url: '/'
    })

    expect(result).toContain('<title>FCP Defra ID stub - GOV.UK')
    expect(result).toContain('<h1 class="govuk-heading-l">FCP Defra ID stub</h1>')
  })
})

describe('index route (with S3 enabled)', () => {
  let server
  let originalEnv

  beforeAll(async () => {
    originalEnv = { AWS_S3_ENABLED: process.env.AWS_S3_ENABLED }

    process.env.AWS_S3_ENABLED = 'true'
    vi.resetModules()

    const { createServer: createServerS3 } = await import('../../../../src/server.js')
    server = await createServerS3()
    await server.initialize()
  })

  afterAll(async () => {
    await server.stop({ timeout: 0 })
    if (originalEnv.AWS_S3_ENABLED !== undefined) {
      process.env.AWS_S3_ENABLED = originalEnv.AWS_S3_ENABLED
    } else {
      delete process.env.AWS_S3_ENABLED
    }
  })

  test('should contain S3.Amend data management section', async () => {
    const { payload } = await server.inject({ method: 'GET', url: '/' })

    expect(payload).toContain('Data management')
    expect(payload).toContain('S3.Amend')
  })

  test('should contain link to S3 datasets page in data management section', async () => {
    const { payload } = await server.inject({ method: 'GET', url: '/' })

    expect(payload).toContain('/s3')
  })
})

describe('index route (with S3 disabled)', () => {
  let server
  let originalEnv

  beforeAll(async () => {
    originalEnv = { AWS_S3_ENABLED: process.env.AWS_S3_ENABLED }

    process.env.AWS_S3_ENABLED = 'false'
    vi.resetModules()

    const { createServer: createServerNoS3 } = await import('../../../../src/server.js')
    server = await createServerNoS3()
    await server.initialize()
  })

  afterAll(async () => {
    await server.stop({ timeout: 0 })
    if (originalEnv.AWS_S3_ENABLED !== undefined) {
      process.env.AWS_S3_ENABLED = originalEnv.AWS_S3_ENABLED
    } else {
      delete process.env.AWS_S3_ENABLED
    }
  })

  test('should not contain S3.Amend data management section when S3 is disabled', async () => {
    const { payload } = await server.inject({ method: 'GET', url: '/' })

    expect(payload).not.toContain('Data management')
    expect(payload).not.toContain('S3.Amend')
  })
})
