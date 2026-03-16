#!/bin/bash
# Restart script for Linux/Mac
#
# Usage:
#   ./restart.sh          — build frontend → frontend: start, backend: dev
#   ./restart.sh -bf      — build frontend → frontend: start, backend: dev
#   ./restart.sh -bb      — build backend  → frontend: dev,   backend: start
#   ./restart.sh -bfb     — build both     → frontend: start, backend: start
#   ./restart.sh -bbf     — same as -bfb

BUILD_FRONT=false
BUILD_BACK=false

for arg in "$@"; do
  case $arg in
    -bf)  BUILD_FRONT=true ;;
    -bb)  BUILD_BACK=true ;;
    -bfb|-bbf) BUILD_FRONT=true; BUILD_BACK=true ;;
  esac
done

# Default (no flags) = build frontend
if [ "$BUILD_FRONT" = false ] && [ "$BUILD_BACK" = false ]; then
  BUILD_FRONT=true
fi

FRONT_CMD=$([ "$BUILD_FRONT" = true ] && echo "start" || echo "run dev")
BACK_CMD=$([ "$BUILD_BACK" = true ] && echo "start" || echo "run dev")

echo ""
echo "Build frontend : $BUILD_FRONT  → npm $FRONT_CMD"
echo "Build backend  : $BUILD_BACK   → npm $BACK_CMD"
echo ""

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"

# Kill existing processes on relevant ports
for port in 4000 3000 5176; do
  pid=$(lsof -ti tcp:$port 2>/dev/null)
  if [ -n "$pid" ]; then
    kill -9 $pid 2>/dev/null
    echo "  Killed process on port $port"
  fi
done
sleep 1

# Build frontend
if [ "$BUILD_FRONT" = true ]; then
  echo "=== Building frontend ==="
  cd "$ROOT_DIR/frontend"
  npm run build
  if [ $? -ne 0 ]; then
    echo "Frontend build failed!"
    exit 1
  fi
fi

# Build backend
if [ "$BUILD_BACK" = true ]; then
  echo "=== Building backend ==="
  cd "$ROOT_DIR/backend"
  npm run build
  if [ $? -ne 0 ]; then
    echo "Backend build failed!"
    exit 1
  fi
fi

# Start frontend
echo "=== Starting frontend (npm $FRONT_CMD) ==="
cd "$ROOT_DIR/frontend"
npm $FRONT_CMD &
FRONTEND_PID=$!

# Start backend
echo "=== Starting backend (npm $BACK_CMD) ==="
cd "$ROOT_DIR/backend"
npm $BACK_CMD &
BACKEND_PID=$!

echo ""
echo "Frontend PID: $FRONTEND_PID"
echo "Backend PID:  $BACKEND_PID"
echo ""
echo "Frontend: http://localhost:5176"
echo "Backend:  http://localhost:4000"
echo ""
echo "Press Ctrl+C to stop both"

trap "kill $FRONTEND_PID $BACKEND_PID 2>/dev/null; echo 'Stopped.'" INT
wait
