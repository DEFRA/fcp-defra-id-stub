import { describe, test, expect } from 'vitest'

import { schema } from '../../../src/data/schema'

describe('data schema ', () => {
  test('should pass if a valid schema is provided with one person', () => {
    const data = {
      people: [
        {
          crn: 1234567890,
          firstName: 'John',
          lastName: 'Doe',
          organisations: [
            {
              organisationId: '1234567',
              sbi: 123456789,
              name: 'Farms Inc.'
            }
          ]
        }
      ]
    }

    const result = schema.validate(data)
    expect(result.error).toBeUndefined()
  })

  test('should pass if a valid schema is provided with no organisations', () => {
    const data = {
      people: [
        {
          crn: 1234567890,
          firstName: 'John',
          lastName: 'Doe',
          organisations: []
        }
      ]
    }

    const result = schema.validate(data)
    expect(result.error).toBeUndefined()
  })

  test('should pass if a valid schema is provided with multiple organisations', () => {
    const data = {
      people: [
        {
          crn: 1234567890,
          firstName: 'John',
          lastName: 'Doe',
          organisations: [
            {
              organisationId: '1234567',
              sbi: 123456789,
              name: 'Farms Inc.'
            },
            {
              organisationId: '1234568',
              sbi: 123456780,
              name: 'More Farms Inc.'
            }
          ]
        }
      ]
    }

    const result = schema.validate(data)
    expect(result.error).toBeUndefined()
  })

  test('should pass if a valid schema is provided with multiple people', () => {
    const data = {
      people: [
        {
          crn: 1234567890,
          firstName: 'John',
          lastName: 'Doe',
          organisations: [
            {
              organisationId: '1234567',
              sbi: 123456789,
              name: 'Farms Inc.'
            }
          ]
        },
        {
          crn: 1234567891,
          firstName: 'Jane',
          lastName: 'Smith',
          organisations: [
            {
              organisationId: '1234568',
              sbi: 123456790,
              name: 'Farms Inc.'
            }
          ]
        }
      ]
    }

    const result = schema.validate(data)
    expect(result.error).toBeUndefined()
  })

  test('should pass if a valid schema is provided with no people', () => {
    const data = {
      people: []
    }

    const result = schema.validate(data)
    expect(result.error).toBeUndefined()
  })

  test('should fail if crn is missing', () => {
    const data = {
      people: [
        {
          firstName: 'John',
          lastName: 'Doe',
          organisations: [
            {
              organisationId: '1234567',
              sbi: 123456789,
              name: 'Farms Inc.'
            }
          ]
        }
      ]
    }

    const result = schema.validate(data)
    expect(result.error).toBeDefined()
    expect(result.error.message).toBe('"people[0].crn" is required')
  })

  test('should fail if firstName is missing', () => {
    const data = {
      people: [
        {
          crn: 1234567890,
          lastName: 'Doe',
          organisations: [
            {
              organisationId: '1234567',
              sbi: 123456789,
              name: 'Farms Inc.'
            }
          ]
        }
      ]
    }

    const result = schema.validate(data)
    expect(result.error).toBeDefined()
    expect(result.error.message).toBe('"people[0].firstName" is required')
  })

  test('should fail if lastName is missing', () => {
    const data = {
      people: [
        {
          crn: 1234567890,
          firstName: 'John',
          organisations: [
            {
              organisationId: '1234567',
              sbi: 123456789,
              name: 'Farms Inc.'
            }
          ]
        }
      ]
    }

    const result = schema.validate(data)
    expect(result.error).toBeDefined()
    expect(result.error.message).toBe('"people[0].lastName" is required')
  })

  test('should fail if organisations is missing', () => {
    const data = {
      people: [
        {
          crn: 1234567890,
          firstName: 'John',
          lastName: 'Doe'
        }
      ]
    }

    const result = schema.validate(data)
    expect(result.error).toBeDefined()
    expect(result.error.message).toBe('"people[0].organisations" is required')
  })

  test('should fail if organisationId is missing', () => {
    const data = {
      people: [
        {
          crn: 1234567890,
          firstName: 'John',
          lastName: 'Doe',
          organisations: [
            {
              sbi: 123456789,
              name: 'Farms Inc.'
            }
          ]
        }
      ]
    }

    const result = schema.validate(data)
    expect(result.error).toBeDefined()
    expect(result.error.message).toBe('"people[0].organisations[0].organisationId" is required')
  })

  test('should fail if sbi is missing', () => {
    const data = {
      people: [
        {
          crn: 1234567890,
          firstName: 'John',
          lastName: 'Doe',
          organisations: [
            {
              organisationId: '1234567',
              name: 'Farms Inc.'
            }
          ]
        }
      ]
    }

    const result = schema.validate(data)
    expect(result.error).toBeDefined()
    expect(result.error.message).toBe('"people[0].organisations[0].sbi" is required')
  })

  test('should fail if name is missing', () => {
    const data = {
      people: [
        {
          crn: 1234567890,
          firstName: 'John',
          lastName: 'Doe',
          organisations: [
            {
              organisationId: '1234567',
              sbi: 123456789
            }
          ]
        }
      ]
    }

    const result = schema.validate(data)
    expect(result.error).toBeDefined()
    expect(result.error.message).toBe('"people[0].organisations[0].name" is required')
  })

  test('should fail if crn is not a number', () => {
    const data = {
      people: [
        {
          crn: 'not-a-number',
          firstName: 'John',
          lastName: 'Doe',
          organisations: [
            {
              organisationId: '1234567',
              sbi: 123456789,
              name: 'Farms Inc.'
            }
          ]
        }
      ]
    }

    const result = schema.validate(data)
    expect(result.error).toBeDefined()
    expect(result.error.message).toBe('"people[0].crn" must be a number')
  })

  test('should fail if firstName is not a string', () => {
    const data = {
      people: [
        {
          crn: 1234567890,
          firstName: 12345,
          lastName: 'Doe',
          organisations: [
            {
              organisationId: '1234567',
              sbi: 123456789,
              name: 'Farms Inc.'
            }
          ]
        }
      ]
    }

    const result = schema.validate(data)
    expect(result.error).toBeDefined()
    expect(result.error.message).toBe('"people[0].firstName" must be a string')
  })

  test('should fail if lastName is not a string', () => {
    const data = {
      people: [
        {
          crn: 1234567890,
          firstName: 'John',
          lastName: 12345,
          organisations: [
            {
              organisationId: '1234567',
              sbi: 123456789,
              name: 'Farms Inc.'
            }
          ]
        }
      ]
    }

    const result = schema.validate(data)
    expect(result.error).toBeDefined()
    expect(result.error.message).toBe('"people[0].lastName" must be a string')
  })

  test('should fail if organisations is not an array', () => {
    const data = {
      people: [
        {
          crn: 1234567890,
          firstName: 'John',
          lastName: 'Doe',
          organisations: {}
        }
      ]
    }

    const result = schema.validate(data)
    expect(result.error).toBeDefined()
    expect(result.error.message).toBe('"people[0].organisations" must be an array')
  })

  test('should fail if people is not an array', () => {
    const data = {
      people: {}
    }

    const result = schema.validate(data)
    expect(result.error).toBeDefined()
    expect(result.error.message).toBe('"people" must be an array')
  })

  test('should fail if organisations is not an array of objects', () => {
    const data = {
      people: [
        {
          crn: 1234567890,
          firstName: 'John',
          lastName: 'Doe',
          organisations: [1, 2]
        }
      ]
    }

    const result = schema.validate(data)
    expect(result.error).toBeDefined()
    expect(result.error.message).toBe('"people[0].organisations[0]" must be of type object')
  })

  test('should fail if people is not an array of objects', () => {
    const data = {
      people: [1, 2]
    }

    const result = schema.validate(data)
    expect(result.error).toBeDefined()
    expect(result.error.message).toBe('"people[0]" must be of type object')
  })

  test('should fail if organisationId is not a string', () => {
    const data = {
      people: [
        {
          crn: 1234567890,
          firstName: 'John',
          lastName: 'Doe',
          organisations: [
            {
              organisationId: 1234567,
              sbi: 123456789,
              name: 'Farms Inc.'
            }
          ]
        }
      ]
    }

    const result = schema.validate(data)
    expect(result.error).toBeDefined()
    expect(result.error.message).toBe('"people[0].organisations[0].organisationId" must be a string')
  })

  test('should fail if sbi is not a number', () => {
    const data = {
      people: [
        {
          crn: 1234567890,
          firstName: 'John',
          lastName: 'Doe',
          organisations: [
            {
              organisationId: '1234567',
              sbi: 'not-a-number',
              name: 'Farms Inc.'
            }
          ]
        }
      ]
    }

    const result = schema.validate(data)
    expect(result.error).toBeDefined()
    expect(result.error.message).toBe('"people[0].organisations[0].sbi" must be a number')
  })

  test('should fail if name is not a string', () => {
    const data = {
      people: [
        {
          crn: 1234567890,
          firstName: 'John',
          lastName: 'Doe',
          organisations: [
            {
              organisationId: '1234567',
              sbi: 123456789,
              name: 12345
            }
          ]
        }
      ]
    }

    const result = schema.validate(data)
    expect(result.error).toBeDefined()
    expect(result.error.message).toBe('"people[0].organisations[0].name" must be a string')
  })

  test('should fail if data is not an object', () => {
    const data = 'not-an-object'

    const result = schema.validate(data)
    expect(result.error).toBeDefined()
    expect(result.error.message).toBe('"value" must be of type object')
  })

  test('should fail if data is empty', () => {
    const data = {}

    const result = schema.validate(data)
    expect(result.error).toBeDefined()
    expect(result.error.message).toBe('"people" is required')
  })

  test('should fail if data is null', () => {
    const data = null

    const result = schema.validate(data)
    expect(result.error).toBeDefined()
    expect(result.error.message).toBe('"value" must be of type object')
  })

  test('should fail if data is not an object', () => {
    const data = 'not-an-object'

    const result = schema.validate(data)
    expect(result.error).toBeDefined()
    expect(result.error.message).toBe('"value" must be of type object')
  })

  test('should fail if data is empty', () => {
    const data = {}

    const result = schema.validate(data)
    expect(result.error).toBeDefined()
    expect(result.error.message).toBe('"people" is required')
  })

  test('should fail if additional properties are present at the root level', () => {
    const data = {
      people: [],
      extraProperty: 'not-allowed'
    }

    const result = schema.validate(data)
    expect(result.error).toBeDefined()
    expect(result.error.message).toBe('"extraProperty" is not allowed')
  })

  test('should fail if additional properties are present in a person object', () => {
    const data = {
      people: [
        {
          crn: 1234567890,
          firstName: 'John',
          lastName: 'Doe',
          organisations: [],
          extraProperty: 'not-allowed'
        }
      ]
    }

    const result = schema.validate(data)
    expect(result.error).toBeDefined()
    expect(result.error.message).toBe('"people[0].extraProperty" is not allowed')
  })

  test('should fail if additional properties are present in an organisation object', () => {
    const data = {
      people: [
        {
          crn: 1234567890,
          firstName: 'John',
          lastName: 'Doe',
          organisations: [
            {
              organisationId: '1234567',
              sbi: 123456789,
              name: 'Farms Inc.',
              extraProperty: 'not-allowed'
            }
          ]
        }
      ]
    }

    const result = schema.validate(data)
    expect(result.error).toBeDefined()
    expect(result.error.message).toBe('"people[0].organisations[0].extraProperty" is not allowed')
  })
})
