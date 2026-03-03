#!/bin/bash

# Test the polling endpoint
# You'll need to replace YOUR_JWT_TOKEN with an actual token

# First, let's check if the endpoint exists
echo "Testing polling endpoint..."
echo "Note: You need to be authenticated to test this properly"
echo ""
echo "Endpoint: GET /api/v1/memos/poll?latestMemoId=<memoId>&sortBy=createdAt"
echo ""
echo "Example curl command (replace YOUR_JWT_TOKEN and MEMO_ID):"
echo 'curl -X GET "http://localhost:3000/api/v1/memos/poll?latestMemoId=MEMO_ID&sortBy=createdAt" \'
echo '  -H "Authorization: Bearer YOUR_JWT_TOKEN"'
