import { describe, beforeAll, afterAll, test, expect } from 'vitest'
import { createServer } from '../../../../src/server.js'

describe('Start route', () => {
  let server

  beforeAll(async () => {
    server = await createServer()
    await server.initialize()
  })

  afterAll(async () => {
    await server.stop({ timeout: 0 })
  })

  test('Should return status code 200', async () => {
    const { statusCode } = await server.inject({
      method: 'GET',
      url: '/'
    })

    expect(statusCode).toBe(200)
  })
})
