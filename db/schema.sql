-- Visitor marks. Rows start as 'pending' and are shown on the site only after approval.
CREATE TABLE IF NOT EXISTS entries (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  message     TEXT NOT NULL DEFAULT '',
  strokes     TEXT NOT NULL,            -- JSON: [[[x,y],...],...] integer points in a 600x240 pad
  seed        INTEGER NOT NULL,         -- uint32 that drives the generated ink print (art, not biometrics)
  status      TEXT NOT NULL DEFAULT 'pending',   -- pending | approved | rejected
  created_at  INTEGER NOT NULL,         -- unix seconds
  ip_hash     TEXT NOT NULL             -- sha256(ip + day + salt): rate limiting only, the IP itself is never stored
);
CREATE INDEX IF NOT EXISTS idx_entries_status_created ON entries (status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_entries_iphash_created ON entries (ip_hash, created_at);
