-- Watch together: small pools of people who want to see the same film in Pune.
-- A pool has 1 to 3 candidate shows (cinema + time on one date). People join with the
-- part of Pune they are in and the shows that work for them. Headcounts only: no names,
-- no phone numbers, no chat. IPs are stored as salted hashes (same as plans).
CREATE TABLE IF NOT EXISTS pools (
  id TEXT PRIMARY KEY,
  film TEXT NOT NULL,
  date TEXT NOT NULL,
  target INTEGER NOT NULL,
  link TEXT NOT NULL DEFAULT '',
  created_at INTEGER NOT NULL,
  ip_hash TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS pools_date ON pools (date);
CREATE TABLE IF NOT EXISTS pool_options (
  pool_id TEXT NOT NULL,
  idx INTEGER NOT NULL,
  cinema TEXT NOT NULL,
  time TEXT NOT NULL,
  PRIMARY KEY (pool_id, idx)
);
-- One row per person (per salted IP hash). opts is a bitmask of the shows that work for them.
CREATE TABLE IF NOT EXISTS pool_joins (
  pool_id TEXT NOT NULL,
  ip_hash TEXT NOT NULL,
  area TEXT NOT NULL,
  opts INTEGER NOT NULL,
  created_at INTEGER NOT NULL,
  PRIMARY KEY (pool_id, ip_hash)
);
CREATE TABLE IF NOT EXISTS pool_reports (pool_id TEXT NOT NULL, ip_hash TEXT NOT NULL, created_at INTEGER NOT NULL, PRIMARY KEY (pool_id, ip_hash));
