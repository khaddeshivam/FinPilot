package com.finpilot.finpilotbackend.finance.service;

import com.finpilot.finpilotbackend.finance.dto.CategoryResponse;
import com.finpilot.finpilotbackend.finance.entity.Category;
import com.finpilot.finpilotbackend.finance.exception.ResourceNotFoundException;
import com.finpilot.finpilotbackend.finance.repository.CategoryRepository;
import com.finpilot.finpilotbackend.identity.entity.User;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.stream.Collectors;

@Service
public class CategoryService {

    private final CategoryRepository categoryRepository;

    public CategoryService(CategoryRepository categoryRepository) {
        this.categoryRepository = categoryRepository;
    }

    public List<CategoryResponse> listForUser(User user) {
        return categoryRepository.findAllAvailableToUser(user.getId()).stream()
                .map(CategoryResponse::new)
                .collect(Collectors.toList());
    }

    // Public - used within finance/ (TransactionService) and by other domains
    // that need to validate a category belongs to the user (e.g. planning/
    // when setting a budget against a category).
    public Category findAvailableOrThrow(User user, Long categoryId) {
        return categoryRepository.findByIdAvailableToUser(categoryId, user.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Category not found: " + categoryId));
    }
}
