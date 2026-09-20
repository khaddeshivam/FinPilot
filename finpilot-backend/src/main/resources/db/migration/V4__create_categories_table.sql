CREATE TABLE categories (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    category_type VARCHAR(20) NOT NULL,
    is_default BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP NOT NULL DEFAULT now()
);

CREATE INDEX idx_categories_user_id ON categories(user_id);

-- Global default categories (user_id NULL) available to every user out of the box.
-- Users can still create their own on top of these later.
INSERT INTO categories (user_id, name, category_type, is_default) VALUES
    (NULL, 'Food', 'EXPENSE', TRUE),
    (NULL, 'Transport', 'EXPENSE', TRUE),
    (NULL, 'Rent', 'EXPENSE', TRUE),
    (NULL, 'Utilities', 'EXPENSE', TRUE),
    (NULL, 'Shopping', 'EXPENSE', TRUE),
    (NULL, 'Entertainment', 'EXPENSE', TRUE),
    (NULL, 'Health', 'EXPENSE', TRUE),
    (NULL, 'Other', 'EXPENSE', TRUE),
    (NULL, 'Salary', 'INCOME', TRUE),
    (NULL, 'Freelance', 'INCOME', TRUE),
    (NULL, 'Other Income', 'INCOME', TRUE);
