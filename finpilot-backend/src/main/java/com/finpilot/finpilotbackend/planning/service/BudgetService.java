package com.finpilot.finpilotbackend.planning.service;

import com.finpilot.finpilotbackend.finance.entity.Category;
import com.finpilot.finpilotbackend.finance.entity.CategoryType;
import com.finpilot.finpilotbackend.finance.repository.TransactionRepository;
import com.finpilot.finpilotbackend.finance.service.CategoryService;
import com.finpilot.finpilotbackend.identity.entity.User;
import com.finpilot.finpilotbackend.planning.dto.BudgetDtos.BudgetResponse;
import com.finpilot.finpilotbackend.planning.dto.BudgetDtos.SetBudgetRequest;
import com.finpilot.finpilotbackend.planning.entity.Budget;
import com.finpilot.finpilotbackend.planning.exception.InvalidBudgetException;
import com.finpilot.finpilotbackend.planning.repository.BudgetRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.stream.Collectors;

@Service
public class BudgetService {

    private final BudgetRepository budgetRepository;
    private final TransactionRepository transactionRepository;
    private final CategoryService categoryService;

    public BudgetService(
            BudgetRepository budgetRepository,
            TransactionRepository transactionRepository,
            CategoryService categoryService
    ) {
        this.budgetRepository = budgetRepository;
        this.transactionRepository = transactionRepository;
        this.categoryService = categoryService;
    }

    // Setting a budget for a category/month that already has one is an update,
    // not a duplicate - enforced by the unique constraint in V6, but we check
    // first here to update in place rather than let the DB throw.
    @Transactional
    public BudgetResponse setBudget(User user, SetBudgetRequest request) {
        Category category = categoryService.findAvailableOrThrow(user, request.getCategoryId());

        if (category.getCategoryType() != CategoryType.EXPENSE) {
            throw new InvalidBudgetException(
                    "Budgets can only be set on EXPENSE categories, '" + category.getName() + "' is " + category.getCategoryType()
            );
        }

        LocalDate normalizedMonth = request.getPeriodMonth().withDayOfMonth(1);

        Budget budget = budgetRepository
                .findByUserIdAndCategoryIdAndPeriodMonth(user.getId(), category.getId(), normalizedMonth)
                .orElse(null);

        if (budget == null) {
            budget = new Budget(user, category, normalizedMonth, request.getAmount());
        } else {
            budget.setAmount(request.getAmount());
        }

        Budget saved = budgetRepository.save(budget);
        return toResponse(saved);
    }

    public List<BudgetResponse> listForMonth(User user, LocalDate anyDateInMonth) {
        LocalDate normalizedMonth = anyDateInMonth.withDayOfMonth(1);
        return budgetRepository.findByUserIdAndPeriodMonth(user.getId(), normalizedMonth).stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    private BudgetResponse toResponse(Budget budget) {
        LocalDate startOfMonth = budget.getPeriodMonth();
        LocalDate startOfNextMonth = startOfMonth.plusMonths(1);

        BigDecimal spent = transactionRepository.sumByCategoryAndDateRange(
                budget.getUser().getId(),
                budget.getCategory().getId(),
                CategoryType.EXPENSE,
                startOfMonth,
                startOfNextMonth
        );
        // The query returns null (not zero) when there are no matching transactions.
        if (spent == null) {
            spent = BigDecimal.ZERO;
        }

        return new BudgetResponse(budget, spent);
    }
}
