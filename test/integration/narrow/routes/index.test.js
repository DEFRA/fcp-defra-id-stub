import { describe, beforeAll, afterAll, test, expect } from 'vitest'
import http2 from 'node:http2'
import { createServer } from '../../../../src/server.js'

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
