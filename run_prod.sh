#!/bin/bash
# Production startup script for small VPS (Low RAM)

# Activate virtual environment if it exists
if [ -d "venv" ]; then
    source venv/bin/activate
fi

# Run Gunicorn with optimized settings:
# - 1 worker to save RAM (avoids model duplication)
# - 2 threads for concurrency
# - 120s timeout for long AI processing
echo "Starting BizMind in Production Mode..."
exec gunicorn app:app \
  --workers 1 \
  --threads 2 \
  --bind 127.0.0.1:5000 \
  --timeout 120
