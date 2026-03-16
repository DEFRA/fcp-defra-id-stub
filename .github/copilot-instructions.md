# FCP Defra ID Stub - AI Coding Instructions

## Project Overview
Defra Identity authentication stub for Farming & Countryside Programme (FCP). Supports CRN/Password auth and optional Entra SSO. Returns signed JWT tokens consistent with Defra's `signupsigninsfi` policy.

## Architecture

### Tech Stack
- **Server**: Hapi.js 21.4 with ES modules (`type: "module"`)
- **Node**: >=24.12.0
- **Testing**: Vitest 3.2 with V8 coverage
- **Config**: Convict with environment-driven validation
- **Views**: Nunjucks with GovUK Frontend 5.10
- **Storage**: AWS S3 (LocalStack locally) + Redis (Entra mode only)
- **Auth**: Custom JWT generation + @hapi/bell (Entra) + @hapi/cookie

### Plugin Architecture
Hapi plugins registered in [src/server.js](src/server.js):
- `router` - Routes registration (conditional Entra routes)
- `session` - YAR session management
- `entra` - Entra OAuth strategy (only when `ENTRA_ENABLED=true`)
- `contentSecurityPolicy` - Blankie CSP with nonce support
- `headers` - Security headers
- `requestTracing`/`requestLogger` - Pino logging (ECS format in prod)

### Configuration
All config in [src/config/config.js](src/config/config.js) using Convict:
- Environment vars override defaults
- `isProduction`/`isDevelopment`/`isTest` computed from `NODE_ENV`
- Entra conditionally enabled via `entra.enabled` flag
- Redis cache only configured when Entra enabled

### Conditional Entra Mode
Key pattern: many features only activate when `config.get('entra.enabled')`:
```javascript
// Example from server.js
if (config.get('entra.enabled')) {
  plugins.splice(1, 0, Bell, Cookie, entra)
}
```
Always check Entra flag before adding Entra-specific code.

## Development Workflows

### Running Locally
```bash
# Build and run with Docker (preferred)
npm run docker:dev  # runs on port 3007 (configurable via FCP_DEFRA_ID_STUB_PORT)

# Local dev (watch mode, requires Redis/LocalStack)
npm run dev  # runs frontend:watch & server:watch concurrently
```

Set environment in `.env`:
```bash
AUTH_MODE=mock  # or 'basic' for real data
AUTH_OVERRIDE=9999999999:John:Watson:9999999:888888888:John Watson & Co.
AUTH_OVERRIDE_FILE=example.data.json  # custom data source
ENTRA_ENABLED=false  # toggle Entra OAuth
AWS_S3_ENABLED=true
```

### Testing
```bash
npm run docker:test  # run once with coverage
npm run docker:test:watch  # watch mode for TDD
npm test  # local (requires Docker services)
```

**Integration tests** use `server.inject()` pattern (see [test/integration/narrow/routes/entra-auth.test.js](test/integration/narrow/routes/entra-auth.test.js)):
```javascript
const { createServer } = await import('../../../../src/server.js')
let server = await createServer()
await server.initialize()  // NOT server.start() - keeps in-memory
const response = await server.inject({ url: '/path', auth: { strategy: 'entra', credentials } })
```

**Unit tests** mock dependencies with Vitest:
```javascript
const mockFn = vi.fn()
vi.mock('../module.js', () => ({ exportName: mockFn }))
```

Tests organized:
- `test/integration/narrow/` - isolated route/plugin tests
- `test/integration/local/` - full-stack LocalStack tests
- `test/unit/` - pure unit tests

### Linting
```bash
npm run lint  # neostandard (ecmaVersion: 2025)
npm run lint:fix
```

**All code must be linted with neostandard** - run `npm run lint:fix` before committing.

## Code Conventions

### Routes
Routes defined as arrays of objects in `src/routes/*.js`, registered via router plugin:
```javascript
export const myRoutes = [{
  method: 'GET',
  path: '/example',
  options: {
    auth: config.get('entra.enabled') ? 'entra' : false,  // conditional auth
    validate: { payload: Joi.object({ ... }) }
  },
  handler: (request, h) => { ... }
}]
```

### Session Management
Use YAR (via `request.yar`), not raw cookies:
```javascript
// Store data
request.yar.set('key', value)
// Retrieve
const data = request.yar.get('key')
```

Session keys defined in [src/config/constants/cache-keys.js](src/config/constants/cache-keys.js).

### Authentication Data
Mock data in [src/data/people.js](src/data/people.js) with S3 override support:
- `getPerson(crn)` - fetch person by CRN
- `getOrganisations(crn)` - list orgs for CRN
- Auth modes: `mock` (hardcoded), `basic` (uses S3/LocalStack), `s3` (real AWS)

### JWT Tokens
Token generation in [src/auth/token.js](src/auth/token.js):
- Signs with RS256 using keys from `keys/privatekey.pem`
- Token structure matches Defra's `signupsigninsfi` policy
- Includes `uniqueReference`, `customerReference`, `loa`, `roles`, `organisationId`

### Error Handling
Global error handler in [src/common/helpers/errors.js](src/common/helpers/errors.js):
- `catchAll` extension handles all errors
- Returns user-friendly error views

## Key Files
- [src/server.js](src/server.js) - Server creation, plugin registration
- [src/config/config.js](src/config/config.js) - All configuration
- [src/routes/auth.js](src/routes/auth.js) - CRN/Password authentication
- [src/routes/entra-auth.js](src/routes/entra-auth.js) - Entra OAuth routes
- [src/auth/token.js](src/auth/token.js) - JWT generation
- [vitest.config.js](vitest.config.js) - Test configuration

## Important Gotchas
1. **ES Modules**: Always use `import`/`export`, not `require`
3. **Test Isolation**: Integration tests use `server.initialize()`, not `start()`
4. **Module Mocking**: Mock before importing: `vi.mock()` then `await import()`
5. **Config Access**: Use `config.get('key.path')`, never direct `process.env`
6. **Route Auth**: Check `entra.enabled` before setting `auth: 'entra'` strategy
