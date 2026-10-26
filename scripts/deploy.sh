#!/usr/bin/env bash
# Deploy the site to Cloudflare Pages (project: latenightstack). Needs a prior `npx wrangler login`.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
STAGE="$(mktemp -d)"
trap 'rm -rf "${STAGE:?}"' EXIT
mkdir "$STAGE/site"
rsync -a --exclude='.git' --exclude='.DS_Store' --exclude='README.md' --exclude='.nojekyll' --exclude='scripts' --exclude='db' --exclude='functions' "$ROOT"/ "$STAGE/site"/
cp -R "$ROOT/functions" "$STAGE/functions"   # Functions live beside the site folder, not inside it
cd "$STAGE"
CLOUDFLARE_ACCOUNT_ID=cd47d2b7d59ab78d6ec10d49ad87b457 npx --yes wrangler@4 pages deploy site --project-name latenightstack --branch main --commit-dirty=true
