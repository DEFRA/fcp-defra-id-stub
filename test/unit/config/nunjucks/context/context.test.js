import { vi, describe, beforeEach, beforeAll, test, expect } from 'vitest'

const mockReadFileSync = vi.fn()
const mockLoggerError = vi.fn()

vi.mock('node:fs', async () => {
  const nodeFs = await import('node:fs')

  return {
    ...nodeFs,
    readFileSync: () => mockReadFileSync()
  }
})
vi.mock('../../../../../src/common/helpers/logging/logger.js', () => ({
  createLogger: () => ({ error: (...args) => mockLoggerError(...args) })
}))

describe('Context and cache', () => {
  beforeEach(() => {
    mockReadFileSync.mockReset()
    mockLoggerError.mockReset()
    vi.resetModules()
  })

  describe('Context', () => {
    const mockRequest = {
      path: '/',
      response: {
        source: {
          context: {}
        }
      }
    }

    describe('When Vite manifest file read succeeds', () => {
      let contextImport
      let contextResult

      beforeAll(async () => {
        contextImport = await import(
          '../../../../../src/config/nunjucks/context.js'
        )
      })

      beforeEach(async () => {
        mockReadFileSync.mockReturnValue(`{
        "src/client/javascript/application.js": {
          "file": "javascript/application.js",
          "isEntry": true,
          "css": ["stylesheets/application.css"]
        }
      }`)

        contextResult = await contextImport.context(mockRequest)
      })

      test('Should provide expected context', () => {
        expect(contextResult).toEqual({
          assetPath: '/public/assets/rebrand',
          getAssetPath: expect.any(Function),
          serviceName: 'FCP Defra ID stub',
          serviceUrl: '/',
          authSource: 'basic',
          s3Enabled: false,
          entraEnabled: false
        })
      })

      describe('With valid asset path', () => {
        test('Should provide expected asset path', () => {
          expect(contextResult.getAssetPath('application.js')).toBe(
            '/public/javascript/application.js'
          )
        })
      })

      describe('With invalid asset path', () => {
        test('Should provide expected asset', () => {
          expect(contextResult.getAssetPath('an-image.png')).toBe(
            '/public/an-image.png'
          )
        })
      })

      describe('With existing context', () => {
        test('Should preserve existing context properties', async () => {
          const mockRequestWithContext = {
            path: '/',
            response: {
              source: {
                context: {
                  pageTitle: 'Custom Page Title',
                  customProperty: 'existing value'
                }
              }
            }
          }

          const result = await contextImport.context(mockRequestWithContext)

          expect(result).toMatchObject({
            pageTitle: 'Custom Page Title',
            customProperty: 'existing value',
            assetPath: '/public/assets/rebrand',
            getAssetPath: expect.any(Function),
            authSource: 'basic',
            s3Enabled: false,
            entraEnabled: false,
            serviceName: 'FCP Defra ID stub',
            serviceUrl: '/'
          })
        })
      })
    })

    describe('When Vite manifest file read fails', () => {
      let contextImport

      beforeAll(async () => {
        contextImport = await import(
          '../../../../../src/config/nunjucks/context.js'
        )
      })

      beforeEach(() => {
        mockReadFileSync.mockReturnValue(new Error('File not found'))
        contextImport.context(mockRequest)
      })

      test('Should log that the Vite manifest file is not available', () => {
        expect(mockLoggerError).toHaveBeenCalledWith(
          'Vite assets-manifest.json not found'
        )
      })
    })
  })

  describe('Context cache', () => {
    const mockRequest = {
      path: '/',
      response: {
        source: {
          context: {}
        }
      }
    }
    let contextResult

    describe('Vite manifest file cache', () => {
      let contextImport

      beforeAll(async () => {
        contextImport = await import(
          '../../../../../src/config/nunjucks/context.js'
        )
      })

      beforeEach(async () => {
        mockReadFileSync.mockReturnValue(`{
        "src/client/javascript/application.js": {
          "file": "javascript/application.js",
          "isEntry": true,
          "css": ["stylesheets/application.css"]
        }
      }`)

        contextResult = await contextImport.context(mockRequest)
      })

      test('Should read file', () => {
        expect(mockReadFileSync).toHaveBeenCalled()
      })

      test('Should use cache', () => {
        expect(mockReadFileSync).not.toHaveBeenCalled()
      })

      test('Should provide expected context', () => {
        expect(contextResult).toEqual({
          assetPath: '/public/assets/rebrand',
          getAssetPath: expect.any(Function),
          authSource: 'basic',
          s3Enabled: false,
          entraEnabled: false,
          serviceName: 'FCP Defra ID stub',
          serviceUrl: '/'
        })
      })
    })
  })
})
