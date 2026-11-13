package com.finpilot.finpilotbackend.dashboard.service;

import com.finpilot.finpilotbackend.dashboard.dto.DashboardResponse;
import com.finpilot.finpilotbackend.dashboard.dto.DashboardResponse.CategoryBreakdown;
import com.finpilot.finpilotbackend.dashboard.dto.MonthlyTrendResponse;
import com.finpilot.finpilotbackend.finance.dto.AccountDtos.AccountResponse;
import com.finpilot.finpilotbackend.finance.dto.TransactionDtos.TransactionResponse;
import com.finpilot.finpilotbackend.finance.entity.CategoryType;
import com.finpilot.finpilotbackend.finance.repository.TransactionRepository;
import com.finpilot.finpilotbackend.finance.service.AccountService;
import com.finpilot.finpilotbackend.identity.entity.User;
import com.finpilot.finpilotbackend.planning.dto.BudgetDtos.BudgetResponse;
import com.finpilot.finpilotbackend.planning.service.BudgetService;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.YearMonth;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
public class DashboardService {

    private final AccountService accountService;
    private final TransactionRepository transactionRepository;
    private final BudgetService budgetService;

    public DashboardService(
            AccountService accountService,
            TransactionRepository transactionRepository,
            BudgetService budgetService
    ) {
        this.accountService = accountService;
        this.transactionRepository = transactionRepository;
        this.budgetService = budgetService;
    }

    public DashboardResponse getSummary(User user, LocalDate anyDateInMonth) {
        LocalDate startOfMonth = anyDateInMonth.withDayOfMonth(1);
        LocalDate startOfNextMonth = startOfMonth.plusMonths(1);

        BigDecimal totalBalance = sumAccountBalances(user);

        BigDecimal monthlyIncome = zeroIfNull(transactionRepository.sumByTypeAndDateRange(
                user.getId(), CategoryType.INCOME, startOfMonth, startOfNextMonth));

        BigDecimal monthlyExpense = zeroIfNull(transactionRepository.sumByTypeAndDateRange(
                user.getId(), CategoryType.EXPENSE, startOfMonth, startOfNextMonth));

        List<BudgetResponse> budgets = budgetService.listForMonth(user, startOfMonth);

        // Use findTop5 so the DB returns exactly 5 rows instead of loading the
        // entire transaction history into memory just to take the first five.
        List<TransactionResponse> recentTransactions = transactionRepository
                .findTop5ByUserIdOrderByTransactionDateDesc(user.getId())
                .stream()
                .map(TransactionResponse::new)
                .collect(Collectors.toList());

        List<CategoryBreakdown> expenseByCategory = transactionRepository
                .sumGroupedByCategory(user.getId(), CategoryType.EXPENSE, startOfMonth, startOfNextMonth)
                .stream()
                .map(row -> new CategoryBreakdown((String) row[0], (BigDecimal) row[1]))
                .collect(Collectors.toList());

        return new DashboardResponse(
                startOfMonth, totalBalance, monthlyIncome, monthlyExpense,
                budgets, recentTransactions, expenseByCategory
        );
    }

    // N months of income/expense/net, oldest first - powers the trend chart.
    // One grouped database query covers the whole range (the old version ran
    // two queries per month: 24 for a 12-month chart). Days are bucketed into
    // months here, and months with no transactions are filled with zero.
    public List<MonthlyTrendResponse> getTrends(User user, int months) {
        List<MonthlyTrendResponse> trends = new ArrayList<>();
        if (months <= 0) {
            return trends;
        }

        LocalDate currentMonthStart = LocalDate.now().withDayOfMonth(1);
        LocalDate rangeStart = currentMonthStart.minusMonths(months - 1L);
        LocalDate rangeEnd = currentMonthStart.plusMonths(1);

        Map<YearMonth, BigDecimal> incomeByMonth = new HashMap<>();
        Map<YearMonth, BigDecimal> expenseByMonth = new HashMap<>();
        for (Object[] row : transactionRepository.sumDailyByType(user.getId(), rangeStart, rangeEnd)) {
            YearMonth month = YearMonth.from((LocalDate) row[0]);
            CategoryType type = (CategoryType) row[1];
            BigDecimal total = (BigDecimal) row[2];
            if (type == CategoryType.INCOME) {
                incomeByMonth.merge(month, total, BigDecimal::add);
            } else if (type == CategoryType.EXPENSE) {
                expenseByMonth.merge(month, total, BigDecimal::add);
            }
        }

        for (int i = months - 1; i >= 0; i--) {
            LocalDate monthStart = currentMonthStart.minusMonths(i);
            YearMonth month = YearMonth.from(monthStart);
            trends.add(new MonthlyTrendResponse(
                    monthStart,
                    incomeByMonth.getOrDefault(month, BigDecimal.ZERO),
                    expenseByMonth.getOrDefault(month, BigDecimal.ZERO)));
        }
        return trends;
    }

    private BigDecimal sumAccountBalances(User user) {
        return accountService.listForUser(user).stream()
                .map(AccountResponse::getBalance)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    private BigDecimal zeroIfNull(BigDecimal value) {
        return value != null ? value : BigDecimal.ZERO;
    }
}
