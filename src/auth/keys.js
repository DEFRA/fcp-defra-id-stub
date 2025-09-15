import crypto from 'node:crypto'
import path from 'node:path'
import fs from 'node:fs'
import { getStorageDirectory } from './storage.js'

let privateKey
let publicKey
let jwk

export function createKeys () {
  const { privateKeyPath, publicKeyPath } = getKeyPaths()

  if (fs.existsSync(privateKeyPath) && fs.existsSync(publicKeyPath)) {
    privateKey = fs.readFileSync(privateKeyPath, 'utf8')
    publicKey = fs.readFileSync(publicKeyPath, 'utf8')
  } else {
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
  jwk = keyObject.export({ format: 'jwk' })
}

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

function getKeyPaths () {
  const storageDirectory = getStorageDirectory()

  const privateKeyPath = path.join(storageDirectory, 'private.pem')
  const publicKeyPath = path.join(storageDirectory, 'public.pem')

  return { privateKeyPath, publicKeyPath }
}
