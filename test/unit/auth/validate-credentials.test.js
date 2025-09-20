import { vi, describe, beforeEach, test, expect } from 'vitest'

vi.mock('../../../src/people/data.js')

const { getPerson } = await import('../../../src/people/data.js')

const { validateCredentials } = await import('../../../src/auth/validate-credentials.js')

const crn = 1234567890
const password = 'password123'
const clientId = '00000000-0000-0000-0000-000000000000'

describe('validateCredentials', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    getPerson.mockResolvedValue({ crn, firstName: 'John', lastName: 'Doe' })
  })

  test('should check if person exists for given CRN and clientId', async () => {
    await validateCredentials(crn, password, clientId)
    expect(getPerson).toHaveBeenCalledTimes(1)
    expect(getPerson).toHaveBeenCalledWith(crn, clientId)
  })

  test('should return true if CRN exists', async () => {
    const result = await validateCredentials(crn, password, clientId)
    expect(result).toBe(true)
  })

  test('should return false if CRN does not exist', async () => {
    getPerson.mockResolvedValue(null)

    const result = await validateCredentials('invalid-crn', password, clientId)
    expect(result).toBe(false)
  })
})
