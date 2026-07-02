#!/bin/bash
set -e

# Extract project
mkdir -p /home/vyncost/vyncost
cd /home/vyncost/vyncost
unzip -o /tmp/vyncost_deploy.zip -d /tmp/vyncost_extracted

# Compress-Archive flattens structure — move files preserving paths
cp -r /tmp/vyncost_extracted/. /home/vyncost/vyncost/ 2>/dev/null || true

# Create .env.local with defaults (prototype)
cat > /home/vyncost/vyncost/.env.local << 'EOF'
VYNCOST_SECRET=changeme-generate-with-openssl-rand-base64-32
VYNCOST_ADMIN_EMAIL=admin@vyncost.local
VYNCOST_ADMIN_PASSWORD=changeme
GROQ_API_KEY=
PORT=3020
EOF

chown -R vyncost:vyncost /home/vyncost/vyncost
echo "Files extracted and .env.local created."
ls /home/vyncost/vyncost
