package com.finpilot.finpilotbackend.finance.entity;

import com.finpilot.finpilotbackend.identity.entity.User;
import jakarta.persistence.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "transactions")
public class Transaction {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "account_id", nullable = false)
    private Account account;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "category_id", nullable = false)
    private Category category;

    // Mirrors CategoryType deliberately - a transaction's type must always
    // match the type of the category it's filed under (enforced in the
    // service layer, not just trusted from the client).
    @Enumerated(EnumType.STRING)
    @Column(name = "transaction_type", nullable = false)
    private CategoryType transactionType;

    @Column(nullable = false, precision = 19, scale = 2)
    private BigDecimal amount;

    @Column(length = 500)
    private String description;

    @Column(name = "transaction_date", nullable = false)
    private LocalDate transactionDate;

    // Set only for CSV-imported transactions. The unique index on this column
    // prevents a repeat upload of the same statement from creating duplicate rows.
    // NULL for manually-entered transactions (NULL != NULL in SQL, so no conflict).
    @Column(name = "import_fingerprint", length = 64)
    private String importFingerprint;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    // Added when edit support was introduced - matches the created_at/
    // updated_at pattern Account and Budget already use, so every mutable
    // financial record tracks both consistently.
    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
        this.updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        this.updatedAt = LocalDateTime.now();
    }

    public Transaction() {
    }

    public Transaction(User user, Account account, Category category, CategoryType transactionType,
                        BigDecimal amount, String description, LocalDate transactionDate) {
        this.user = user;
        this.account = account;
        this.category = category;
        this.transactionType = transactionType;
        this.amount = amount;
        this.description = description;
        this.transactionDate = transactionDate;
    }

    public Long getId() {
        return id;
    }

    public User getUser() {
        return user;
    }

    public Account getAccount() {
        return account;
    }

    public Category getCategory() {
        return category;
    }

    public CategoryType getTransactionType() {
        return transactionType;
    }

    public BigDecimal getAmount() {
        return amount;
    }

    public String getDescription() {
        return description;
    }

    public LocalDate getTransactionDate() {
        return transactionDate;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public LocalDateTime getUpdatedAt() {
        return updatedAt;
    }

    // Setters only for fields an edit can actually change - id, user, and
    // createdAt stay immutable. account/category/type are all set together
    // by TransactionService.update() after ownership and type-match
    // validation, never individually from unvalidated client input.
    public void setAccount(Account account) {
        this.account = account;
    }

    public void setCategory(Category category) {
        this.category = category;
    }

    public void setTransactionType(CategoryType transactionType) {
        this.transactionType = transactionType;
    }

    public void setAmount(BigDecimal amount) {
        this.amount = amount;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public void setTransactionDate(LocalDate transactionDate) {
        this.transactionDate = transactionDate;
    }

    public String getImportFingerprint() {
        return importFingerprint;
    }

    public void setImportFingerprint(String importFingerprint) {
        this.importFingerprint = importFingerprint;
    }
}
