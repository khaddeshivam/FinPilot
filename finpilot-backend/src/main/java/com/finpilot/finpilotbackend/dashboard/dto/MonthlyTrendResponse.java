package com.finpilot.finpilotbackend.dashboard.dto;

import java.math.BigDecimal;
import java.time.LocalDate;

public class MonthlyTrendResponse {

    private final LocalDate periodMonth;
    private final BigDecimal income;
    private final BigDecimal expense;
    private final BigDecimal net;

    public MonthlyTrendResponse(LocalDate periodMonth, BigDecimal income, BigDecimal expense) {
        this.periodMonth = periodMonth;
        this.income = income;
        this.expense = expense;
        this.net = income.subtract(expense);
    }

    public LocalDate getPeriodMonth() {
        return periodMonth;
    }

    public BigDecimal getIncome() {
        return income;
    }

    public BigDecimal getExpense() {
        return expense;
    }

    public BigDecimal getNet() {
        return net;
    }
}
