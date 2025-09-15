import crypto from 'node:crypto'
import path from 'node:path'
import fs from 'node:fs'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const keysDir = path.resolve(__dirname, '../../keys')

const privateKeyPath = path.join(keysDir, 'private.pem')
const publicKeyPath = path.join(keysDir, 'public.pem')

let privateKey
let publicKey

if (fs.existsSync(privateKeyPath) && fs.existsSync(publicKeyPath)) {
  privateKey = fs.readFileSync(privateKeyPath, 'utf8')
  publicKey = fs.readFileSync(publicKeyPath, 'utf8')
} else {
  if (!fs.existsSync(keysDir)) {
    fs.mkdirSync(keysDir, { recursive: true })
  }
  const generated = crypto.generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: {
      type: 'spki',
      format: 'pem'
    },
    privateKeyEncoding: {
      type: 'pkcs8',
      format: 'pem'
    }
  })

  privateKey = generated.privateKey
  publicKey = generated.publicKey

  fs.writeFileSync(privateKeyPath, privateKey)
  fs.writeFileSync(publicKeyPath, publicKey)
}

const keyObject = crypto.createPublicKey(publicKey)
const jwk = keyObject.export({ format: 'jwk' })

export function getPrivateKey () {
  return privateKey
}

export function getPublicKeys () {
  return {
    keys: [
      {
        ...jwk,
        use: 'sig',
        kid: 'defra-id-stub-key',
        alg: 'RS256'
      }
    ]
  }
}
