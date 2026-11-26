-- Official Peak Pune meetups: RSVPs. The public sees only a count. Name and WhatsApp number are
-- private to the owner (read through /api/admin/meet-rsvps) and used only to add people to the
-- meetup WhatsApp group and message them on the day. IPs are salted hashes, same as plans.
CREATE TABLE IF NOT EXISTS meet_rsvps (
  id TEXT PRIMARY KEY,
  event TEXT NOT NULL,
  name TEXT NOT NULL,
  wa TEXT NOT NULL,
  bring TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  ip_hash TEXT NOT NULL,
  UNIQUE (event, wa)
);
CREATE INDEX IF NOT EXISTS meet_rsvps_event ON meet_rsvps (event, created_at);
