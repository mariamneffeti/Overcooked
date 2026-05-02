#!/bin/bash
# Start Redis in background
redis-server --daemonize yes --logfile /tmp/redis.log --port 6379

# Wait for Redis
for i in $(seq 1 10); do
  if redis-cli ping > /dev/null 2>&1; then
    echo "Redis ready"
    break
  fi
  sleep 0.5
done

# Start FastAPI backend in background on port 8000
cd /home/runner/workspace/cultural-pulse-v3
ALLOW_ANON_AUTH=true REDIS_URL=redis://localhost:6379 REDIS_HOST=localhost REDIS_PORT=6379 CHROMA_MODE=persistent \
  python3 -m uvicorn backend.main:app --host localhost --port 8000 &

# Start Next.js frontend on port 5000
cd /home/runner/workspace/cultural-pulse-v3/frontend
npm run start
