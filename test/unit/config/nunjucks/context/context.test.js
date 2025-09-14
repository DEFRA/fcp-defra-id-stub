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

    describe('When webpack manifest file read succeeds', () => {
      let contextImport
      let contextResult

      beforeAll(async () => {
        contextImport = await import(
          '../../../../../src/config/nunjucks/context.js'
        )
      })

      beforeEach(() => {
        mockReadFileSync.mockReturnValue(`{
        "application.js": "javascripts/application.js",
        "stylesheets/application.scss": "stylesheets/application.css"
      }`)

        contextResult = contextImport.context(mockRequest)
      })

      test('Should provide expected context', () => {
        expect(contextResult).toEqual({
          assetPath: '/public/assets/rebrand',
          breadcrumbs: [],
          getAssetPath: expect.any(Function),
          serviceName: 'FCP Defra ID stub',
          serviceUrl: '/',
          s3Enabled: true
        })
      })

      describe('With valid asset path', () => {
        test('Should provide expected asset path', () => {
          expect(contextResult.getAssetPath('application.js')).toBe(
            '/public/javascripts/application.js'
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
        test('Should preserve existing context properties', () => {
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

          const result = contextImport.context(mockRequestWithContext)

          expect(result).toEqual({
            pageTitle: 'Custom Page Title',
            customProperty: 'existing value',
            assetPath: '/public/assets/rebrand',
            breadcrumbs: [],
            getAssetPath: expect.any(Function),
            s3Enabled: true,
            serviceName: 'FCP Defra ID stub',
            serviceUrl: '/'
          })
        })
      })
    })

    describe('When webpack manifest file read fails', () => {
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

      test('Should log that the Webpack Manifest file is not available', () => {
        expect(mockLoggerError).toHaveBeenCalledWith(
          'Webpack assets-manifest.json not found'
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

    describe('Webpack manifest file cache', () => {
      let contextImport

      beforeAll(async () => {
        contextImport = await import(
          '../../../../../src/config/nunjucks/context.js'
        )
      })

      beforeEach(() => {
        mockReadFileSync.mockReturnValue(`{
        "application.js": "javascripts/application.js",
        "stylesheets/application.scss": "stylesheets/application.css"
      }`)

        contextResult = contextImport.context(mockRequest)
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
          breadcrumbs: [],
          getAssetPath: expect.any(Function),
          s3Enabled: true,
          serviceName: 'FCP Defra ID stub',
          serviceUrl: '/'
        })
      })
    })
  })
})
