package com.finpilot.finpilotbackend.finance.dto;

public class CategoryPredictionResponse {

    private final Long categoryId;
    private final String categoryName;
    private final double confidence;

    public CategoryPredictionResponse(Long categoryId, String categoryName, double confidence) {
        this.categoryId = categoryId;
        this.categoryName = categoryName;
        this.confidence = confidence;
    }

    public Long getCategoryId() {
        return categoryId;
    }

    public String getCategoryName() {
        return categoryName;
    }

    public double getConfidence() {
        return confidence;
    }
}
