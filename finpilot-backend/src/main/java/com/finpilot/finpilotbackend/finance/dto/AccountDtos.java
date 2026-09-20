package com.finpilot.finpilotbackend.finance.dto;

import com.finpilot.finpilotbackend.finance.entity.Account;
import com.finpilot.finpilotbackend.finance.entity.AccountType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;
import java.time.LocalDateTime;

public class AccountDtos {

    public static class CreateAccountRequest {
        @NotBlank(message = "Account name is required")
        private String name;

        @NotNull(message = "Account type is required")
        private AccountType accountType;

        // Optional - defaults to 0 if not provided (a fresh account with no history yet)
        private BigDecimal openingBalance = BigDecimal.ZERO;

        public String getName() {
            return name;
        }

        public void setName(String name) {
            this.name = name;
        }

        public AccountType getAccountType() {
            return accountType;
        }

        public void setAccountType(AccountType accountType) {
            this.accountType = accountType;
        }

        public BigDecimal getOpeningBalance() {
            return openingBalance;
        }

        public void setOpeningBalance(BigDecimal openingBalance) {
            this.openingBalance = openingBalance;
        }
    }

    public static class AccountResponse {
        private Long id;
        private String name;
        private AccountType accountType;
        private BigDecimal balance;
        private String currency;
        private LocalDateTime createdAt;

        public AccountResponse(Account account) {
            this.id = account.getId();
            this.name = account.getName();
            this.accountType = account.getAccountType();
            this.balance = account.getBalance();
            this.currency = account.getCurrency();
            this.createdAt = account.getCreatedAt();
        }

        public Long getId() {
            return id;
        }

        public String getName() {
            return name;
        }

        public AccountType getAccountType() {
            return accountType;
        }

        public BigDecimal getBalance() {
            return balance;
        }

        public String getCurrency() {
            return currency;
        }

        public LocalDateTime getCreatedAt() {
            return createdAt;
        }
    }
}
