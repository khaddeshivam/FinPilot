-- Adds a deduplication fingerprint column to transactions.
-- The fingerprint is a stable hash of (account_id, transaction_date, amount, normalised description)
-- computed and stored by the application layer on every import row. The unique
-- constraint means re-uploading the same statement skips already-imported rows
-- instead of doubling them.
--
-- Manually-entered transactions set import_fingerprint = NULL, which is always
-- unique (NULL != NULL in SQL unique constraints) so they never conflict.
ALTER TABLE transactions ADD COLUMN import_fingerprint VARCHAR(64);
CREATE UNIQUE INDEX uq_transactions_import_fingerprint
    ON transactions(import_fingerprint)
    WHERE import_fingerprint IS NOT NULL;
