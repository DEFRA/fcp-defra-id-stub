#!/usr/bin/env sh

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# Check if client ID is provided
if [ -z "$1" ]; then
    echo "Error: No client ID provided."
    echo "Usage: ./upload-file.sh <client-id>"
    echo ""
    echo "Example: ./upload-file.sh 00000000-0000-0000-0000-000000000000"
    exit 1
fi

CLIENT_ID="$1"
BUCKET_NAME="fcp-defra-id-stub-data"
SOURCE_FILE="${PROJECT_ROOT}/example.data.json"
S3_KEY="${CLIENT_ID}/example.data.json"

AWS_ACCESS_KEY_ID=test \
AWS_SECRET_ACCESS_KEY=test \
aws --endpoint-url=http://localhost:4566 \
s3 cp "$SOURCE_FILE" "s3://${BUCKET_NAME}/${S3_KEY}" \
--region eu-west-2

echo "Uploaded ${SOURCE_FILE} to s3://${BUCKET_NAME}/${S3_KEY}"
