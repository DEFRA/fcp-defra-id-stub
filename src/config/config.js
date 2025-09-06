import convict from 'convict'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import convictFormatWithValidator from 'convict-format-with-validator'

const dirname = path.dirname(fileURLToPath(import.meta.url))

const oneWeekMs = 604800000

const isProduction = process.env.NODE_ENV === 'production'
const isTest = process.env.NODE_ENV === 'test'
const isDevelopment = process.env.NODE_ENV === 'development'

convict.addFormats(convictFormatWithValidator)

export const config = convict({
  serviceVersion: {
    doc: 'The service version, this variable is injected into your docker container in CDP environments',
    format: String,
    nullable: true,
    default: null,
    env: 'SERVICE_VERSION'
  },
  host: {
    doc: 'The IP address to bind',
    format: 'ipaddress',
    default: '0.0.0.0',
    env: 'HOST'
  },
  port: {
    doc: 'The port to bind.',
    format: 'port',
    default: 3007,
    env: 'PORT'
  },
  environment: {
    doc: 'The environment the application is running in',
    format: String,
    default: 'local',
    env: 'ENVIRONMENT'
  },
  staticCacheTimeout: {
    doc: 'Static cache timeout in milliseconds',
    format: Number,
    default: oneWeekMs,
    env: 'STATIC_CACHE_TIMEOUT'
  },
  serviceName: {
    doc: 'Applications Service Name',
    format: String,
    default: 'FCP Defra ID stub'
  },
  root: {
    doc: 'Project root',
    format: String,
    default: path.resolve(dirname, '../..')
  },
  assetPath: {
    doc: 'Asset path',
    format: String,
    default: '/public',
    env: 'ASSET_PATH'
  },
  isProduction: {
    doc: 'If this application running in the production environment',
    format: Boolean,
    default: isProduction
  },
  isDevelopment: {
    doc: 'If this application running in the development environment',
    format: Boolean,
    default: isDevelopment
  },
  isTest: {
    doc: 'If this application running in the test environment',
    format: Boolean,
    default: isTest
  },
  log: {
    enabled: {
      doc: 'Is logging enabled',
      format: Boolean,
      default: process.env.NODE_ENV !== 'test',
      env: 'LOG_ENABLED'
    },
    level: {
      doc: 'Logging level',
      format: ['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent'],
      default: 'warn',
      env: 'LOG_LEVEL'
    },
    format: {
      doc: 'Format to output logs in.',
      format: ['ecs', 'pino-pretty'],
      default: isProduction ? 'ecs' : 'pino-pretty',
      env: 'LOG_FORMAT'
    },
    redact: {
      doc: 'Log paths to redact',
      format: Array,
      default: isProduction
        ? ['req.headers.authorization', 'req.headers.cookie', 'res.headers']
        : []
    }
  },
  httpProxy: {
    doc: 'HTTP Proxy',
    format: String,
    nullable: true,
    default: null,
    env: 'HTTP_PROXY'
  },
  isSecureContextEnabled: {
    doc: 'Enable Secure Context',
    format: Boolean,
    default: isProduction,
    env: 'ENABLE_SECURE_CONTEXT'
  },
  isMetricsEnabled: {
    doc: 'Enable metrics reporting',
    format: Boolean,
    default: isProduction,
    env: 'ENABLE_METRICS'
  },
  nunjucks: {
    watch: {
      doc: 'Reload templates when they are changed.',
      format: Boolean,
      default: isDevelopment
    },
    noCache: {
      doc: 'Use a cache and recompile templates each time',
      format: Boolean,
      default: isDevelopment
    }
  },
  tracing: {
    header: {
      doc: 'Which header to track',
      format: String,
      default: 'x-cdp-request-id',
      env: 'TRACING_HEADER'
    }
  },
  cookie: {
    name: {
      doc: 'The name of the cookie to set',
      format: String,
      default: 'fcp-defra-id-stub-session',
      env: 'COOKIE_NAME'
    },
    password: {
      doc: 'The password used to encrypt the cookie',
      format: String,
      default: 'this-must-be-at-least-32-characters-long',
      env: 'COOKIE_PASSWORD'
    }
  },
  aws: {
    s3Enabled: {
      doc: 'Is S3 enabled for data storage',
      format: Boolean,
      default: false,
      env: 'AWS_S3_ENABLED'
    },
    region: {
      doc: 'AWS region',
      format: String,
      default: 'eu-west-2',
      env: 'AWS_REGION'
    },
    endpoint: {
      doc: 'AWS endpoint URL, for example to use with LocalStack',
      format: String,
      nullable: true,
      default: null,
      env: 'AWS_ENDPOINT_URL'
    },
    accessKeyId: {
      doc: 'AWS access key ID',
      format: String,
      nullable: true,
      default: null,
      env: 'AWS_ACCESS_KEY_ID'
    },
    secretAccessKey: {
      doc: 'AWS secret access key',
      format: String,
      nullable: true,
      default: null,
      env: 'AWS_SECRET_ACCESS_KEY'
    },
    s3Bucket: {
      doc: 'S3 bucket name, required if S3 is enabled',
      format: String,
      default: process.env.AWS_S3_ENABLED === 'true' ? null : '',
      env: 'AWS_S3_BUCKET'
    }
  },
  auth: {
    mode: {
      doc: 'The authentication mode to use',
      format: ['basic', 'mock'],
      default: 'basic',
      env: 'AUTH_MODE'
    },
    override: {
      doc: 'Override the available data to a specific customer and organisation in the format "crn:firstName:lastName:organisationId:sbi:organisationName"',
      format: function (val) {
        if (val === '') {
          return
        }

        const regex = /^(\d{10}):([a-zA-Z\s]+):([a-zA-Z\s]+):(\d+):(\d{9}):(.+)$/

        if (!regex.test(val)) {
          throw new Error('Must be in format "crn:firstName:lastName:organisationId:sbi:organisationName" where crn is 10 digits, firstName/lastName are letters and spaces, organisationId is a number, sbi is 9 digits, and organisationName can be anything')
        }
      },
      default: '',
      env: 'AUTH_OVERRIDE'
    },
    overrideFile: {
      doc: 'Path to the authentication file in json format.  Must be mounted at /data/*.json',
      format: function (val) {
        if (val === '') {
          return
        }

        const regex = /^.+\.json$/

        if (!regex.test(val)) {
          throw new Error('Path must be in format "*.json"')
        }
      },
      default: '',
      env: 'AUTH_OVERRIDE_FILE'
    }
  }
})

config.validate({ allowed: 'strict' })
