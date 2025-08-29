import crypto from 'node:crypto'

const accessCodes = []

export function createAccessCode () {
  const code = crypto.randomBytes(16).toString('hex')
  accessCodes.push(code)
  return code
}
