import { describe, test, expect } from 'vitest'
import { getSafeRedirect } from '../../../src/utils/get-safe-redirect.js'

describe('getSafeRedirect', () => {
  test('should return provided redirect if it is a local route starting with "/"', () => {
    const redirect = '/location'
    const result = getSafeRedirect(redirect)
    expect(result).toBe(redirect)
  })

  test('should return "/" if redirect is not a local route', () => {
    const redirect = 'https://an.unsafe-location.com'
    const result = getSafeRedirect(redirect)
    expect(result).toBe('/')
  })

  test('should return "/" if redirect is a domain name only', () => {
    const redirect = 'an.unsafe-location.com'
    const result = getSafeRedirect(redirect)
    expect(result).toBe('/')
  })

  test('should return "/" if redirect is undefined', () => {
    const result = getSafeRedirect(undefined)
    expect(result).toBe('/')
  })

  test('should return "/" if redirect is null', () => {
    const result = getSafeRedirect(null)
    expect(result).toBe('/')
  })

  test('should return "/" if redirect starts with //', () => {
    const result = getSafeRedirect('//evil.com')
    expect(result).toBe('/')
  })

  test('should return "/" for backslash at start', () => {
    const result = getSafeRedirect(String.raw`\admin\payments`)
    expect(result).toBe('/')
  })
})
