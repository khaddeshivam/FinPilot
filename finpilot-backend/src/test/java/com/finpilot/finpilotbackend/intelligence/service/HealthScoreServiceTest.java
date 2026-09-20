package com.finpilot.finpilotbackend.intelligence.service;

import com.finpilot.finpilotbackend.finance.entity.Category;
import com.finpilot.finpilotbackend.finance.entity.CategoryType;
import com.finpilot.finpilotbackend.finance.repository.TransactionRepository;
import com.finpilot.finpilotbackend.identity.entity.User;
import com.finpilot.finpilotbackend.intelligence.dto.HealthScoreResponse;
import com.finpilot.finpilotbackend.intelligence.dto.HealthScoreResponse.HealthLabel;
import com.finpilot.finpilotbackend.planning.dto.BudgetDtos.BudgetResponse;
import com.finpilot.finpilotbackend.planning.entity.Budget;
import com.finpilot.finpilotbackend.planning.service.BudgetService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;

// The health score is deliberately a simple, explainable 60/40 weighted
// formula (savings rate + budget adherence) - these tests pin down the
// weighting and the edge cases (no income yet, no budgets set yet) that are
// easy to get subtly wrong with BigDecimal division.
@ExtendWith(MockitoExtension.class)
class HealthScoreServiceTest {

    @Mock
    private TransactionRepository transactionRepository;
    @Mock
    private BudgetService budgetService;

    private HealthScoreService healthScoreService;

    private User user;
    private final LocalDate month = LocalDate.of(2026, 8, 1);

    @BeforeEach
    void setUp() {
        healthScoreService = new HealthScoreService(transactionRepository, budgetService);
        user = new User("user@example.com", "hashed", "Test User");
    }

    @Test
    void perfectSavingsWithNoBudgetsSetGivesNeutralBudgetComponent() {
        // 100% savings rate (spent nothing), no budgets exist yet.
        // Score = savingsScore(100) * 0.6 + neutralBudgetScore(70) * 0.4 = 60 + 28 = 88
        when(transactionRepository.sumByTypeAndDateRange(any(), eq(CategoryType.INCOME), any(), any()))
                .thenReturn(BigDecimal.valueOf(10000));
        when(transactionRepository.sumByTypeAndDateRange(any(), eq(CategoryType.EXPENSE), any(), any()))
                .thenReturn(BigDecimal.ZERO);
        when(budgetService.listForMonth(user, month)).thenReturn(List.of());

        HealthScoreResponse response = healthScoreService.calculate(user, month);

        assertThat(response.getScore()).isEqualTo(88);
        assertThat(response.getBudgetAdherence()).isNull(); // no budgets - null, not zero
        assertThat(response.getLabel()).isEqualTo(HealthLabel.EXCELLENT);
    }

    @Test
    void overspendingClampsToZeroNotNegativeScore() {
        // Spent more than earned - savings rate is negative, but the score
        // component must clamp to 0, not go negative and skew the weighted total.
        when(transactionRepository.sumByTypeAndDateRange(any(), eq(CategoryType.INCOME), any(), any()))
                .thenReturn(BigDecimal.valueOf(10000));
        when(transactionRepository.sumByTypeAndDateRange(any(), eq(CategoryType.EXPENSE), any(), any()))
                .thenReturn(BigDecimal.valueOf(15000));
        when(budgetService.listForMonth(user, month)).thenReturn(List.of());

        HealthScoreResponse response = healthScoreService.calculate(user, month);

        // savingsRate is -50%, but clamped score component is 0.
        // Score = 0 * 0.6 + 70 * 0.4 = 28
        assertThat(response.getSavingsRate()).isEqualByComparingTo(BigDecimal.valueOf(-50));
        assertThat(response.getScore()).isEqualTo(28);
        assertThat(response.getLabel()).isEqualTo(HealthLabel.NEEDS_ATTENTION);
    }

    @Test
    void noIncomeYetIsNeutralNotPenalized() {
        when(transactionRepository.sumByTypeAndDateRange(any(), eq(CategoryType.INCOME), any(), any()))
                .thenReturn(null);
        when(transactionRepository.sumByTypeAndDateRange(any(), eq(CategoryType.EXPENSE), any(), any()))
                .thenReturn(null);
        when(budgetService.listForMonth(user, month)).thenReturn(List.of());

        HealthScoreResponse response = healthScoreService.calculate(user, month);

        assertThat(response.getSavingsRate()).isEqualByComparingTo(BigDecimal.ZERO);
    }

    @Test
    void budgetAdherenceAveragesAcrossMultipleBudgetStatuses() {
        Category groceries = new Category(user, "Groceries", CategoryType.EXPENSE);
        Category rent = new Category(user, "Rent", CategoryType.EXPENSE);

        Budget onTrackBudget = new Budget(user, groceries, month, BigDecimal.valueOf(1000));
        Budget exceededBudget = new Budget(user, rent, month, BigDecimal.valueOf(1000));

        BudgetResponse onTrack = new BudgetResponse(onTrackBudget, BigDecimal.valueOf(300)); // 30% -> ON_TRACK
        BudgetResponse exceeded = new BudgetResponse(exceededBudget, BigDecimal.valueOf(1200)); // 120% -> EXCEEDED

        when(transactionRepository.sumByTypeAndDateRange(any(), eq(CategoryType.INCOME), any(), any()))
                .thenReturn(BigDecimal.valueOf(5000));
        when(transactionRepository.sumByTypeAndDateRange(any(), eq(CategoryType.EXPENSE), any(), any()))
                .thenReturn(BigDecimal.valueOf(1500));
        when(budgetService.listForMonth(user, month)).thenReturn(List.of(onTrack, exceeded));

        HealthScoreResponse response = healthScoreService.calculate(user, month);

        // ON_TRACK=100, EXCEEDED=0 -> average = 50.
        assertThat(response.getBudgetAdherence()).isEqualByComparingTo(BigDecimal.valueOf(50));
    }
}
