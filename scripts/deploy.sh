#!/usr/bin/env bash
# Deploy the site to Cloudflare Pages (project: latenightstack). Needs a prior `npx wrangler login`.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
STAGE="$(mktemp -d)"
trap 'rm -rf "${STAGE:?}"' EXIT
rsync -a --exclude='.git' --exclude='.DS_Store' --exclude='README.md' --exclude='.nojekyll' --exclude='scripts' "$ROOT"/ "$STAGE"/
cd "$STAGE"
CLOUDFLARE_ACCOUNT_ID=cd47d2b7d59ab78d6ec10d49ad87b457 npx --yes wrangler@4 pages deploy . --project-name latenightstack --branch main --commit-dirty=true
