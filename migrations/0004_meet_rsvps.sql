-- Legacy RSVP table retained for existing entries. New submissions store no attendee phone number.
CREATE TABLE IF NOT EXISTS meet_rsvps (id TEXT PRIMARY KEY, event TEXT NOT NULL, name TEXT NOT NULL, wa TEXT NOT NULL, bring TEXT NOT NULL, created_at INTEGER NOT NULL, ip_hash TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'confirmed', UNIQUE (event, wa));
CREATE INDEX IF NOT EXISTS meet_rsvps_event ON meet_rsvps (event, created_at);

CREATE TABLE IF NOT EXISTS meet_rsvp_interest (
  id TEXT PRIMARY KEY, event TEXT NOT NULL, name TEXT NOT NULL, day TEXT NOT NULL,
  activities TEXT NOT NULL, note TEXT NOT NULL DEFAULT '', status TEXT NOT NULL DEFAULT 'confirmed',
  created_at INTEGER NOT NULL, ip_hash TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS meet_rsvp_interest_event ON meet_rsvp_interest (event, created_at);
