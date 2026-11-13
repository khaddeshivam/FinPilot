-- Speeds up the dashboard queries that filter one user's transactions by a
-- date range (monthly totals, category breakdown, trend chart). The existing
-- single-column indexes on user_id and transaction_date cannot serve both
-- conditions together.
CREATE INDEX idx_transactions_user_date ON transactions(user_id, transaction_date);