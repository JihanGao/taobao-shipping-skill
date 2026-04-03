#!/bin/bash

set -euo pipefail

ROOT_DIR="/Users/jihangao/Library/Application Support/solidcore-watcher"
LOG_DIR="$ROOT_DIR/.local/logs"

mkdir -p "$LOG_DIR"

cd "$ROOT_DIR"

exec /usr/local/bin/node watcher.mjs >> "$LOG_DIR/check.log" 2>> "$LOG_DIR/check.error.log"
