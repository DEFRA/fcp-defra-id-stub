#!/usr/bin/env sh

echo "configuring s3"
echo "==================="

awslocal s3api create-bucket \
  --bucket fcp-defra-id-stub-data \
  --create-bucket-configuration LocationConstraint=eu-west-2
