-- Contact markers are admin-only metadata; RSVP rows are not rewritten by mark-contacted.
CREATE TABLE IF NOT EXISTS meet_rsvp_admin_meta (
  event TEXT NOT NULL,
  source TEXT NOT NULL,
  rsvp_id TEXT NOT NULL,
  contacted_at INTEGER,
  PRIMARY KEY (event, source, rsvp_id)
);
