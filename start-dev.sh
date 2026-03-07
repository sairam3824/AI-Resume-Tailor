#!/bin/bash
# Start both the Python NLP service and Next.js dev server

PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"

echo "Starting AI Resume Tailor (full stack)..."
echo ""

# Load OPENAI_API_KEY from .env.local
if [ -f "$PROJECT_DIR/.env.local" ]; then
  export $(grep -v '^#' "$PROJECT_DIR/.env.local" | xargs)
  echo "Loaded .env.local"
fi

# Kill any existing instances
pkill -f "uvicorn main:app" 2>/dev/null
pkill -f "next dev" 2>/dev/null
sleep 1

# Start Python NLP service
echo "[1/2] Starting Python NLP service (port 8000)..."
cd "$PROJECT_DIR/services/resume-matcher"
OPENAI_API_KEY="$OPENAI_API_KEY" conda run -n resume-nlp \
  uvicorn main:app --reload --port 8000 &
PYTHON_PID=$!

# Wait for Python service to be ready
echo "      Waiting for Python service..."
for i in $(seq 1 20); do
  if curl -s http://localhost:8000/health > /dev/null 2>&1; then
    STATUS=$(curl -s http://localhost:8000/health)
    echo "      Ready! $STATUS"
    break
  fi
  sleep 1
done

echo ""

# Start Next.js
echo "[2/2] Starting Next.js (port 3000)..."
cd "$PROJECT_DIR" && npm run dev &
NEXT_PID=$!

echo ""
echo "Both services running:"
echo "  Next.js:    http://localhost:3000"
echo "  Python NLP: http://localhost:8000"
echo ""
echo "Press Ctrl+C to stop both."

trap "echo 'Stopping...'; kill $PYTHON_PID $NEXT_PID 2>/dev/null; exit" INT TERM

wait
