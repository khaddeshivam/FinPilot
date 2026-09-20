-- Transactions became editable in this release - added updated_at to match
-- the created_at/updated_at pattern accounts and budgets already use.
ALTER TABLE transactions ADD COLUMN updated_at TIMESTAMP NOT NULL DEFAULT now();
