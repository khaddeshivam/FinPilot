package com.finpilot.finpilotbackend.intelligence.dto;

public class InsightResponse {

    public enum InsightType {
        CATEGORY_SPENDING_INCREASE,
        BUDGET_WARNING,
        BUDGET_EXCEEDED,
        OVERSPENDING,
        POSITIVE_SAVINGS,
        NO_ACTIVITY
    }

    public enum Severity {
        INFO,
        WARNING,
        CRITICAL
    }

    private InsightType type;
    private Severity severity;
    private String message;

    public InsightResponse(InsightType type, Severity severity, String message) {
        this.type = type;
        this.severity = severity;
        this.message = message;
    }

    public InsightType getType() {
        return type;
    }

    public Severity getSeverity() {
        return severity;
    }

    public String getMessage() {
        return message;
    }
}
