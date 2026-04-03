#!/bin/bash
set -e
cd "$(dirname "$0")"
cd "$(pwd -P)"

# Fix "EMFILE: too many open files"
ulimit -n 10240 2>/dev/null || true

# Free port 3000 if occupied by previous run
if lsof -ti:3000 >/dev/null 2>&1; then
  echo "▶ Stopping process on port 3000..."
  lsof -ti:3000 | xargs kill -9 2>/dev/null || true
  sleep 2
fi

echo "▶ Installing dependencies..."
npm install

echo "▶ Syncing database..."
npx prisma generate
npx prisma db push

echo "▶ Clearing stale build cache..."
rm -rf .next

echo "▶ Starting dev server..."
npm run dev -- --hostname localhost
