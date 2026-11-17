package com.finpilot.finpilotbackend.dashboard.service;

import com.finpilot.finpilotbackend.dashboard.dto.MonthlyTrendResponse;
import com.finpilot.finpilotbackend.finance.entity.CategoryType;
import com.finpilot.finpilotbackend.finance.repository.TransactionRepository;
import com.finpilot.finpilotbackend.finance.service.AccountService;
import com.finpilot.finpilotbackend.identity.entity.User;
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
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class DashboardServiceTest {

    @Mock
    private AccountService accountService;
    @Mock
    private TransactionRepository transactionRepository;
    @Mock
    private BudgetService budgetService;

    private DashboardService dashboardService;
    private User user;
    private final LocalDate currentMonth = LocalDate.now().withDayOfMonth(1);

    @BeforeEach
    void setUp() {
        dashboardService = new DashboardService(accountService, transactionRepository, budgetService);
        user = new User("user@example.com", "hashed", "Test User");
    }

    @Test
    void trendsAreOldestFirstSumDaysIntoMonthsAndFillEmptyMonthsWithZero() {
        when(transactionRepository.sumDailyByType(any(), any(), any())).thenReturn(List.<Object[]>of(new Object[]{currentMonth.minusMonths(2).plusDays(4), CategoryType.INCOME, new BigDecimal("1000.00")}, new Object[]{currentMonth, CategoryType.EXPENSE, new BigDecimal("250.00")}, new Object[]{currentMonth.plusDays(1), CategoryType.EXPENSE, new BigDecimal("50.00")}));

        List<MonthlyTrendResponse> trends = dashboardService.getTrends(user, 3);

        assertThat(trends).hasSize(3);
        assertThat(trends.get(0).getPeriodMonth()).isEqualTo(currentMonth.minusMonths(2));
        assertThat(trends.get(1).getPeriodMonth()).isEqualTo(currentMonth.minusMonths(1));
        assertThat(trends.get(2).getPeriodMonth()).isEqualTo(currentMonth);

        assertThat(trends.get(0).getIncome()).isEqualByComparingTo("1000");
        assertThat(trends.get(0).getExpense()).isEqualByComparingTo("0");

        // A month with no transactions is present and all zero.
        assertThat(trends.get(1).getIncome()).isEqualByComparingTo("0");
        assertThat(trends.get(1).getExpense()).isEqualByComparingTo("0");

        // Two expense days in the same month are added together.
        assertThat(trends.get(2).getIncome()).isEqualByComparingTo("0");
        assertThat(trends.get(2).getExpense()).isEqualByComparingTo("300");
        assertThat(trends.get(2).getNet()).isEqualByComparingTo("-300");
    }

    @Test
    void trendsUseExactlyOneRepositoryQueryForTheWholeRange() {
        when(transactionRepository.sumDailyByType(any(), any(), any())).thenReturn(List.of());

        List<MonthlyTrendResponse> trends = dashboardService.getTrends(user, 12);

        assertThat(trends).hasSize(12);
        verify(transactionRepository, times(1)).sumDailyByType(any(), eq(currentMonth.minusMonths(11)), eq(currentMonth.plusMonths(1)));
        verify(transactionRepository, never()).sumByTypeAndDateRange(any(), any(), any(), any());
    }

    @Test
    void zeroOrNegativeMonthsReturnAnEmptyListWithoutQuerying() {
        assertThat(dashboardService.getTrends(user, 0)).isEmpty();
        assertThat(dashboardService.getTrends(user, -3)).isEmpty();
        verify(transactionRepository, never()).sumDailyByType(any(), any(), any());
    }
}