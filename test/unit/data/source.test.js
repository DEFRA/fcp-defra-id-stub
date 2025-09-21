import { vi, describe, beforeEach, test, expect } from 'vitest'

vi.mock('../../../src/common/helpers/logging/logger.js', () => ({
  createLogger: () => ({
    error: vi.fn()
  })
}))
vi.mock('../../../src/config/config.js')
vi.mock('../../../src/data/schema.js')
vi.mock('../../../src/data/s3.js', () => ({
  getLatestS3Data: vi.fn()
}))
vi.mock('/data/test-file.json', () => ({
  default: {
    people: [{
      crn: 7777777777,
      firstName: 'Kevin',
      lastName: 'Jones',
      organisations: [{
        organisationId: '4444444',
        sbi: 666666666,
        name: 'Farm Space'
      }]
    }]
  }
}))

const { config } = await import('../../../src/config/config.js')
const { schema } = await import('../../../src/data/schema.js')
const { getLatestS3Data } = await import('../../../src/data/s3.js')

const clientId = '0000000-0000-0000-0000-000000000000'

const s3Data = {
  people: [{
    crn: 1234567890,
    firstName: 'John',
    lastName: 'Does',
    organisations: [{
      organisationId: '1234567',
      sbi: 123456789,
      name: 'Farm Inc.'
    }]
  }]
}

describe('getData', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
    getLatestS3Data.mockResolvedValue(null)
  })

  describe('basic auth with s3 disabled', () => {
    beforeEach(() => {
      config.get.mockImplementation((key) => {
        switch (key) {
          case 'aws':
            return {
              s3Enabled: false
            }
          case 'auth':
            return {
              source: 'basic'
            }
          default:
            return null
        }
      })
    })

    test('should not check S3 for data', async () => {
      const { getData } = await import('../../../src/data/source.js')

      await getData(clientId)

      expect(getLatestS3Data).not.toHaveBeenCalled()
    })

    test('returns default mock data', async () => {
      const { getData } = await import('../../../src/data/source.js')

      const result = await getData(clientId)

      expect(result.people.length).toBe(2)
      expect(result.people[0].crn).toBe(2100010101)
    })

    test('confirms that S3 data was not used', async () => {
      const { getData } = await import('../../../src/data/source.js')

      const result = await getData(clientId)

      expect(result.s3).toBe(false)
    })
  })

  describe('basic auth with s3 enabled', () => {
    beforeEach(() => {
      config.get.mockImplementation((key) => {
        switch (key) {
          case 'aws':
            return {
              s3Enabled: true
            }
          case 'auth':
            return {
              source: 'basic'
            }
          default:
            return null
        }
      })
    })

    test('checks S3 for data for clientId', async () => {
      getLatestS3Data.mockResolvedValue(s3Data.people)
      const { getData } = await import('../../../src/data/source.js')

      await getData(clientId)

      expect(getLatestS3Data).toHaveBeenCalledWith(clientId)
    })

    test('returns S3 data if match for clientId', async () => {
      getLatestS3Data.mockResolvedValue(s3Data.people)

      const { getData } = await import('../../../src/data/source.js')

      const result = await getData(clientId)

      expect(result.people.length).toBe(1)
      expect(result.people[0].crn).toBe(1234567890)
    })

    test('returns confirmation S3 data was found', async () => {
      getLatestS3Data.mockResolvedValue(s3Data.people)
      const { getData } = await import('../../../src/data/source.js')

      const result = await getData(clientId)

      expect(result.s3).toBe(true)
    })

    test('falls back to default data if no S3 data found', async () => {
      getLatestS3Data.mockResolvedValue(null)
      const { getData } = await import('../../../src/data/source.js')

      const result = await getData(clientId)

      expect(result.people.length).toBe(2)
      expect(result.people[0].crn).toBe(2100010101)
      expect(result.s3).toBe(false)
    })
  })

  describe('mock auth with s3 disabled', () => {
    beforeEach(() => {
      config.get.mockImplementation((key) => {
        switch (key) {
          case 'aws':
            return {
              s3Enabled: false
            }
          case 'auth':
            return {
              source: 'mock'
            }
          default:
            return null
        }
      })
    })

    test('should not check S3 for data', async () => {
      const { getData } = await import('../../../src/data/source.js')

      await getData(clientId)

      expect(getLatestS3Data).not.toHaveBeenCalled()
    })

    test('returns default mock data', async () => {
      const { getData } = await import('../../../src/data/source.js')

      const result = await getData(clientId)

      expect(result.people.length).toBe(2)
      expect(result.people[0].crn).toBe(2100010101)
    })

    test('confirms that S3 data was not used', async () => {
      const { getData } = await import('../../../src/data/source.js')

      const result = await getData(clientId)

      expect(result.s3).toBe(false)
    })
  })

  describe('mock auth with s3 enabled', () => {
    beforeEach(() => {
      config.get.mockImplementation((key) => {
        switch (key) {
          case 'aws':
            return {
              s3Enabled: true
            }
          case 'auth':
            return {
              source: 'mock'
            }
          default:
            return null
        }
      })
    })

    test('checks S3 for data for clientId', async () => {
      getLatestS3Data.mockResolvedValue(s3Data.people)
      const { getData } = await import('../../../src/data/source.js')

      await getData(clientId)

      expect(getLatestS3Data).toHaveBeenCalledWith(clientId)
    })

    test('returns S3 data if match for clientId', async () => {
      getLatestS3Data.mockResolvedValue(s3Data.people)

      const { getData } = await import('../../../src/data/source.js')

      const result = await getData(clientId)

      expect(result.people.length).toBe(1)
      expect(result.people[0].crn).toBe(1234567890)
    })

    test('returns confirmation S3 data was found', async () => {
      getLatestS3Data.mockResolvedValue(s3Data.people)
      const { getData } = await import('../../../src/data/source.js')

      const result = await getData(clientId)

      expect(result.s3).toBe(true)
    })

    test('falls back to default data if no S3 data found', async () => {
      getLatestS3Data.mockResolvedValue(null)
      const { getData } = await import('../../../src/data/source.js')

      const result = await getData(clientId)

      expect(result.people.length).toBe(2)
      expect(result.people[0].crn).toBe(2100010101)
      expect(result.s3).toBe(false)
    })
  })

  describe('override auth with s3 disabled', () => {
    beforeEach(() => {
      config.get.mockImplementation((key) => {
        switch (key) {
          case 'aws':
            return {
              s3Enabled: false
            }
          case 'auth':
            return {
              source: 'override',
              override: '9999999999:Jane:Smith:8888888:555555555:Farm Co.'
            }
          default:
            return null
        }
      })
    })

    test('should not check S3 for data', async () => {
      const { getData } = await import('../../../src/data/source.js')

      await getData(clientId)

      expect(getLatestS3Data).not.toHaveBeenCalled()
    })

    test('returns override data', async () => {
      const { getData } = await import('../../../src/data/source.js')

      const result = await getData(clientId)

      expect(result.people.length).toBe(1)
      expect(result.people[0].crn).toBe(9999999999)
    })

    test('confirms that S3 data was not used', async () => {
      const { getData } = await import('../../../src/data/source.js')

      const result = await getData(clientId)

      expect(result.s3).toBe(false)
    })
  })

  describe('mock auth with s3 enabled', () => {
    beforeEach(() => {
      config.get.mockImplementation((key) => {
        switch (key) {
          case 'aws':
            return {
              s3Enabled: true
            }
          case 'auth':
            return {
              source: 'override',
              override: '9999999999:Jane:Smith:8888888:555555555:Farm Co.'
            }
          default:
            return null
        }
      })
    })

    test('checks S3 for data for clientId', async () => {
      getLatestS3Data.mockResolvedValue(s3Data.people)
      const { getData } = await import('../../../src/data/source.js')

      await getData(clientId)

      expect(getLatestS3Data).toHaveBeenCalledWith(clientId)
    })

    test('returns S3 data if match for clientId', async () => {
      getLatestS3Data.mockResolvedValue(s3Data.people)

      const { getData } = await import('../../../src/data/source.js')

      const result = await getData(clientId)

      expect(result.people.length).toBe(1)
      expect(result.people[0].crn).toBe(1234567890)
    })

    test('returns confirmation S3 data was found', async () => {
      getLatestS3Data.mockResolvedValue(s3Data.people)
      const { getData } = await import('../../../src/data/source.js')

      const result = await getData(clientId)

      expect(result.s3).toBe(true)
    })

    test('falls back to override data if no S3 data found', async () => {
      getLatestS3Data.mockResolvedValue(null)
      const { getData } = await import('../../../src/data/source.js')

      const result = await getData(clientId)

      expect(result.people.length).toBe(1)
      expect(result.people[0].crn).toBe(9999999999)
      expect(result.s3).toBe(false)
    })
  })

  describe('file auth with s3 disabled', () => {
    beforeEach(() => {
      config.get.mockImplementation((key) => {
        switch (key) {
          case 'aws':
            return {
              s3Enabled: false
            }
          case 'auth':
            return {
              source: 'file',
              overrideFile: 'test-file.json'
            }
          default:
            return null
        }
      })
      schema.validate = vi.fn(() => ({ value: true }))
    })

    test('should not check S3 for data', async () => {
      const { getData } = await import('../../../src/data/source.js')

      await getData(clientId)

      expect(getLatestS3Data).not.toHaveBeenCalled()
    })

    test('returns file data if file valid', async () => {
      const { getData } = await import('../../../src/data/source.js')

      const result = await getData(clientId)

      expect(result.people.length).toBe(1)
      expect(result.people[0].crn).toBe(7777777777)
    })

    test('returns default mock data if file invalid', async () => {
      schema.validate = vi.fn(() => ({ error: 'invalid', message: 'invalid' }))

      const { getData } = await import('../../../src/data/source.js')

      const result = await getData(clientId)

      expect(result.people.length).toBe(2)
      expect(result.people[0].crn).toBe(2100010101)
    })

    test('confirms that S3 data was not used', async () => {
      const { getData } = await import('../../../src/data/source.js')

      const result = await getData(clientId)

      expect(result.s3).toBe(false)
    })
  })

  describe('mock auth with s3 enabled', () => {
    beforeEach(() => {
      config.get.mockImplementation((key) => {
        switch (key) {
          case 'aws':
            return {
              s3Enabled: true
            }
          case 'auth':
            return {
              source: 'file',
              overrideFile: 'test-file.json'
            }
          default:
            return null
        }
      })
    })

    test('checks S3 for data for clientId', async () => {
      getLatestS3Data.mockResolvedValue(s3Data.people)
      const { getData } = await import('../../../src/data/source.js')

      await getData(clientId)

      expect(getLatestS3Data).toHaveBeenCalledWith(clientId)
    })

    test('returns S3 data if match for clientId', async () => {
      getLatestS3Data.mockResolvedValue(s3Data.people)

      const { getData } = await import('../../../src/data/source.js')

      const result = await getData(clientId)

      expect(result.people.length).toBe(1)
      expect(result.people[0].crn).toBe(1234567890)
    })

    test('returns confirmation S3 data was found', async () => {
      getLatestS3Data.mockResolvedValue(s3Data.people)
      const { getData } = await import('../../../src/data/source.js')

      const result = await getData(clientId)

      expect(result.s3).toBe(true)
    })

    test('falls back to file data if no S3 data found', async () => {
      getLatestS3Data.mockResolvedValue(null)
      const { getData } = await import('../../../src/data/source.js')

      const result = await getData(clientId)

      expect(result.people.length).toBe(1)
      expect(result.people[0].crn).toBe(7777777777)
      expect(result.s3).toBe(false)
    })

    test('falls back to default data if file invalid and no S3 data found', async () => {
      getLatestS3Data.mockResolvedValue(null)
      schema.validate = vi.fn(() => ({ error: 'invalid', message: 'invalid' }))

      const { getData } = await import('../../../src/data/source.js')

      const result = await getData(clientId)

      expect(result.people.length).toBe(2)
      expect(result.people[0].crn).toBe(2100010101)
      expect(result.s3).toBe(false)
    })
  })
})
