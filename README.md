# fcp-defra-id-stub

![Build](https://github.com/defra/fcp-defra-id-stub/actions/workflows/publish.yml/badge.svg)
[![Quality Gate Status](https://sonarcloud.io/api/project_badges/measure?project=DEFRA_fcp-defra-id-stub&metric=alert_status)](https://sonarcloud.io/summary/new_code?id=DEFRA_fcp-defra-id-stub)
[![Bugs](https://sonarcloud.io/api/project_badges/measure?project=DEFRA_fcp-defra-id-stub&metric=bugs)](https://sonarcloud.io/summary/new_code?id=DEFRA_fcp-defra-id-stub)
[![Code Smells](https://sonarcloud.io/api/project_badges/measure?project=DEFRA_fcp-defra-id-stub&metric=code_smells)](https://sonarcloud.io/summary/new_code?id=DEFRA_fcp-defra-id-stub)
[![Duplicated Lines (%)](https://sonarcloud.io/api/project_badges/measure?project=DEFRA_fcp-defra-id-stub&metric=duplicated_lines_density)](https://sonarcloud.io/summary/new_code?id=DEFRA_fcp-defra-id-stub)
[![Coverage](https://sonarcloud.io/api/project_badges/measure?project=DEFRA_fcp-defra-id-stub&metric=coverage)](https://sonarcloud.io/summary/new_code?id=DEFRA_fcp-defra-id-stub)

Defra ID stub for Farming and Countryside Programme.

> THIS IS A WORK IN PROGRESS AND NOT YET READY FOR USE

## Requirements

### Docker

This application is intended to be run in a Docker container to ensure consistency across environments.

Docker can be installed from [Docker's official website](https://docs.docker.com/get-docker/).

## Local Development

### Setup

Install application dependencies:

```bash
npm install
```

### Development

Build the Docker container:

```
npm run docker:build
```

Run the application in `development` mode:

```bash
npm run docker:dev
```

### Testing

To test the application:

```bash
npm run docker:test
```

Tests can also be run in watch mode to support Test Driven Development (TDD):

```bash
npm run docker:test:watch
```

### npm scripts

All available npm scripts can be seen in [package.json](./package.json)
To view them in your command line:

```bash
npm run
```

### Update dependencies

To update dependencies use [npm-check-updates](https://github.com/raineorshine/npm-check-updates):

> The following script is a good start. Check out all the options on
> the [npm-check-updates](https://github.com/raineorshine/npm-check-updates)

```bash
ncu --interactive --format group
```

## SonarQube Cloud

Instructions for setting up SonarQube Cloud can be found in [sonar-project.properties](./sonar-project.properties).

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
