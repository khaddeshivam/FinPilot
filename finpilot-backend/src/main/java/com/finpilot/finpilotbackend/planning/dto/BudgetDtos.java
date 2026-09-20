package com.finpilot.finpilotbackend.planning.dto;

import com.finpilot.finpilotbackend.planning.entity.Budget;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;

public class BudgetDtos {

    public static class SetBudgetRequest {
        @NotNull(message = "Category ID is required")
        private Long categoryId;

        @NotNull(message = "Period month is required")
        private LocalDate periodMonth; // any date within the target month; normalized to the 1st

        @NotNull(message = "Amount is required")
        @DecimalMin(value = "0.01", message = "Budget amount must be greater than zero")
        private BigDecimal amount;

        public Long getCategoryId() {
            return categoryId;
        }

        public void setCategoryId(Long categoryId) {
            this.categoryId = categoryId;
        }

        public LocalDate getPeriodMonth() {
            return periodMonth;
        }

        public void setPeriodMonth(LocalDate periodMonth) {
            this.periodMonth = periodMonth;
        }

        public BigDecimal getAmount() {
            return amount;
        }

        public void setAmount(BigDecimal amount) {
            this.amount = amount;
        }
    }

    public enum BudgetStatus {
        ON_TRACK,   // < 80% used
        WARNING,    // 80-100% used
        EXCEEDED    // > 100% used
    }

    public static class BudgetResponse {
        private Long id;
        private Long categoryId;
        private String categoryName;
        private LocalDate periodMonth;
        private BigDecimal budgetedAmount;
        private BigDecimal spentAmount;
        private BigDecimal remainingAmount;
        private BigDecimal percentUsed;
        private BudgetStatus status;

        public BudgetResponse(Budget budget, BigDecimal spentAmount) {
            this.id = budget.getId();
            this.categoryId = budget.getCategory().getId();
            this.categoryName = budget.getCategory().getName();
            this.periodMonth = budget.getPeriodMonth();
            this.budgetedAmount = budget.getAmount();
            this.spentAmount = spentAmount;
            this.remainingAmount = budget.getAmount().subtract(spentAmount);

            this.percentUsed = budget.getAmount().compareTo(BigDecimal.ZERO) == 0
                    ? BigDecimal.ZERO
                    : spentAmount.divide(budget.getAmount(), 4, RoundingMode.HALF_UP)
                        .multiply(BigDecimal.valueOf(100));

            if (this.percentUsed.compareTo(BigDecimal.valueOf(100)) > 0) {
                this.status = BudgetStatus.EXCEEDED;
            } else if (this.percentUsed.compareTo(BigDecimal.valueOf(80)) >= 0) {
                this.status = BudgetStatus.WARNING;
            } else {
                this.status = BudgetStatus.ON_TRACK;
            }
        }

        public Long getId() {
            return id;
        }

        public Long getCategoryId() {
            return categoryId;
        }

        public String getCategoryName() {
            return categoryName;
        }

        public LocalDate getPeriodMonth() {
            return periodMonth;
        }

        public BigDecimal getBudgetedAmount() {
            return budgetedAmount;
        }

        public BigDecimal getSpentAmount() {
            return spentAmount;
        }

        public BigDecimal getRemainingAmount() {
            return remainingAmount;
        }

        public BigDecimal getPercentUsed() {
            return percentUsed;
        }

        public BudgetStatus getStatus() {
            return status;
        }
    }
}
