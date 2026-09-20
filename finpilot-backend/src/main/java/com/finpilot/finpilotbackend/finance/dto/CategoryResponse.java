package com.finpilot.finpilotbackend.finance.dto;

import com.finpilot.finpilotbackend.finance.entity.Category;
import com.finpilot.finpilotbackend.finance.entity.CategoryType;

public class CategoryResponse {
    private Long id;
    private String name;
    private CategoryType categoryType;
    private boolean isDefault;

    public CategoryResponse(Category category) {
        this.id = category.getId();
        this.name = category.getName();
        this.categoryType = category.getCategoryType();
        this.isDefault = category.isDefault();
    }

    public Long getId() {
        return id;
    }

    public String getName() {
        return name;
    }

    public CategoryType getCategoryType() {
        return categoryType;
    }

    public boolean isDefault() {
        return isDefault;
    }
}
