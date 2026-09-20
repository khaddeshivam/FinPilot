package com.finpilot.finpilotbackend.dashboard.dto;

import com.finpilot.finpilotbackend.finance.dto.TransactionDtos.TransactionResponse;
import com.finpilot.finpilotbackend.planning.dto.BudgetDtos.BudgetResponse;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

public class DashboardResponse {

    private LocalDate periodMonth;
    private BigDecimal totalBalance;
    private BigDecimal monthlyIncome;
    private BigDecimal monthlyExpense;
    private BigDecimal netSavings;
    private List<BudgetResponse> budgets;
    private List<TransactionResponse> recentTransactions;
    private List<CategoryBreakdown> expenseByCategory;

    public DashboardResponse(
            LocalDate periodMonth,
            BigDecimal totalBalance,
            BigDecimal monthlyIncome,
            BigDecimal monthlyExpense,
            List<BudgetResponse> budgets,
            List<TransactionResponse> recentTransactions,
            List<CategoryBreakdown> expenseByCategory
    ) {
        this.periodMonth = periodMonth;
        this.totalBalance = totalBalance;
        this.monthlyIncome = monthlyIncome;
        this.monthlyExpense = monthlyExpense;
        this.netSavings = monthlyIncome.subtract(monthlyExpense);
        this.budgets = budgets;
        this.recentTransactions = recentTransactions;
        this.expenseByCategory = expenseByCategory;
    }

    public LocalDate getPeriodMonth() {
        return periodMonth;
    }

    public BigDecimal getTotalBalance() {
        return totalBalance;
    }

    public BigDecimal getMonthlyIncome() {
        return monthlyIncome;
    }

    public BigDecimal getMonthlyExpense() {
        return monthlyExpense;
    }

    public BigDecimal getNetSavings() {
        return netSavings;
    }

    public List<BudgetResponse> getBudgets() {
        return budgets;
    }

    public List<TransactionResponse> getRecentTransactions() {
        return recentTransactions;
    }

    public List<CategoryBreakdown> getExpenseByCategory() {
        return expenseByCategory;
    }

    public static class CategoryBreakdown {
        private String categoryName;
        private BigDecimal amount;

        public CategoryBreakdown(String categoryName, BigDecimal amount) {
            this.categoryName = categoryName;
            this.amount = amount;
        }

        public String getCategoryName() {
            return categoryName;
        }

        public BigDecimal getAmount() {
            return amount;
        }
    }
}
