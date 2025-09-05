#!/usr/bin/env sh

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# Check if client ID is provided
if [ -z "$1" ]; then
    echo "Error: No client ID provided."
    echo "Usage: ./upload-file.sh <client-id>"
    echo ""
    echo "Example: ./upload-file.sh my-test-client-123"
    exit 1
fi

CLIENT_ID="$1"
BUCKET_NAME="fcp-defra-id-stub-data"
SOURCE_FILE="${PROJECT_ROOT}/example.bucket.data.json"
S3_KEY="${CLIENT_ID}/example.bucket.data.json"

AWS_ACCESS_KEY_ID=test \
AWS_SECRET_ACCESS_KEY=test \
aws --endpoint-url=http://localhost:4566 \
s3 cp "$SOURCE_FILE" "s3://${BUCKET_NAME}/${S3_KEY}" \
--region eu-west-2

echo "Uploaded ${SOURCE_FILE} to s3://${BUCKET_NAME}/${S3_KEY}"
