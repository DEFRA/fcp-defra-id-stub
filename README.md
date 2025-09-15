# fcp-defra-id-stub

![Build](https://github.com/defra/fcp-defra-id-stub/actions/workflows/publish.yml/badge.svg)
[![Quality Gate Status](https://sonarcloud.io/api/project_badges/measure?project=DEFRA_fcp-defra-id-stub&metric=alert_status)](https://sonarcloud.io/summary/new_code?id=DEFRA_fcp-defra-id-stub)
[![Bugs](https://sonarcloud.io/api/project_badges/measure?project=DEFRA_fcp-defra-id-stub&metric=bugs)](https://sonarcloud.io/summary/new_code?id=DEFRA_fcp-defra-id-stub)
[![Code Smells](https://sonarcloud.io/api/project_badges/measure?project=DEFRA_fcp-defra-id-stub&metric=code_smells)](https://sonarcloud.io/summary/new_code?id=DEFRA_fcp-defra-id-stub)
[![Duplicated Lines (%)](https://sonarcloud.io/api/project_badges/measure?project=DEFRA_fcp-defra-id-stub&metric=duplicated_lines_density)](https://sonarcloud.io/summary/new_code?id=DEFRA_fcp-defra-id-stub)
[![Coverage](https://sonarcloud.io/api/project_badges/measure?project=DEFRA_fcp-defra-id-stub&metric=coverage)](https://sonarcloud.io/summary/new_code?id=DEFRA_fcp-defra-id-stub)

Defra Identity stub for Farming and Countryside Programme (FCP).

There are two existing Defra Identity stubs:

- [Official Defra Identity stub](https://dev.azure.com/defragovuk/DEFRA-Common-Platform-Improvements/_wiki/wikis/DEFRA-Common-Platform-Improvements.wiki/32274/IDM-stub)
- [CDP Defra Identity stub](https://github.com/DEFRA/cdp-defra-id-stub)

Neither of these support the `signupsigninsfi` policy used in FCP.

This policy enables authentication with a CRN/Password combination and changes the content of the default Defra Identity token.

To enable teams working within FCP develop and test against Defra Identity this stub has been created.

> NOTE: this stub is still a work in progress. Feedback and issues welcome.

## Supported Defra Identity features

- CRN/Password authentication
- Exposes all Defra Identity endpoints including well-known endpoints
- Organisation selection
- Signed JWT token generation consistent with `signupsigninsfi` policy
- Token exchange from authorisation
- Refresh token exchange
- Single Sign-On (SSO) support (Session lasts one hour, extended on each re-authentication/organisation change)
- Sign out including ending SSO session
- Prevent sign in if no organisations associated with account
- Automatically bypass organisation selection if CRN is associated with only one organisation.
- Supports all Defra Identity authentication behaviours including:
  - Force re-authentication with `prompt=login` parameter
  - Bypass organisation selection with `relationshipId=<OrganisationId>` parameter
  - Force organisation selection with `forceReselection=true` parameter

## Additional stub features

- Customisable people and organisation data (See below)

## Planned improvements

There are some known issues to be aware of that will be addressed in future releases:

- Mock people and organisation data is limited.  However this can be overridden by the customisation options described below.

- UI content does not fully mirror Defra Identity.  However note there are no plans to introduce the legacy GOV.UK branding currently used by Defra Identity.

- Request content validation is limited and therefore so is feedback on invalid requests.

- General code quality and test coverage.

> If any further limitations or issues are identified, please raise with `John Watson <john.watson1@defra.gov.uk>` (Principal Developer).

## A note on roles

Defra Identity will include the user's role in the selected organisation sourced from Siti Agri as part of the `roles` property.

The stub will always return this role name as `Agent`.

The role name is not associated to a predefined set of permissions and is therefore of little value to consuming services.

Consuming services must source the user's actual permissions from Siti Agri via the Data Access Layer (DAL) post authentication.

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

The stub has the same endpoints and expectations as the real Defra Identity.

The simplest way to switch between the stub is to update your application to use the well known endpoint of the stub.

For example, let's say your application has the following environment variables for a real Defra Identity instance.

```
DEFRA_ID_WELL_KNOWN_URL=https://your-account.cpdev.cui.defra.gov.uk/idphub/b2c/b2c_1a_cui_cpdev_signupsigninsfi/.well-known/openid-configuration
DEFRA_ID_CLIENT_ID=<your Client ID GUID>
DEFRA_ID_CLIENT_SECRET=<Your Client Secret>
DEFRA_ID_SERVICE_ID=<your Service ID GUID>
DEFRA_ID_POLICY=b2c_1a_cui_cpdev_signupsigninsfi
```

Only the first environment variable needs to change, to repoint to the stub.

```
DEFRA_ID_WELL_KNOWN_URL=http://fcp-defra-id-stub:3007/idphub/b2c/b2c_1a_cui_cpdev_signupsigninsfi/.well-known/openid-configuration
DEFRA_ID_CLIENT_ID=<your Client ID GUID>
DEFRA_ID_CLIENT_SECRET=<Your Client Secret>
DEFRA_ID_SERVICE_ID=<your Service ID GUID>
DEFRA_ID_POLICY=b2c_1a_cui_cpdev_signupsigninsfi
```

**IMPORTANT** if not running in the same Docker network as your app, then the host must be set as `host.docker.internal` to enable the containerised app access localhost.

```
DEFRA_ID_WELL_KNOWN_URL=http://host.docker.internal:3007/idphub/b2c/b2c_1a_cui_cpdev_signupsigninsfi/.well-known/openid-configuration
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

### FCP Defra Identity example

The [FCP Defra Identity example repository](https://github.com/DEFRA/fcp-defra-id-example) includes the stub as part of it's Docker Compose setup for optional use.

## CDP environments

The stub is deployed to all CDP environments and can be used by any application.

> Note: the deployed version uses the Basic authentication setup where any CRN is accepted and a basic list of organisations is provided.

- [https://fcp-defra-id-stub.dev.cdp-int.defra.cloud](https://fcp-defra-id-stub.dev.cdp-int.defra.cloud)
- [https://fcp-defra-id-stub.test.cdp-int.defra.cloud](https://fcp-defra-id-stub.test.cdp-int.defra.cloud)
- [https://fcp-defra-id-stub.perf-test.cdp-int.defra.cloud](https://fcp-defra-id-stub.perf-test.cdp-int.defra.cloud)
- [https://fcp-defra-id-stub.prod.cdp-int.defra.cloud](https://fcp-defra-id-stub.prod.cdp-int.defra.cloud)

Example configuration file for CDP `dev` environment.

```
DEFRA_ID_WELL_KNOWN_URL=https://fcp-defra-id-stub.dev.cdp-int.defra.cloud/idphub/b2c/b2c_1a_cui_cpdev_signupsigninsfi/.well-known/openid-configuration
DEFRA_ID_CLIENT_ID=<your Client ID GUID>
DEFRA_ID_CLIENT_SECRET=<Your Client Secret>
DEFRA_ID_SERVICE_ID=<your Service ID GUID>
DEFRA_ID_POLICY=b2c_1a_cui_cpdev_signupsigninsfi
```

> NOTE: CDP environments cannot be used from outside of CDP as the complex redirection url will be rejected.

## Customising people and organisation data

The stub supports five data options for configuring people and organisation data.

> NOTE: That with all options, the password value is not validated.

The default "Basic" approach will fit the needs of most development and testing scenarios.  

However, depending on your local setup you may need the Defra Identity token content to align to other mock/real datasets you're using.

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
      "crn": 3100010101,
      "firstName": "Julie",
      "lastName": "Barnes",
      "organisations": [
        {
          "organisationId": "5900001",
          "sbi": 210100101,
          "name": "Sheep Every Day"
        },
        {
          "organisationId": "5900002",
          "sbi": 210100102,
          "name": "Beetles"
        },
        {
          "organisationId": "5900003",
          "sbi": 210100103,
          "name": "A & F Land Management"
        }
      ]
    },
    {
      "crn": 3100010102,
      "firstName": "Glen",
      "lastName": "Adams",
      "organisations": [
        {
          "organisationId": "5900001",
          "sbi": 210100101,
          "name": "Sheep Every Day"
        },
        {
          "organisationId": "5900002",
          "sbi": 210100103,
          "name": "Glen Adams"
        }
      ]
    },
    {
      "crn": 3100010103,
      "firstName": "Ben",
      "lastName": "Jones",
      "organisations": []
    },
    {
      "crn": 3100010104,
      "firstName": "Alice",
      "lastName": "Smith",
      "organisations": [
        {
          "organisationId": "5900001",
          "sbi": 210100101,
          "name": "Sheep Every Day"
        }
      ]
    }
  ]
}
```

To enable this option set the `AUTH_OVERRIDE_FILE` environment variable to the filename of the JSON file within the directory.

For example: `AUTH_OVERRIDE_FILE: auth-override.json`

If provided, this option will take precedence over the above methods.

### Detailed client specific override

Whist the above options cover most local development and testing scenarios, they are not suitable for shared environments such as CDP where multiple teams and applications may be using the stub.

To support this scenario, the JSON data file can be stored in the stub's S3 bucket, `fcp-defra-id-stub-data`, under a folder named for the Client ID of the application.

eg `fcp-defra-id-stub-data/<client-id>/example.data.json`

If multiple files are uploaded under the same Client ID, the last modified file will be used.

To enable this option set the `AWS_S3_ENABLED` environment variable to `true` and provide the `AWS_S3_BUCKET_NAME` environment variable if a different bucket name is required.

If provided, this option will take precedence over all other methods.  However, if no file is found for the Client ID, the stub will fallback to the other methods in the order described above.

#### Uploading data files to CDP environments

Each CDP environment has a dedicated S3 bucket for the stub data.

- `dev-fcp-defra-id-stub-data-c63f2`
- `test-fcp-defra-id-stub-data-6bf3a`
- `perf-test-fcp-defra-id-stub-data-05244`
- `prod-fcp-defra-id-stub-data-75ee2`

To upload a data file to the relevant bucket, use the AWS CLI through the CDP terminal.


Ensure to prefix the S3 key with the Client ID of your application.

For example, to upload the `example.data.json` file in this repository for a Client ID of `00000000-0000-0000-0000-000000000000` to the S3 `dev` environment, run the below command after uploading the file to CDP.

`aws s3 cp example.data.json s3://dev-fcp-defra-id-stub-data-c63f2/00000000-0000-0000-0000-000000000000/example.data.json`

> NOTE: Currently only the Single Front Door (SFD) have access to upload to these buckets.  A longer term self service solution is being investigated.

Uploaded datasets for each environment can be viewed within the stub.

- [https://fcp-defra-id-stub.dev.cdp-int.defra.cloud/s3](https://fcp-defra-id-stub.dev.cdp-int.defra.cloud/s3)
- [https://fcp-defra-id-stub.test.cdp-int.defra.cloud/s3](https://fcp-defra-id-stub.test.cdp-int.defra.cloud/s3)
- [https://fcp-defra-id-stub.perf-test.cdp-int.defra.cloud/s3](https://fcp-defra-id-stub.perf-test.cdp-int.defra.cloud/s3)
- [https://fcp-defra-id-stub.prod.cdp-int.defra.cloud/s3](https://fcp-defra-id-stub.prod.cdp-int.defra.cloud/s3)

#### Uploading data files locally

You will need to ensure the Stub has access to a local S3 instance.

The [Docker Compose file in this repository](./compose.yml) includes an example setup.

The [upload-file.sh](./scripts/upload-file.sh) sample script will upload the `example.data.json` file in this repository to the local S3 instance.

> NOTE: you will need to provide a Client ID as the first parameter.

> The script is also dependent on a local installation of the [AWS CLI](https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html).

`./scripts/upload-file.sh 00000000-0000-0000-0000-000000000000`

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
