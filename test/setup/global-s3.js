import { S3Client, CreateBucketCommand } from '@aws-sdk/client-s3'
import { GenericContainer, Wait } from 'testcontainers'

const BUCKET_NAME = 'fcp-defra-id-stub-data'
const REGION = 'eu-west-2'
const ACCESS_KEY_ID = 'test'
const SECRET_ACCESS_KEY = 'test'

export async function setup () {
  const floci = await new GenericContainer('floci/floci:latest')
    .withExposedPorts(4566)
    .withEnvironment({
      FLOCI_HOSTNAME: 'localhost',
      FLOCI_DEFAULT_REGION: REGION,
      AWS_ACCESS_KEY_ID: ACCESS_KEY_ID,
      AWS_SECRET_ACCESS_KEY: SECRET_ACCESS_KEY
    })
    .withWaitStrategy(Wait.forListeningPorts())
    .start()

  const endpoint = `http://${floci.getHost()}:${floci.getMappedPort(4566)}`

  process.env.AWS_ENDPOINT_URL = endpoint

  const s3Client = new S3Client({
    region: REGION,
    endpoint,
    forcePathStyle: true,
    credentials: { accessKeyId: ACCESS_KEY_ID, secretAccessKey: SECRET_ACCESS_KEY }
  })

  await s3Client.send(new CreateBucketCommand({
    Bucket: BUCKET_NAME,
    CreateBucketConfiguration: { LocationConstraint: REGION }
  }))

  return async function teardown () {
    await floci.stop()
  }
}
