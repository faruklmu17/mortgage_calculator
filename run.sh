#!/usr/bin/env bash
set -euo pipefail

APP_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
WEATHER_DIR="$APP_DIR/weather_app"
weather_pid=""
vite_pid=""

cleanup() {
  trap - EXIT INT TERM
  for pid in "$vite_pid" "$weather_pid"; do
    if [[ -n "$pid" ]]; then
      kill "$pid" 2>/dev/null || true
      wait "$pid" 2>/dev/null || true
    fi
  done
}
trap cleanup EXIT
trap 'exit 130' INT
trap 'exit 143' TERM

for command in node npm python3; do
  if ! command -v "$command" >/dev/null 2>&1; then
    echo "Missing $command. Install Node.js and Python 3, then run ./run.sh again." >&2
    exit 1
  fi
done

if [[ ! -f "$WEATHER_DIR/app.py" ]]; then
  echo "Weather app not found at $WEATHER_DIR. Run git submodule update --init --recursive from mortgage_calculator." >&2
  exit 1
fi

cd "$APP_DIR"
if [[ ! -d node_modules ]]; then
  echo "Installing mortgage app dependencies..."
  npm ci
fi

WEATHER_PYTHON="$WEATHER_DIR/weather_env/bin/python"
if [[ ! -x "$WEATHER_PYTHON" ]]; then
  echo "Creating the weather app's Python environment..."
  python3 -m venv "$WEATHER_DIR/weather_env"
fi
if ! "$WEATHER_PYTHON" -c 'import flask, requests, dotenv' >/dev/null 2>&1; then
  echo "Installing weather app dependencies..."
  "$WEATHER_PYTHON" -m pip install -r "$WEATHER_DIR/requirements.txt"
fi

# The iframe requires Flask on port 5001. Vite can choose another port.
"$WEATHER_PYTHON" - <<'PY'
import socket
import sys

for port in (5001,):
    with socket.socket() as server:
        try:
            server.bind(('127.0.0.1', port))
        except OSError as error:
            sys.exit(f'Cannot use port {port}: {error}. Stop the existing server and retry.')
PY

"$WEATHER_PYTHON" - "$WEATHER_DIR/.env" <<'PY'
import os
import sys
from dotenv import load_dotenv

load_dotenv(sys.argv[1])
if not os.getenv('API_KEY'):
    print('Weather setup: add API_KEY=your_openweathermap_key to weather_app/.env for live weather.', flush=True)
PY

(
  cd "$WEATHER_DIR"
  exec "$WEATHER_PYTHON" -m flask --app app run --host 127.0.0.1 --port 5001 --no-reload
) &
weather_pid=$!

node "$APP_DIR/node_modules/vite/bin/vite.js" --host 127.0.0.1 --port 5173 &
vite_pid=$!

echo "Open the Local URL printed by Vite below (usually http://127.0.0.1:5173/)."
echo "If port 5173 is busy, Vite automatically selects the next available port."
echo "Weather page:     http://127.0.0.1:5001/"
echo "Press Ctrl+C to stop both servers."

# If either server exits, stop the other rather than leave it running.
while kill -0 "$weather_pid" 2>/dev/null && kill -0 "$vite_pid" 2>/dev/null; do
  sleep 1
done

if ! kill -0 "$weather_pid" 2>/dev/null; then
  wait "$weather_pid"
else
  wait "$vite_pid"
fi
