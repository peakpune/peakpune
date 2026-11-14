CREATE TABLE IF NOT EXISTS plans (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL, date TEXT NOT NULL, time TEXT NOT NULL DEFAULT '',
  area TEXT NOT NULL, venue TEXT NOT NULL DEFAULT '', link TEXT NOT NULL DEFAULT '',
  image_key TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  created_at INTEGER NOT NULL, ip_hash TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS plans_status_date ON plans (status, date);
CREATE TABLE IF NOT EXISTS rate (ip_hash TEXT NOT NULL, hour INTEGER NOT NULL, n INTEGER NOT NULL, PRIMARY KEY (ip_hash, hour));
CREATE TABLE IF NOT EXISTS reports (plan_id TEXT NOT NULL, ip_hash TEXT NOT NULL, created_at INTEGER NOT NULL, PRIMARY KEY (plan_id, ip_hash));
CREATE TABLE IF NOT EXISTS going (plan_id TEXT NOT NULL, ip_hash TEXT NOT NULL, created_at INTEGER NOT NULL, PRIMARY KEY (plan_id, ip_hash));
