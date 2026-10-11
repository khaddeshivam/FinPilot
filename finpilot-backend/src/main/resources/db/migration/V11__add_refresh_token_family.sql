-- Groups refresh tokens into "families": every token issued by rotating another
-- token shares that token's family_id, and a fresh login starts a new family.
-- This lets the application revoke an entire login session at once - on logout,
-- and when a revoked token is presented again (a sign it was stolen/replayed).
ALTER TABLE refresh_tokens ADD COLUMN family_id UUID;

-- Existing rows cannot have their rotation chains reconstructed, so each one
-- becomes its own single-token family. Worst case, a pre-migration session
-- keeps the old (token-only) revocation behaviour until its next login.
UPDATE refresh_tokens SET family_id = gen_random_uuid();

ALTER TABLE refresh_tokens ALTER COLUMN family_id SET NOT NULL;
CREATE INDEX idx_refresh_tokens_family_id ON refresh_tokens(family_id);
