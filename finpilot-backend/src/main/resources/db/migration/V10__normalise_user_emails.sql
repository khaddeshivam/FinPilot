DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM users GROUP BY lower(email) HAVING count(*) > 1) THEN
    RAISE EXCEPTION 'V10 aborted: accounts differ only by email case. Fix them manually first.';
  END IF;
END $$;


-- Normalise all existing email addresses to lower-case so that:
--   1. Legacy rows stored with mixed case (e.g. "User@example.com") are found
--      by the new Locale.ROOT toLowerCase() lookup in UserService and AuthService.
--   2. The functional unique index below gives the database a case-insensitive
--      uniqueness guarantee independently of the application layer.
--
-- The UPDATE will fail if two existing rows differ only in case (i.e. both
-- "User@example.com" and "user@example.com" are present), which is the correct
-- behaviour: that data is already corrupt and must be resolved manually before
-- the migration can proceed.
UPDATE users SET email = lower(email);

-- Drop the old case-sensitive unique constraint that was added in V1 and replace
-- it with a functional index on lower(email).  This means the DB enforces
-- case-insensitive uniqueness even if a future code path forgets to normalise.
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_email_key;
CREATE UNIQUE INDEX uq_users_email_lower ON users (lower(email));
