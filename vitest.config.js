import { defineConfig, configDefaults } from 'vitest/config'

const sharedEnv = {
  NODE_ENV: 'test',
  ENTRA_ENABLED: 'true',
  ENTRA_WELL_KNOWN_URL: 'https://login.microsoftonline.com/test-tenant-id/v2.0/.well-known/openid-configuration',
  ENTRA_CLIENT_ID: 'test-client-id',
  ENTRA_CLIENT_SECRET: 'test-client-secret',
  ENTRA_REDIRECT_URL: 'http://localhost:3007/auth/sign-in-oidc',
  ENTRA_SIGN_OUT_REDIRECT_URL: 'http://localhost:3007',
  REDIS_HOST: '127.0.0.1',
  REDIS_PORT: '6379',
  USE_SINGLE_INSTANCE_CACHE: 'true'
}

const coverageConfig = {
  provider: 'v8',
  reportsDirectory: './coverage',
  clean: false,
  reporter: ['text', 'lcov'],
  include: ['src/**/*.js'],
  exclude: [
    ...configDefaults.exclude,
    '**/test/**',
    'coverage',
    '.public'
  ]
}

export default defineConfig({
  test: {
    globals: true,
    clearMocks: true,
    coverage: coverageConfig,
    projects: [
      {
        test: {
          name: 'unit',
          include: ['test/unit/**/*.test.js'],
          clearMocks: true,
          environment: 'node',
          env: {
            ...sharedEnv,
            ENTRA_ENABLED: 'false',
            REDIS_HOST: 'redis',
            REDIS_PORT: '6379'
          }
        }
      },
      {
        test: {
          name: 'integration',
          include: ['test/integration/narrow/**/*.test.js'],
          clearMocks: true,
          environment: 'node',
          env: sharedEnv
        }
      },
      {
        test: {
          name: 'local',
          include: ['test/integration/local/**/*.test.js'],
          clearMocks: true,
          environment: 'node',
          globalSetup: ['./test/setup/global-s3.js'],
          env: {
            ...sharedEnv,
            AWS_S3_ENABLED: 'true',
            AWS_ACCESS_KEY_ID: 'test',
            AWS_SECRET_ACCESS_KEY: 'test',
            AWS_S3_BUCKET: 'fcp-defra-id-stub-data',
            AWS_REGION: 'eu-west-2'
          }
        }
      }
    ]
  }
})
