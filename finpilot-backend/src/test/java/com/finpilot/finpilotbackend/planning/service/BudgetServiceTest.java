package com.finpilot.finpilotbackend.planning.service;

import com.finpilot.finpilotbackend.finance.entity.Category;
import com.finpilot.finpilotbackend.finance.entity.CategoryType;
import com.finpilot.finpilotbackend.finance.repository.TransactionRepository;
import com.finpilot.finpilotbackend.finance.service.CategoryService;
import com.finpilot.finpilotbackend.identity.entity.User;
import com.finpilot.finpilotbackend.planning.dto.BudgetDtos.BudgetResponse;
import com.finpilot.finpilotbackend.planning.dto.BudgetDtos.BudgetStatus;
import com.finpilot.finpilotbackend.planning.dto.BudgetDtos.SetBudgetRequest;
import com.finpilot.finpilotbackend.planning.entity.Budget;
import com.finpilot.finpilotbackend.planning.exception.InvalidBudgetException;
import com.finpilot.finpilotbackend.planning.repository.BudgetRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;

// Covers the exact 80% / 100% status thresholds - the boundary between
// ON_TRACK, WARNING, and EXCEEDED is the whole point of a budget feature,
// so it's the part most worth pinning down with a test rather than trusting
// by eye.
@ExtendWith(MockitoExtension.class)
class BudgetServiceTest {

    @Mock
    private BudgetRepository budgetRepository;
    @Mock
    private TransactionRepository transactionRepository;
    @Mock
    private CategoryService categoryService;

    private BudgetService budgetService;

    private User user;
    private Category foodCategory;
    private final LocalDate month = LocalDate.of(2026, 8, 1);

    @BeforeEach
    void setUp() {
        budgetService = new BudgetService(budgetRepository, transactionRepository, categoryService);
        user = new User("user@example.com", "hashed", "Test User");
        foodCategory = new Category(user, "Food", CategoryType.EXPENSE);
    }

    @Test
    void spendingUnder80PercentIsOnTrack() {
        Budget budget = new Budget(user, foodCategory, month, BigDecimal.valueOf(1000));
        when(budgetRepository.findByUserIdAndPeriodMonth(user.getId(), month)).thenReturn(java.util.List.of(budget));
        when(transactionRepository.sumByCategoryAndDateRange(any(), any(), eq(CategoryType.EXPENSE), any(), any()))
                .thenReturn(BigDecimal.valueOf(700)); // 70%

        BudgetResponse response = budgetService.listForMonth(user, month).get(0);

        assertThat(response.getStatus()).isEqualTo(BudgetStatus.ON_TRACK);
    }

    @Test
    void spendingAtExactly80PercentIsWarning() {
        // Boundary case - the service uses >= 80 for WARNING, so exactly 80%
        // must already be a warning, not still on-track.
        Budget budget = new Budget(user, foodCategory, month, BigDecimal.valueOf(1000));
        when(budgetRepository.findByUserIdAndPeriodMonth(user.getId(), month)).thenReturn(java.util.List.of(budget));
        when(transactionRepository.sumByCategoryAndDateRange(any(), any(), eq(CategoryType.EXPENSE), any(), any()))
                .thenReturn(BigDecimal.valueOf(800)); // exactly 80%

        BudgetResponse response = budgetService.listForMonth(user, month).get(0);

        assertThat(response.getStatus()).isEqualTo(BudgetStatus.WARNING);
    }

    @Test
    void spendingOver100PercentIsExceeded() {
        Budget budget = new Budget(user, foodCategory, month, BigDecimal.valueOf(1000));
        when(budgetRepository.findByUserIdAndPeriodMonth(user.getId(), month)).thenReturn(java.util.List.of(budget));
        when(transactionRepository.sumByCategoryAndDateRange(any(), any(), eq(CategoryType.EXPENSE), any(), any()))
                .thenReturn(BigDecimal.valueOf(1250)); // 125%

        BudgetResponse response = budgetService.listForMonth(user, month).get(0);

        assertThat(response.getStatus()).isEqualTo(BudgetStatus.EXCEEDED);
        assertThat(response.getRemainingAmount()).isEqualByComparingTo(BigDecimal.valueOf(-250));
    }

    @Test
    void noTransactionsYetMeansZeroSpentNotNull() {
        // The repository query returns null (not zero) when nothing matches -
        // this test pins down that BudgetService normalizes that itself,
        // rather than leaking a NullPointerException into the response.
        Budget budget = new Budget(user, foodCategory, month, BigDecimal.valueOf(1000));
        when(budgetRepository.findByUserIdAndPeriodMonth(user.getId(), month)).thenReturn(java.util.List.of(budget));
        when(transactionRepository.sumByCategoryAndDateRange(any(), any(), eq(CategoryType.EXPENSE), any(), any()))
                .thenReturn(null);

        BudgetResponse response = budgetService.listForMonth(user, month).get(0);

        assertThat(response.getSpentAmount()).isEqualByComparingTo(BigDecimal.ZERO);
        assertThat(response.getStatus()).isEqualTo(BudgetStatus.ON_TRACK);
    }

    @Test
    void settingBudgetOnIncomeCategoryIsRejected() {
        Category salaryCategory = new Category(user, "Salary", CategoryType.INCOME);
        SetBudgetRequest request = new SetBudgetRequest();
        request.setCategoryId(5L);
        request.setPeriodMonth(month);
        request.setAmount(BigDecimal.valueOf(500));

        when(categoryService.findAvailableOrThrow(user, 5L)).thenReturn(salaryCategory);

        assertThatThrownBy(() -> budgetService.setBudget(user, request))
                .isInstanceOf(InvalidBudgetException.class)
                .hasMessageContaining("EXPENSE categories");
    }

    @Test
    void settingBudgetForExistingCategoryMonthUpdatesRatherThanDuplicates() {
        Budget existing = new Budget(user, foodCategory, month, BigDecimal.valueOf(1000));
        SetBudgetRequest request = new SetBudgetRequest();
        request.setCategoryId(1L);
        request.setPeriodMonth(month);
        request.setAmount(BigDecimal.valueOf(1500)); // updated limit

        when(categoryService.findAvailableOrThrow(user, 1L)).thenReturn(foodCategory);
        when(budgetRepository.findByUserIdAndCategoryIdAndPeriodMonth(user.getId(), foodCategory.getId(), month))
                .thenReturn(Optional.of(existing));
        when(budgetRepository.save(any(Budget.class))).thenAnswer(inv -> inv.getArgument(0));
        when(transactionRepository.sumByCategoryAndDateRange(any(), any(), eq(CategoryType.EXPENSE), any(), any()))
                .thenReturn(BigDecimal.ZERO);

        BudgetResponse response = budgetService.setBudget(user, request);

        // The amount on the SAME budget object should be updated, not a
        // second budget created alongside it.
        assertThat(response.getBudgetedAmount()).isEqualByComparingTo(BigDecimal.valueOf(1500));
        assertThat(existing.getAmount()).isEqualByComparingTo(BigDecimal.valueOf(1500));
    }
}
