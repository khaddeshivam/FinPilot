package com.finpilot.finpilotbackend.intelligence.dto;

import java.math.BigDecimal;

public class HealthScoreResponse {

    public enum HealthLabel {
        EXCELLENT,   // >= 80
        GOOD,        // >= 60
        FAIR,        // >= 40
        NEEDS_ATTENTION // < 40
    }

    private int score; // 0-100
    private HealthLabel label;
    private BigDecimal savingsRate; // percentage, can be negative
    private BigDecimal budgetAdherence; // percentage, null if no budgets set

    public HealthScoreResponse(int score, HealthLabel label, BigDecimal savingsRate, BigDecimal budgetAdherence) {
        this.score = score;
        this.label = label;
        this.savingsRate = savingsRate;
        this.budgetAdherence = budgetAdherence;
    }

    public int getScore() {
        return score;
    }

    public HealthLabel getLabel() {
        return label;
    }

    public BigDecimal getSavingsRate() {
        return savingsRate;
    }

    public BigDecimal getBudgetAdherence() {
        return budgetAdherence;
    }
}
