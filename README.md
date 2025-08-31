# fcp-defra-id-stub

![Build](https://github.com/defra/fcp-defra-id-stub/actions/workflows/publish.yml/badge.svg)
[![Quality Gate Status](https://sonarcloud.io/api/project_badges/measure?project=DEFRA_fcp-defra-id-stub&metric=alert_status)](https://sonarcloud.io/summary/new_code?id=DEFRA_fcp-defra-id-stub)
[![Bugs](https://sonarcloud.io/api/project_badges/measure?project=DEFRA_fcp-defra-id-stub&metric=bugs)](https://sonarcloud.io/summary/new_code?id=DEFRA_fcp-defra-id-stub)
[![Code Smells](https://sonarcloud.io/api/project_badges/measure?project=DEFRA_fcp-defra-id-stub&metric=code_smells)](https://sonarcloud.io/summary/new_code?id=DEFRA_fcp-defra-id-stub)
[![Duplicated Lines (%)](https://sonarcloud.io/api/project_badges/measure?project=DEFRA_fcp-defra-id-stub&metric=duplicated_lines_density)](https://sonarcloud.io/summary/new_code?id=DEFRA_fcp-defra-id-stub)
[![Coverage](https://sonarcloud.io/api/project_badges/measure?project=DEFRA_fcp-defra-id-stub&metric=coverage)](https://sonarcloud.io/summary/new_code?id=DEFRA_fcp-defra-id-stub)

Defra Identity stub for Farming and Countryside Programme (FCP).

There are two existing Defra Identity stubs:

- [Official Defra ID stub](#)
- [CDP Defra ID stub](https://github.com/DEFRA/cdp-defra-id-stub)

Neither of these support the `signupsigninsfi` policy used in FCP.

This policy enables authentication with a CRN/Password combination and changes the content of the default Defra ID token.

To enable teams working within FCP develop and test against Defra ID this stub has been created.

> NOTE: this stub is still a work in progress.  See below for a list of known limitations. Feedback and issues welcome.

## Features

- CRN/Password authentication
- Exposes all Defra ID endpoints including well-known endpoints
- Organisation selection
- Signed JWT token generation consistent with `signupsigninsfi` policy
- Token exchange from authorisation
- Refresh token exchange
- Single Sign-On (SSO) support
- Sign out including ending SSO session
- Customisable people and organisation data (See below)
- Supports all Defra ID authentication behaviours including:
  - Force re-authentication with `prompt=login` parameter
  - Bypass organisation selection with `relationshipId=<OrganisationId>` parameter
  - Force organisation selection with `forceReselection=true` parameter

### Current Limitations

As this is early development, there are some known limitations to be aware of that will be addressed in future releases:

- Private/public key pairings are not retained across stub restarts.  If your application is verifying JWTs against the public key, this validation will fail if the stub is restarted following token reissue.

- Session data is not persisted across stub restarts.  Token exchange, SSO and refresh tokens will be invalid if the stub is restarted.

- Reselection an organisation mid session will replace the `roles` array property of the JWT entirely.  The real Defra ID will append the new organisation to this array.

- Mock people and organisation data is limited.  However this can be overridden by the customisation options described below.

- Unlike real Defra ID, does not automatically bypass organisation selection if CRN is associated with only one organisation.

- Does not handle CRNs associated with no organisations.  The real Defra ID will block the user completing authentication.

- UI content does not fully mirror Defra ID.  However note there are no plans to introduce the legacy GOV.UK branding currently used by Defra ID.

- Request content validation is limited and therefore so is feedback on invalid requests.

- General code quality and test coverage.

## Customising people and organisation data

The stub supports four data options for configuring people and organisation data.

> NOTE: That with all options, the password value is not validated.

The default "Basic" approach will fit the needs of most development and testing scenarios.  

However, depending on your local setup you may need the Defra ID token content to align to other mock/real datasets you're using.

For example, if you are making a subsequent call through the Data Access Layer (DAL), you may need different organisation data than the stub provides.

### Basic (Default)

This option allows authentication of any 10 digit CRN to be successful.  Organisation data is from a consistent mock dataset of three organisations.  

Token content will align to the provided CRN and the selected organisation.

### Mock

The option works the same as basic other than only a predefined list of mock CRNs are accepted. 

Each of the CRNs are associated with varying mock organisations.

This allows for more variation of automated tests and scenarios.

Current mock data available can be viewed [here](./src/customers/data.json).

> NOTE: as per limitations above, mock data is limited.

To enable this option set the `AUTH_MODE` environment variable to `mock`.

### Simple override

This option allows for a simple override of the default behaviour by providing a single CRN and organisation as a string environment variable.

The provided CRN will be the only one permitted to authenticate and the provided organisation will be the only one available for selection.

To enable this option set the `AUTH_OVERRIDE` environment variable to a string in the format `crn:firstName:lastName:organisationId:sbi:organisationName`.

Where crn is 10 digits, firstName/lastName are letters and spaces, organisationId is a number, sbi is 9 digits, and organisationName can be anything

This is validated against the following regular expression

```javascript
/^(\d{10}):([a-zA-Z\s]+):([a-zA-Z\s]+):(\d+):(\d{9}):(.+)$/
```

If this environment variable is provided, it will take precedence over Basic and Mock modes.

### Detailed override

To provide a comprehensive set of CRNs and associated organisation data, a JSON formatted file can be mounted to the `/data/` directory.

The data must be in the format of the below example with as many people and associated organisations as desired.

```json
{
  "people": [
    {
      "crn": 2100010101,
      "firstName": "Andrew",
      "lastName": "Farmer",
      "organisations": [
        {
          "organisationId": "5900001",
          "sbi": 110100101,
          "name": "Farms Ltd"
        },
        {
          "organisationId": "5900002",
          "sbi": 110100102,
          "name": "Andrew Farmer"
        },
        {
          "organisationId": "5900003",
          "sbi": 110100103,
          "name": "A & F Land Management"
        }
      ]
    },
    {
      "crn": 2100010102,
      "firstName": "Sarah",
      "lastName": "Plumber",
      "organisations": [
        {
          "organisationId": "5900001",
          "sbi": 110100101,
          "name": "Farms Ltd"
        },
        {
          "organisationId": "5900002",
          "sbi": 110100103,
          "name": "Sarah Plumber"
        }
      ]
    }
  ]
}
```

To enable this option set the `AUTH_OVERRIDE_FILE` environment variable to the filename of the JSON file within the directory.

For example: `AUTH_OVERRIDE_FILE: auth-override.json`

If provided, this option will take precedence over the above methods.

## Using the stub locally

### Docker

This application is intended to be run in a Docker container to ensure consistency across environments.

Docker can be installed from [Docker's official website](https://docs.docker.com/get-docker/).

### Run from source

After cloning the repository, run the below commands to start the container.

By default, the application will run on port 3007.  However, this can be overridden by setting the `FCP_DEFRA_ID_STUB_PORT` environment variable.

```bash
# Build the image
docker compose build

# Run the application
npm run docker:dev
```

A `.env` will automatically be read by the Docker compose files allowing to customise the data available.

```
AUTH_MODE=mock
AUTH_OVERRIDE=9999999999:John:Watson:9999999:888888888:John Watson & Co.
AUTH_OVERRIDE_FILE=example.data.json
```

> NOTE: if providing a different custom, file the [`compose.override.yml`](./compose.override.yml) file volume may need updating.

### Docker

Images of this stub are available in DockerHub, [defradigital/fcp-defra-id-stub](https://hub.docker.com/repository/docker/defradigital/fcp-defra-id-stub).

```bash
# Pull the latest image
docker pull defradigital/fcp-defra-id-stub

docker run -p 3007:3007 defradigital/fcp-defra-id-stub
```

By default, the application will run on port 3007, however this can be overridden by setting the `PORT` environment variable.

```bash
docker run -p 3008:3008 -e PORT=3008 defradigital/fcp-defra-id-stub
```

### Docker Compose

The image can be added to your application's existing Docker Compose file.

```yaml
fcp-defra-id-stub:
  image: defradigital/fcp-defra-id-stub
  environment:
    PORT: 3007
    AUTH_MODE: ${AUTH_MODE}
    AUTH_OVERRIDE: ${AUTH_OVERRIDE}
    AUTH_OVERRIDE_FILE: ${AUTH_OVERRIDE_FILE}
  ports:
    - "3007:3007"
  healthcheck:
    test: ["CMD", "curl", "-f", "http://localhost:3007/health"]
    interval: 1m30s
    timeout: 30s
    retries: 5
    start_period: 3s
```

## Using the stub in your application

The stub has the same endpoints and expectations as the real Defra ID.

The simplest way to switch between the stub is to update your application to use the well known endpoint of the stub.

For example, let's say your application has the following environment variables for a real Defra ID instance.

```
DEFRA_ID_WELL_KNOWN_URL=https://your-account.cpdev.cui.defra.gov.uk/idphub/b2c/b2c_1a_cui_cpdev_signupsigninsfi/.well-known/openid-configuration
DEFRA_ID_CLIENT_ID=<your Client ID GUID>
DEFRA_ID_CLIENT_SECRET=<Your Client Secret>
DEFRA_ID_SERVICE_ID=<your Service ID GUID>
DEFRA_ID_POLICY=b2c_1a_cui_cpdev_signupsigninsfi
```

Only the first environment variable needs to change, to repoint to the stub.

```
DEFRA_ID_WELL_KNOWN_URL=https://fcp-defra-id-stub:3007/idphub/b2c/b2c_1a_cui_cpdev_signupsigninsfi/.well-known/openid-configuration
DEFRA_ID_CLIENT_ID=<your Client ID GUID>
DEFRA_ID_CLIENT_SECRET=<Your Client Secret>
DEFRA_ID_SERVICE_ID=<your Service ID GUID>
DEFRA_ID_POLICY=b2c_1a_cui_cpdev_signupsigninsfi
```

**IMPORTANT** if not running in the same Docker network as your app, then the host must be set as `host.docker.internal` to enable the containerised app access localhost.

```
DEFRA_ID_WELL_KNOWN_URL=https://host.docker.internal:3007/idphub/b2c/b2c_1a_cui_cpdev_signupsigninsfi/.well-known/openid-configuration
DEFRA_ID_CLIENT_ID=<your Client ID GUID>
DEFRA_ID_CLIENT_SECRET=<Your Client Secret>
DEFRA_ID_SERVICE_ID=<your Service ID GUID>
DEFRA_ID_POLICY=b2c_1a_cui_cpdev_signupsigninsfi
```

Example Docker Compose file

```yaml
services:
  my-app:
    image: my-app
    ports:
      - "3000:3000"
    environment:
      DEFRA_ID_WELL_KNOWN_URL: ${DEFRA_ID_WELL_KNOWN_URL}
      DEFRA_ID_CLIENT_ID: ${DEFRA_ID_CLIENT_ID}
      DEFRA_ID_CLIENT_SECRET: ${DEFRA_ID_CLIENT_SECRET}
      DEFRA_ID_SERVICE_ID: ${DEFRA_ID_SERVICE_ID}
      DEFRA_ID_POLICY: ${DEFRA_ID_POLICY}
    depends_on:
      fcp-defra-id-stub:
        condition: service_healthy

  fcp-defra-id-stub:
    image: defradigital/fcp-defra-id-stub
    ports:
      - "3007:3007"
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3007/health"]
      interval: 1m30s
      timeout: 30s
      retries: 5
      start_period: 3s
```

### FCP Defra ID example

The [FCP Defra ID example repository](https://github.com/DEFRA/fcp-defra-id-example) includes the stub as part of it's Docker Compose setup for optional use.

## CDP environments

The stub is deployed to all CDP environments and can be used by any application.

> Note: the deployed version uses the Basic authentication setup where any CRN is accepted and a basic list of organisations is provided.

- [https://fcp-defra-id-stub.dev.cdp-int.defra.cloud](https://fcp-defra-id-stub.dev.cdp-int.defra.cloud)
- [https://fcp-defra-id-stub.test.cdp-int.defra.cloud](https://fcp-defra-id-stub.test.cdp-int.defra.cloud)
- [https://fcp-defra-id-stub.perf-test.cdp-int.defra.cloud](https://fcp-defra-id-stub.perf-test.cdp-int.defra.cloud)
- [https://fcp-defra-id-stub.prd.cdp-int.defra.cloud](https://fcp-defra-id-stub.prd.cdp-int.defra.cloud)

### Testing

To run the tests for the stub:

```bash
npm run docker:test
```

Tests can also be run in watch mode to support Test Driven Development (TDD):

```bash
npm run docker:test:watch
```

## Licence

THIS INFORMATION IS LICENSED UNDER THE CONDITIONS OF THE OPEN GOVERNMENT LICENCE found at:

<http://www.nationalarchives.gov.uk/doc/open-government-licence/version/3>

The following attribution statement MUST be cited in your products and applications when using this information.

> Contains public sector information licensed under the Open Government license v3

### About the licence

The Open Government Licence (OGL) was developed by the Controller of Her Majesty's Stationery Office (HMSO) to enable
information providers in the public sector to license the use and re-use of their information under a common open
licence.

It is designed to encourage use and re-use of information freely and flexibly, with only a few conditions.
