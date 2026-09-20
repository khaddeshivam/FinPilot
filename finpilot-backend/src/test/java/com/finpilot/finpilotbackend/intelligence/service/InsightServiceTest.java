package com.finpilot.finpilotbackend.intelligence.service;

import com.finpilot.finpilotbackend.finance.entity.CategoryType;
import com.finpilot.finpilotbackend.finance.repository.TransactionRepository;
import com.finpilot.finpilotbackend.identity.entity.User;
import com.finpilot.finpilotbackend.intelligence.dto.InsightResponse;
import com.finpilot.finpilotbackend.intelligence.dto.InsightResponse.InsightType;
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

// Covers the threshold logic (15% increase AND >=₹200 absolute) that exists
// specifically to avoid noisy, meaningless insights - these tests confirm
// the "no false positive" cases work, which matter as much as the
// "insight fires when it should" cases.
@ExtendWith(MockitoExtension.class)
class InsightServiceTest {

    @Mock
    private TransactionRepository transactionRepository;
    @Mock
    private BudgetService budgetService;

    private InsightService insightService;

    private User user;
    private final LocalDate month = LocalDate.of(2026, 8, 15);

    @BeforeEach
    void setUp() {
        insightService = new InsightService(transactionRepository, budgetService);
        user = new User("user@example.com", "hashed", "Test User");
        when(budgetService.listForMonth(any(), any())).thenReturn(List.of());
    }

    @Test
    void largeMeaningfulIncreaseTriggersInsight() {
        // ₹300 -> ₹500 is a 66% increase, well above threshold and above
        // the ₹200 minimum absolute amount.
        when(transactionRepository.sumGroupedByCategory(any(), eq(CategoryType.EXPENSE), eq(LocalDate.of(2026, 8, 1)), any()))
                .thenReturn(List.of(new Object[]{"Food", BigDecimal.valueOf(500)}));
        when(transactionRepository.sumGroupedByCategory(any(), eq(CategoryType.EXPENSE), eq(LocalDate.of(2026, 7, 1)), eq(LocalDate.of(2026, 8, 1))))
                .thenReturn(List.of(new Object[]{"Food", BigDecimal.valueOf(300)}));
        when(transactionRepository.sumByTypeAndDateRange(any(), any(), any(), any())).thenReturn(BigDecimal.ZERO);

        List<InsightResponse> insights = insightService.generateInsights(user, month);

        assertThat(insights)
                .anyMatch(i -> i.getType() == InsightType.CATEGORY_SPENDING_INCREASE
                        && i.getMessage().contains("Food"));
    }

    @Test
    void smallAbsoluteAmountDoesNotTriggerDespiteHighPercentIncrease() {
        // ₹10 -> ₹20 is a 100% increase but both amounts are trivially small -
        // this must NOT produce an insight, since it would just be noise.
        when(transactionRepository.sumGroupedByCategory(any(), eq(CategoryType.EXPENSE), eq(LocalDate.of(2026, 8, 1)), any()))
                .thenReturn(List.of(new Object[]{"Misc", BigDecimal.valueOf(20)}));
        when(transactionRepository.sumGroupedByCategory(any(), eq(CategoryType.EXPENSE), eq(LocalDate.of(2026, 7, 1)), eq(LocalDate.of(2026, 8, 1))))
                .thenReturn(List.of(new Object[]{"Misc", BigDecimal.valueOf(10)}));
        when(transactionRepository.sumByTypeAndDateRange(any(), any(), any(), any())).thenReturn(BigDecimal.ZERO);

        List<InsightResponse> insights = insightService.generateInsights(user, month);

        assertThat(insights).noneMatch(i -> i.getType() == InsightType.CATEGORY_SPENDING_INCREASE);
    }

    @Test
    void noBaselineFromPreviousMonthDoesNotFalselyClaimIncrease() {
        // A category with spend this month but nothing last month has no
        // baseline to compare against - must be skipped, not treated as an
        // infinite/false increase.
        when(transactionRepository.sumGroupedByCategory(any(), eq(CategoryType.EXPENSE), eq(LocalDate.of(2026, 8, 1)), any()))
                .thenReturn(List.of(new Object[]{"Travel", BigDecimal.valueOf(5000)}));
        when(transactionRepository.sumGroupedByCategory(any(), eq(CategoryType.EXPENSE), eq(LocalDate.of(2026, 7, 1)), eq(LocalDate.of(2026, 8, 1))))
                .thenReturn(List.of()); // nothing last month
        when(transactionRepository.sumByTypeAndDateRange(any(), any(), any(), any())).thenReturn(BigDecimal.ZERO);

        List<InsightResponse> insights = insightService.generateInsights(user, month);

        assertThat(insights).noneMatch(i -> i.getType() == InsightType.CATEGORY_SPENDING_INCREASE);
    }

    @Test
    void spendingMoreThanIncomeTriggersOverspendingInsight() {
        when(transactionRepository.sumGroupedByCategory(any(), any(), any(), any())).thenReturn(List.of());
        when(transactionRepository.sumByTypeAndDateRange(any(), eq(CategoryType.INCOME), any(), any()))
                .thenReturn(BigDecimal.valueOf(3000));
        when(transactionRepository.sumByTypeAndDateRange(any(), eq(CategoryType.EXPENSE), any(), any()))
                .thenReturn(BigDecimal.valueOf(4000));

        List<InsightResponse> insights = insightService.generateInsights(user, month);

        assertThat(insights)
                .anyMatch(i -> i.getType() == InsightType.OVERSPENDING && i.getMessage().contains("1000"));
    }

    @Test
    void noActivityFallbackWhenNothingToReport() {
        when(transactionRepository.sumGroupedByCategory(any(), any(), any(), any())).thenReturn(List.of());
        when(transactionRepository.sumByTypeAndDateRange(any(), any(), any(), any())).thenReturn(null);

        List<InsightResponse> insights = insightService.generateInsights(user, month);

        assertThat(insights).hasSize(1);
        assertThat(insights.get(0).getType()).isEqualTo(InsightType.NO_ACTIVITY);
    }
}
