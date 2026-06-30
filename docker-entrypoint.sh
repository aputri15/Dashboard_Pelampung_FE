#!/bin/sh
set -e

# Generate runtime config from environment variable
# This script runs at container startup, BEFORE nginx serves the files.
# It creates a small JS file that sets window.__API_BASE__ so all pages
# can read the backend URL without rebuild.

API_BASE_URL="${API_BASE_URL:-http://127.0.0.1:8000/api/v1}"

cat > /usr/share/nginx/html/runtime-config.js << EOF
window.__API_BASE__ = "${API_BASE_URL}";
EOF

echo "Runtime config generated: API_BASE_URL=${API_BASE_URL}"

exec "$@"
