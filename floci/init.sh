#!/usr/bin/env sh

echo "Waiting for Floci to be ready..."
until aws s3 ls > /dev/null 2>&1; do
  sleep 1
done
echo "Floci is ready"

echo "Configuring S3"
echo "========================"

AWS_REGION=${AWS_REGION:-eu-west-2}

aws s3api create-bucket \
  --bucket fcp-defra-id-stub-data \
  --create-bucket-configuration LocationConstraint="${AWS_REGION}" \
  --region "${AWS_REGION}"

echo "Done! S3 configured."
