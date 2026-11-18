-- Birthday wall: member birthdays and private member offers to plan, host or join.
-- Phone, Instagram and full date of birth live here so the owner can check community
-- membership and reach people on WhatsApp. Only an approved, projected card is public;
-- year, phone and Instagram never leave the private panel.
CREATE TABLE IF NOT EXISTS birthdays (
  id TEXT PRIMARY KEY,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  wa_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  instagram TEXT NOT NULL,
  dob_day INTEGER NOT NULL,
  dob_month INTEGER NOT NULL,
  dob_year INTEGER NOT NULL,
  show_age INTEGER NOT NULL DEFAULT 0,
  wish TEXT NOT NULL,
  likes TEXT NOT NULL,
  call_reason TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  created_at INTEGER NOT NULL,
  ip_hash TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS birthdays_status ON birthdays (status, dob_month, dob_day);
-- One row per member offer: who offered, which card, what they offered. Private to the owner.
CREATE TABLE IF NOT EXISTS birthday_interest (
  birthday_id TEXT NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('plan','host','join')),
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  ip_hash TEXT NOT NULL,
  PRIMARY KEY (birthday_id, kind, phone)
);
