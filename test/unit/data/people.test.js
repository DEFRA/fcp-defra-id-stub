import { vi, describe, beforeEach, test, expect } from 'vitest'

vi.mock('../../../src/data/source.js', () => ({
  getData: vi.fn()
}))

vi.mock('../../../src/config/config.js')

const { getData } = await import('../../../src/data/source.js')
const { config } = await import('../../../src/config/config.js')

const crnUnknown = 9999999999
const clientId = '00000000-0000-0000-0000-000000000000'

const people = [
  { crn: 1234567890, firstName: 'John', lastName: 'Doe', organisations: [{ organisationId: '1234567', sbi: 123456789 }, { organisationId: '12345678', sbi: 223456790 }] },
  { crn: 1234567891, firstName: 'Jane', lastName: 'Smith', organisations: [{ organisationId: '1234569', sbi: 123456790 }] }
]

describe('getPerson', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    vi.resetModules()

    getData.mockResolvedValue({ people, s3: false })
    config.get.mockReturnValue('basic')
  })

  test('should request data for specific client Id', async () => {
    const { getPerson } = await import('../../../src/data/people.js')

    await getPerson(people[0].crn, clientId)

    expect(getData).toHaveBeenCalledTimes(1)
    expect(getData).toHaveBeenCalledWith(clientId)
  })

  test('should return first person if S3 disabled and basic auth', async () => {
    const { getPerson } = await import('../../../src/data/people.js')

    const result = await getPerson(crnUnknown, clientId)

    expect(result.firstName).toBe('John')
    expect(result.lastName).toBe('Doe')
  })

  test('should overwrite CRN if S3 disabled and basic auth', async () => {
    const { getPerson } = await import('../../../src/data/people.js')

    const result = await getPerson(crnUnknown, clientId)

    expect(result.crn).toBe(crnUnknown)
  })

  test('should return matching person for given CRN if S3 enabled and basic auth', async () => {
    const { getPerson } = await import('../../../src/data/people.js')

    const result = await getPerson(people[0].crn, clientId)

    expect(result).toEqual(people[0])
  })

  test('should return matching person for given CRN if S3 enabled and not basic auth', async () => {
    getData.mockResolvedValue({ people, s3: true })
    config.get.mockReturnValue('mock')

    const { getPerson } = await import('../../../src/data/people.js')

    const result = await getPerson(people[0].crn, clientId)

    expect(result).toEqual(people[0])
  })

  test('should return matching person for given CRN if S3 disabled and not basic auth', async () => {
    getData.mockResolvedValue({ people, s3: false })
    config.get.mockReturnValue('mock')

    const { getPerson } = await import('../../../src/data/people.js')

    const result = await getPerson(people[0].crn, clientId)

    expect(result).toEqual(people[0])
  })

  test('should return undefined if no matching person for given CRN and not basic auth and S3 enabled', async () => {
    getData.mockResolvedValue({ people, s3: true })
    config.get.mockReturnValue('mock')

    const { getPerson } = await import('../../../src/data/people.js')

    const result = await getPerson(crnUnknown, clientId)

    expect(result).toBeUndefined()
  })

  test('should return undefined if no matching person for given CRN and not basic auth and S3 disabled', async () => {
    getData.mockResolvedValue({ people, s3: false })
    config.get.mockReturnValue('mock')

    const { getPerson } = await import('../../../src/data/people.js')

    const result = await getPerson(crnUnknown, clientId)

    expect(result).toBeUndefined()
  })
})
