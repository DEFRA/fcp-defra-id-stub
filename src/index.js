import process from 'node:process'
import { startServer } from './common/helpers/start-server.js'
import { createLogger } from './common/helpers/logging/logger.js'

await startServer()

process.on('unhandledRejection', (err) => {
  const logger = createLogger()
  logger.info('Unhandled rejection')
  logger.error(err)
  process.exitCode = 1
})
