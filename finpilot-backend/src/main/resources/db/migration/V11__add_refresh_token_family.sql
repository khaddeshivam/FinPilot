-- Groups refresh tokens into "families": every token issued by rotating another
ALTER TABLE refresh_tokens ADD COLUMN family_id UUID;
-- keeps the old (token-only) revocation behaviour until its next login.
UPDATE refresh_tokens SET family_id = gen_random_uuid();

ALTER TABLE refresh_tokens ALTER COLUMN family_id SET NOT NULL;
CREATE INDEX idx_refresh_tokens_family_id ON refresh_tokens(family_id);
