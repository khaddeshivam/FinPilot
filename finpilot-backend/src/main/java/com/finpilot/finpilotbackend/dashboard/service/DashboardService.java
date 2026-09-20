package com.finpilot.finpilotbackend.dashboard.service;

import com.finpilot.finpilotbackend.dashboard.dto.DashboardResponse;
import com.finpilot.finpilotbackend.dashboard.dto.DashboardResponse.CategoryBreakdown;
import com.finpilot.finpilotbackend.dashboard.dto.MonthlyTrendResponse;
import com.finpilot.finpilotbackend.finance.dto.AccountDtos.AccountResponse;
import com.finpilot.finpilotbackend.finance.dto.TransactionDtos.TransactionResponse;
import com.finpilot.finpilotbackend.finance.entity.CategoryType;
import com.finpilot.finpilotbackend.finance.repository.TransactionRepository;
import com.finpilot.finpilotbackend.finance.service.AccountService;
import com.finpilot.finpilotbackend.finance.service.TransactionService;
import com.finpilot.finpilotbackend.identity.entity.User;
import com.finpilot.finpilotbackend.planning.dto.BudgetDtos.BudgetResponse;
import com.finpilot.finpilotbackend.planning.service.BudgetService;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

@Service
public class DashboardService {

    private static final int RECENT_TRANSACTIONS_LIMIT = 5;

    private final AccountService accountService;
    private final TransactionService transactionService;
    private final TransactionRepository transactionRepository;
    private final BudgetService budgetService;

    public DashboardService(
            AccountService accountService,
            TransactionService transactionService,
            TransactionRepository transactionRepository,
            BudgetService budgetService
    ) {
        this.accountService = accountService;
        this.transactionService = transactionService;
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

        List<TransactionResponse> recentTransactions = transactionService.listForUser(user).stream()
                .limit(RECENT_TRANSACTIONS_LIMIT)
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
    // Loops month-by-month reusing the same sumByTypeAndDateRange query the
    // single-month dashboard already uses, rather than a new grouped-by-month
    // SQL query - at a personal finance app's data volume (a handful of
    // months, hundreds of transactions) this is simple and fast enough;
    // a heavier grouped query would be premature optimization here.
    public List<MonthlyTrendResponse> getTrends(User user, int months) {
        List<MonthlyTrendResponse> trends = new ArrayList<>();
        LocalDate currentMonthStart = LocalDate.now().withDayOfMonth(1);

        for (int i = months - 1; i >= 0; i--) {
            LocalDate monthStart = currentMonthStart.minusMonths(i);
            LocalDate monthEnd = monthStart.plusMonths(1);

            BigDecimal income = zeroIfNull(transactionRepository.sumByTypeAndDateRange(
                    user.getId(), CategoryType.INCOME, monthStart, monthEnd));
            BigDecimal expense = zeroIfNull(transactionRepository.sumByTypeAndDateRange(
                    user.getId(), CategoryType.EXPENSE, monthStart, monthEnd));

            trends.add(new MonthlyTrendResponse(monthStart, income, expense));
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
