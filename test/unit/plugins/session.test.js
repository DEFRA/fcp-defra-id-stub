import { describe, test, expect } from 'vitest'
import Yar from '@hapi/yar'
import { session } from '../../../src/plugins/session.js'

describe('session', () => {
  test('should return an object', () => {
    expect(session).toBeInstanceOf(Object)
  })

  test('should register the Yar plugin', () => {
    expect(session.plugin).toBe(Yar)
  })

  test('should set cookie name', () => {
    expect(session.options.name).toBe('fcp-defra-id-stub-session')
  })

  test('should set cookie options', () => {
    expect(session.options.cookieOptions).toBeInstanceOf(Object)
    expect(session.options.cookieOptions.password).toBe('this-must-be-at-least-32-characters-long')
    expect(session.options.cookieOptions.isSecure).toBe(false)
    expect(session.options.cookieOptions.isSameSite).toBe('Lax')
  })

  test('should not store blank cookies', () => {
    expect(session.options.storeBlank).toBe(false)
  })
})
