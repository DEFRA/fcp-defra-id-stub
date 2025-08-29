import { defineConfig, configDefaults } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    include: ['**/test/**/*.test.js'],
    clearMocks: true,
    coverage: {
      provider: 'v8',
      reportsDirectory: './coverage',
      clean: false,
      reporter: ['text', 'lcov'],
      include: ['src/**'],
      exclude: [
        ...configDefaults.exclude,
        '**/test/**',
        'coverage',
        '.public',
        'postcss.config.js'
      ]
    }
  }
})
