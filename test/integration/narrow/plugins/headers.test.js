import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest'

const { createServer } = await import('../../../../src/server.js')

let server

describe('headers', () => {
  beforeEach(async () => {
    vi.clearAllMocks()

    server = await createServer()
    await server.initialize()
  })

  afterEach(async () => {
    if (server) {
      await server.stop()
    }
  })

  test('should prevent MIME sniffing attacks ', async () => {
    const response = await server.inject({
      url: '/'
    })
    expect(response.headers['x-content-type-options']).toBe('nosniff')
  })

  test('should prevent clickjacking attacks', async () => {
    const response = await server.inject({
      url: '/'
    })
    expect(response.headers['x-frame-options']).toBe('DENY')
  })

  test('should prevent robots from indexing pages', async () => {
    const response = await server.inject({
      url: '/'
    })
    expect(response.headers['x-robots-tag']).toBe('noindex, nofollow')
  })

  test('should prevent cross-site scripting attacks', async () => {
    const response = await server.inject({
      url: '/'
    })
    expect(response.headers['x-xss-protection']).toBe('1; mode=block')
  })

  test('should ensure pages can only interact with the same origin', async () => {
    const response = await server.inject({
      url: '/'
    })
    expect(response.headers['cross-origin-opener-policy']).toBe('same-origin')
  })

  test('should ensure pages can only be embedded by the same origin', async () => {
    const response = await server.inject({
      url: '/'
    })
    expect(response.headers['cross-origin-embedder-policy']).toBe('require-corp')
  })

  test('should ensure pages can only interact with the same site', async () => {
    const response = await server.inject({
      url: '/'
    })
    expect(response.headers['cross-origin-resource-policy']).toBe('same-site')
  })

  test('should ensure no referrer information is leaked', async () => {
    const response = await server.inject({
      url: '/'
    })
    expect(response.headers['referrer-policy']).toBe('same-origin')
  })

  test('should restrict permissions for sensitive features', async () => {
    const response = await server.inject({
      url: '/'
    })
    expect(response.headers['permissions-policy']).toBe('camera=(), geolocation=(), magnetometer=(), microphone=(), payment=(), usb=()')
  })

  describe('404 error responses', () => {
    test('should prevent MIME sniffing attacks on 404 pages', async () => {
      const response = await server.inject({
        url: '/non-existent-path'
      })
      expect(response.statusCode).toBe(404)
      expect(response.headers['x-content-type-options']).toBe('nosniff')
    })

    test('should prevent clickjacking attacks on 404 pages', async () => {
      const response = await server.inject({
        url: '/non-existent-path'
      })
      expect(response.statusCode).toBe(404)
      expect(response.headers['x-frame-options']).toBe('DENY')
    })

    test('should prevent robots from indexing 404 pages', async () => {
      const response = await server.inject({
        url: '/non-existent-path'
      })
      expect(response.statusCode).toBe(404)
      expect(response.headers['x-robots-tag']).toBe('noindex, nofollow')
    })

    test('should prevent cross-site scripting attacks on 404 pages', async () => {
      const response = await server.inject({
        url: '/non-existent-path'
      })
      expect(response.statusCode).toBe(404)
      expect(response.headers['x-xss-protection']).toBe('1; mode=block')
    })

    test('should ensure 404 pages can only interact with the same origin', async () => {
      const response = await server.inject({
        url: '/non-existent-path'
      })
      expect(response.statusCode).toBe(404)
      expect(response.headers['cross-origin-opener-policy']).toBe('same-origin')
    })

    test('should ensure 404 pages can only be embedded by the same origin', async () => {
      const response = await server.inject({
        url: '/non-existent-path'
      })
      expect(response.statusCode).toBe(404)
      expect(response.headers['cross-origin-embedder-policy']).toBe('require-corp')
    })

    test('should ensure 404 pages can only interact with the same site', async () => {
      const response = await server.inject({
        url: '/non-existent-path'
      })
      expect(response.statusCode).toBe(404)
      expect(response.headers['cross-origin-resource-policy']).toBe('same-site')
    })

    test('should ensure 404 pages only send referrer information to the same origin', async () => {
      const response = await server.inject({
        url: '/non-existent-path'
      })
      expect(response.statusCode).toBe(404)
      expect(response.headers['referrer-policy']).toBe('same-origin')
    })

    test('should restrict permissions for sensitive features on 404 pages', async () => {
      const response = await server.inject({
        url: '/non-existent-path'
      })
      expect(response.statusCode).toBe(404)
      expect(response.headers['permissions-policy']).toBe('camera=(), geolocation=(), magnetometer=(), microphone=(), payment=(), usb=()')
    })

    test('should enforce HTTPS with strict transport security on 404 pages', async () => {
      const response = await server.inject({
        url: '/non-existent-path'
      })
      expect(response.statusCode).toBe(404)
      expect(response.headers['strict-transport-security']).toBe('max-age=31536000; includeSubDomains; preload')
    })

    test('should prevent file downloads from opening in 404 pages', async () => {
      const response = await server.inject({
        url: '/non-existent-path'
      })
      expect(response.statusCode).toBe(404)
      expect(response.headers['x-download-options']).toBe('noopen')
    })
  })
})
