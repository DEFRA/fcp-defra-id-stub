import path from 'node:path'
import fs from 'node:fs'

export function getStorageDirectory () {
  const directory = path.resolve(import.meta.dirname, '../../keys')

  if (!fs.existsSync(directory)) {
    fs.mkdirSync(directory, { recursive: true })
  }

  return directory
}
