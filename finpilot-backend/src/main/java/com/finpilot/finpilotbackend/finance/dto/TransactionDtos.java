package com.finpilot.finpilotbackend.finance.dto;

import com.finpilot.finpilotbackend.finance.entity.CategoryType;
import com.finpilot.finpilotbackend.finance.entity.Transaction;
import jakarta.validation.constraints.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

public class TransactionDtos {

    public static class CreateTransactionRequest {
        @NotNull(message = "Account ID is required")
        private Long accountId;

        @NotNull(message = "Category ID is required")
        private Long categoryId;

        @NotNull(message = "Transaction type is required")
        private CategoryType transactionType;

        @NotNull(message = "Amount is required")
        @DecimalMin(value = "0.01", message = "Amount must be greater than zero")
        private BigDecimal amount;

        @Size(max = 500)
        private String description;

        @NotNull(message = "Transaction date is required")
        @PastOrPresent(message = "Transaction date cannot be in the future")
        private LocalDate transactionDate;

        public Long getAccountId() {
            return accountId;
        }

        public void setAccountId(Long accountId) {
            this.accountId = accountId;
        }

        public Long getCategoryId() {
            return categoryId;
        }

        public void setCategoryId(Long categoryId) {
            this.categoryId = categoryId;
        }

        public CategoryType getTransactionType() {
            return transactionType;
        }

        public void setTransactionType(CategoryType transactionType) {
            this.transactionType = transactionType;
        }

        public BigDecimal getAmount() {
            return amount;
        }

        public void setAmount(BigDecimal amount) {
            this.amount = amount;
        }

        public String getDescription() {
            return description;
        }

        public void setDescription(String description) {
            this.description = description;
        }

        public LocalDate getTransactionDate() {
            return transactionDate;
        }

        public void setTransactionDate(LocalDate transactionDate) {
            this.transactionDate = transactionDate;
        }
    }

    public static class TransactionResponse {
        private Long id;
        private Long accountId;
        private Long categoryId;
        private String categoryName;
        private CategoryType transactionType;
        private BigDecimal amount;
        private String description;
        private LocalDate transactionDate;
        private LocalDateTime createdAt;
        private LocalDateTime updatedAt;

        public TransactionResponse(Transaction transaction) {
            this.id = transaction.getId();
            this.accountId = transaction.getAccount().getId();
            this.categoryId = transaction.getCategory().getId();
            this.categoryName = transaction.getCategory().getName();
            this.transactionType = transaction.getTransactionType();
            this.amount = transaction.getAmount();
            this.description = transaction.getDescription();
            this.transactionDate = transaction.getTransactionDate();
            this.createdAt = transaction.getCreatedAt();
            this.updatedAt = transaction.getUpdatedAt();
        }

        public Long getId() {
            return id;
        }

        public Long getAccountId() {
            return accountId;
        }

        public Long getCategoryId() {
            return categoryId;
        }

        public String getCategoryName() {
            return categoryName;
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
    }
}
