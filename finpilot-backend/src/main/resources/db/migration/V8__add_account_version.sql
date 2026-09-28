-- Adds the optimistic-locking version column to accounts.
-- Existing rows default to 0 so they are immediately valid for JPA @Version
-- without any manual data migration.
ALTER TABLE accounts ADD COLUMN version BIGINT NOT NULL DEFAULT 0;
