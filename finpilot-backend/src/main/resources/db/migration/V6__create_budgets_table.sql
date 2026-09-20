CREATE TABLE budgets (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    category_id BIGINT NOT NULL REFERENCES categories(id),
    period_month DATE NOT NULL, -- always stored as the 1st of the month, e.g. 2026-08-01
    amount NUMERIC(19, 2) NOT NULL CHECK (amount > 0),
    created_at TIMESTAMP NOT NULL DEFAULT now(),
    updated_at TIMESTAMP NOT NULL DEFAULT now(),
    -- One budget per category per month per user - re-setting a budget for the
    -- same category/month should be an update, not a duplicate row.
    CONSTRAINT uq_budget_user_category_month UNIQUE (user_id, category_id, period_month)
);

CREATE INDEX idx_budgets_user_period ON budgets(user_id, period_month);
