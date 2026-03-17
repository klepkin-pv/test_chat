#!/bin/bash
# Restart script for Linux/Mac
#
# Usage:
#   ./restart.sh          - build frontend -> frontend: start, backend: dev
#   ./restart.sh -bf      - build frontend -> frontend: start, backend: dev
#   ./restart.sh -bb      - build backend  -> frontend: dev,   backend: start
#   ./restart.sh -bfb     - build both     -> frontend: start, backend: start
#   ./restart.sh -bbf     - same as -bfb

BUILD_FRONT=false
BUILD_BACK=false

for arg in "$@"; do
  case $arg in
    -bf) BUILD_FRONT=true ;;
    -bb) BUILD_BACK=true ;;
    -bfb|-bbf) BUILD_FRONT=true; BUILD_BACK=true ;;
  esac
done

if [ "$BUILD_FRONT" = false ] && [ "$BUILD_BACK" = false ]; then
  BUILD_FRONT=true
fi

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
ENV_FILE="$ROOT_DIR/.env"

get_config_value() {
  local key="$1"
  local default_value="$2"

  if [ -f "$ENV_FILE" ]; then
    local line
    line=$(grep -E "^${key}=" "$ENV_FILE" | tail -n 1)
    if [ -n "$line" ]; then
      echo "${line#*=}" | sed 's/^"//; s/"$//'
      return
    fi
  fi

  local env_value="${!key}"
  if [ -n "$env_value" ]; then
    echo "$env_value"
    return
  fi

  echo "$default_value"
}

APP_PROTOCOL=$(get_config_value "APP_PROTOCOL" "http")
APP_HOST=$(get_config_value "APP_HOST" "localhost")
FRONTEND_PORT=$(get_config_value "FRONTEND_PORT" "5176")
BACKEND_PORT=$(get_config_value "PORT" "4000")
NGINX_PORT=$(get_config_value "NGINX_PORT" "5175")
PUBLIC_ORIGIN=$(get_config_value "PUBLIC_ORIGIN" "")

FRONT_CMD=$([ "$BUILD_FRONT" = true ] && echo "start" || echo "run dev")
BACK_CMD=$([ "$BUILD_BACK" = true ] && echo "start" || echo "run dev")
FRONTEND_URL="${APP_PROTOCOL}://${APP_HOST}:${FRONTEND_PORT}/chat"
BACKEND_URL="${APP_PROTOCOL}://${APP_HOST}:${BACKEND_PORT}"
if [ -n "$PUBLIC_ORIGIN" ]; then
  PROXY_URL="${PUBLIC_ORIGIN}/chat"
else
  PROXY_URL="${APP_PROTOCOL}://${APP_HOST}:${NGINX_PORT}/chat"
fi

echo ""
echo "Build frontend : $BUILD_FRONT  -> npm $FRONT_CMD"
echo "Build backend  : $BUILD_BACK   -> npm $BACK_CMD"
echo ""

for port in "$BACKEND_PORT" "$FRONTEND_PORT"; do
  pid=$(lsof -ti tcp:$port 2>/dev/null)
  if [ -n "$pid" ]; then
    kill -9 $pid 2>/dev/null
    echo "  Killed process on port $port"
  fi
done
sleep 1

if [ "$BUILD_FRONT" = true ]; then
  echo "=== Building frontend ==="
  cd "$ROOT_DIR/frontend" || exit 1
  npm run build
  if [ $? -ne 0 ]; then
    echo "Frontend build failed!"
    exit 1
  fi
fi

if [ "$BUILD_BACK" = true ]; then
  echo "=== Building backend ==="
  cd "$ROOT_DIR/backend" || exit 1
  npm run build
  if [ $? -ne 0 ]; then
    echo "Backend build failed!"
    exit 1
  fi
fi

echo "=== Starting frontend (npm $FRONT_CMD) ==="
cd "$ROOT_DIR/frontend" || exit 1
npm $FRONT_CMD &
FRONTEND_PID=$!

echo "=== Starting backend (npm $BACK_CMD) ==="
cd "$ROOT_DIR/backend" || exit 1
npm $BACK_CMD &
BACKEND_PID=$!

echo ""
echo "Frontend PID: $FRONTEND_PID"
echo "Backend PID:  $BACKEND_PID"
echo ""
echo "Frontend: $FRONTEND_URL"
echo "Backend:  $BACKEND_URL"
echo "Proxy:    $PROXY_URL"
echo ""
echo "Press Ctrl+C to stop both"

trap "kill $FRONTEND_PID $BACKEND_PID 2>/dev/null; echo 'Stopped.'" INT
wait
