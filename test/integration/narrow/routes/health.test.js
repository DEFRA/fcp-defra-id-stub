import { describe, beforeAll, afterAll, test, expect } from 'vitest'
import http2 from 'node:http2'
import { createServer } from '../../../../src/server.js'

const { constants: httpConstants } = http2
const { HTTP_STATUS_OK } = httpConstants

describe('health route', () => {
  let server

  beforeAll(async () => {
    server = await createServer()
    await server.initialize()
  })

  afterAll(async () => {
    await server.stop({ timeout: 0 })
  })

  test('should provide success response and return status code 200', async () => {
    const { result, statusCode } = await server.inject({
      method: 'GET',
      url: '/health'
    })

    expect(result).toEqual({ message: 'success' })
    expect(statusCode).toBe(HTTP_STATUS_OK)
  })
})
