import { describe, beforeEach, afterEach, test, expect } from 'vitest'
import http2 from 'node:http2'
import { startServer } from '../../../../src/common/helpers/start-server.js'

const { constants: httpConstants } = http2

describe('serveStaticFiles', () => {
  let server

  describe('When secure context is disabled', () => {
    beforeEach(async () => {
      server = await startServer()
    })

    afterEach(async () => {
      await server.stop({ timeout: 0 })
    })

    test('Should serve favicon as expected', async () => {
      const { statusCode } = await server.inject({
        method: 'GET',
        url: '/favicon.ico'
      })

      expect(statusCode).toBe(httpConstants.HTTP_STATUS_NO_CONTENT)
    })

    test('Should serve assets as expected', async () => {
      const { statusCode } = await server.inject({
        method: 'GET',
        url: '/public/assets/images/govuk-crest.svg'
      })

      expect(statusCode).toBe(httpConstants.HTTP_STATUS_OK)
    })
  })
})
