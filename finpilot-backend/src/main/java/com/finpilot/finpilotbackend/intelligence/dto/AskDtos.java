package com.finpilot.finpilotbackend.intelligence.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

public class AskDtos {

    public static class AskRequest {
        @NotBlank(message = "Question is required")
        @Size(max = 500, message = "Question must be under 500 characters")
        private String question;

        public String getQuestion() {
            return question;
        }

        public void setQuestion(String question) {
            this.question = question;
        }
    }

    // citedTransactions is the traceability piece that separates this from
    // NarrativeService's plain narration - the caller can see EXACTLY which
    // transactions grounded the answer, not just trust the text blindly.
    public static class AskResponse {
        private final String answer;
        private final List<CitedTransaction> citedTransactions;

        public AskResponse(String answer, List<CitedTransaction> citedTransactions) {
            this.answer = answer;
            this.citedTransactions = citedTransactions;
        }

        public String getAnswer() {
            return answer;
        }

        public List<CitedTransaction> getCitedTransactions() {
            return citedTransactions;
        }
    }

    public static class CitedTransaction {
        private final Long id;
        private final String description;
        private final BigDecimal amount;
        private final String categoryName;
        private final LocalDate transactionDate;

        public CitedTransaction(Long id, String description, BigDecimal amount, String categoryName, LocalDate transactionDate) {
            this.id = id;
            this.description = description;
            this.amount = amount;
            this.categoryName = categoryName;
            this.transactionDate = transactionDate;
        }

        public Long getId() {
            return id;
        }

        public String getDescription() {
            return description;
        }

        public BigDecimal getAmount() {
            return amount;
        }

        public String getCategoryName() {
            return categoryName;
        }

        public LocalDate getTransactionDate() {
            return transactionDate;
        }
    }
}
