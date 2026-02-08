#!/usr/bin/env bash

echo "Checking for middleware files that should not exist..."

# Check if middleware.ts exists in src root (should not exist)
if [ -f "src/middleware.ts" ]; then
  echo "❌ ERROR: src/middleware.ts exists but should not exist!"
  echo "This file conflicts with proxy.ts in Next.js 16"
  echo "Removing src/middleware.ts..."
  rm src/middleware.ts
  echo "✅ Removed conflicting middleware.ts"
else
  echo "✅ No conflicting middleware.ts found in src root"
fi

# Check if proxy.ts exists (should exist)
if [ -f "src/proxy.ts" ]; then
  echo "✅ proxy.ts exists (correct for Next.js 16)"
else
  echo "❌ ERROR: src/proxy.ts is missing!"
  echo "This file is required for Next.js 16 middleware"
fi

# Check for any other middleware files in src
find src -name "*middleware*" -type f 2>/dev/null | while read -r file; do
  if [ "$file" != "src/lib/supabase/middleware.ts" ]; then
    echo "⚠️  WARNING: Found middleware file: $file"
  fi
done

echo "Middleware check completed."
