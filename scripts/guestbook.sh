#!/usr/bin/env bash
# Moderate visitor marks. Works from any folder. Needs `npx wrangler login` once.
#   guestbook.sh pending              list entries waiting for approval
#   guestbook.sh approved             list what is live
#   guestbook.sh approve <id>|all     show on the site
#   guestbook.sh reject <id>          hide, keep the row
#   guestbook.sh delete <id>          remove the row (for a removal request)
set -euo pipefail
export PATH="/opt/homebrew/bin:/usr/local/bin:$PATH"   # git hooks and some shells start with a minimal PATH
export CLOUDFLARE_ACCOUNT_ID=cd47d2b7d59ab78d6ec10d49ad87b457
DB=latenightstack-guestbook
raw() { npx --yes wrangler@4 d1 execute "$DB" --remote --json --command "$1" 2>/dev/null; }
# Print rows as: id | name | message | when, or a plain sentence when there are none.
list() {
  raw "SELECT id, name, message, datetime(created_at,'unixepoch') AS at FROM entries WHERE status='$1' ORDER BY created_at" | python3 -c "
import sys,json
t=sys.stdin.read(); rows=(json.loads(t[t.index('['):])[0].get('results') or [])
if not rows: print('No $1 entries.')
else:
    print(len(rows),'$1 entr'+('y' if len(rows)==1 else 'ies')+':')
    for r in rows: print(' ',r['id'],'|',r['name'],'|',r['message'] or '(no message)','|',r['at'],'UTC')
"
}
change() {
  raw "$1" | python3 -c "
import sys,json
t=sys.stdin.read(); m=json.loads(t[t.index('['):])[0].get('meta',{})
print('Done. Rows changed:',m.get('changes',0))
"
}
valid_id() { [[ "$1" =~ ^[0-9a-f-]{36}$ ]] || { echo "not a valid id: $1" >&2; exit 2; }; }
case "${1:-}" in
  pending)  list pending ;;
  approved) list approved ;;
  approve)  if [ "${2:-}" = all ]; then change "UPDATE entries SET status='approved' WHERE status='pending'"; else valid_id "${2:-}"; change "UPDATE entries SET status='approved' WHERE id='$2'"; fi ;;
  reject)   valid_id "${2:-}"; change "UPDATE entries SET status='rejected' WHERE id='$2'" ;;
  delete)   valid_id "${2:-}"; change "DELETE FROM entries WHERE id='$2'" ;;
  *) sed -n '2,8p' "$0"; exit 1 ;;
esac
