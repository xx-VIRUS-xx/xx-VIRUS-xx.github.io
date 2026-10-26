#!/usr/bin/env bash
# Moderate visitor marks. Needs `npx wrangler login` once.
#   ./scripts/guestbook.sh pending              list entries waiting for approval
#   ./scripts/guestbook.sh approved             list what is live
#   ./scripts/guestbook.sh approve <id>|all     show on the site
#   ./scripts/guestbook.sh reject <id>          hide, keep the row
#   ./scripts/guestbook.sh delete <id>          remove the row (for a removal request)
set -euo pipefail
export CLOUDFLARE_ACCOUNT_ID=cd47d2b7d59ab78d6ec10d49ad87b457
DB=latenightstack-guestbook
run() { npx --yes wrangler@4 d1 execute "$DB" --remote --command "$1" 2>&1 | sed 's/\x1b\[[0-9;]*m//g'; }
valid_id() { [[ "$1" =~ ^[0-9a-f-]{36}$ ]] || { echo "not a valid id: $1" >&2; exit 2; }; }
case "${1:-}" in
  pending)  run "SELECT id, name, message, datetime(created_at,'unixepoch') AS at FROM entries WHERE status='pending' ORDER BY created_at" ;;
  approved) run "SELECT id, name, message, datetime(created_at,'unixepoch') AS at FROM entries WHERE status='approved' ORDER BY created_at DESC" ;;
  approve)  if [ "${2:-}" = all ]; then run "UPDATE entries SET status='approved' WHERE status='pending'"; else valid_id "${2:-}"; run "UPDATE entries SET status='approved' WHERE id='$2'"; fi ;;
  reject)   valid_id "${2:-}"; run "UPDATE entries SET status='rejected' WHERE id='$2'" ;;
  delete)   valid_id "${2:-}"; run "DELETE FROM entries WHERE id='$2'" ;;
  *) sed -n '2,8p' "$0"; exit 1 ;;
esac
