import Blankie from 'blankie'
import { describe, test, expect } from 'vitest'
import { contentSecurityPolicy } from '../../../src/plugins/content-security-policy.js'

describe('contentSecurityPolicy', () => {
  test('should return an object', () => {
    expect(contentSecurityPolicy).toBeInstanceOf(Object)
  })

  test('should register the Blankie plugin', () => {
    expect(contentSecurityPolicy.plugin).toBe(Blankie)
  })

  test('should restrict the font src to self', () => {
    expect(contentSecurityPolicy.options.fontSrc).toEqual(['self'])
  })

  test('should restrict the img src to self', () => {
    expect(contentSecurityPolicy.options.imgSrc).toEqual(['self'])
  })

  test('should restrict the script src to self and GOV.UK hash', () => {
    expect(contentSecurityPolicy.options.scriptSrc).toEqual(['self', "'sha256-GUQ5ad8JK5KmEWmROf3LZd9ge94daqNvd8xy9YS1iDw='"])
  })

  test('should restrict the style src to self', () => {
    expect(contentSecurityPolicy.options.styleSrc).toEqual(['self'])
  })

  test('should restrict the frame ancestors to self', () => {
    expect(contentSecurityPolicy.options.frameAncestors).toEqual(['self'])
  })

  test('should restrict the form action to self', () => {
    expect(contentSecurityPolicy.options.formAction).toEqual(['self'])
  })

  test('should generate nonces', () => {
    expect(contentSecurityPolicy.options.generateNonces).toBe(true)
  })
})
