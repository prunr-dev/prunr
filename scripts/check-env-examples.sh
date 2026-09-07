#!/usr/bin/env bash
# Fail if any tracked .env.example looks like it contains real secrets.
set -euo pipefail

root="$(cd "$(dirname "$0")/.." && pwd)"
cd "$root"

patterns=(
  '^[[:space:]]*UPSTASH_REDIS_REST_TOKEN=.'
  '^[[:space:]]*UPSTASH_REDIS_REST_URL=https?://'
  '^[[:space:]]*[A-Za-z0-9_]*(SECRET|PASSWORD|PRIVATE_KEY|API_KEY)=.'
)

failed=0
while IFS= read -r -d '' file; do
  for pattern in "${patterns[@]}"; do
    if grep -nE "$pattern" "$file" >/dev/null 2>&1; then
      echo "error: possible secret in tracked template: $file"
      grep -nE "$pattern" "$file" || true
      failed=1
    fi
  done
done < <(find . -name '.env.example' -not -path './node_modules/*' -print0)

if [[ "$failed" -ne 0 ]]; then
  echo
  echo "Keep .env.example placeholders empty (KEY=)."
  echo "Put real values in ignored .env / .env.local / Vercel env instead."
  exit 1
fi

echo "env-example check passed"
