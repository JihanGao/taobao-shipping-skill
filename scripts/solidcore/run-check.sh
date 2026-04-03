#!/bin/bash

set -euo pipefail

ROOT_DIR="/Users/jihangao/Documents/Playground"
LOG_DIR="$ROOT_DIR/.local/solidcore/logs"

mkdir -p "$LOG_DIR"

cd "$ROOT_DIR"

exec /usr/bin/env node --import tsx scripts/solidcore/check.ts >> "$LOG_DIR/check.log" 2>> "$LOG_DIR/check.error.log"
