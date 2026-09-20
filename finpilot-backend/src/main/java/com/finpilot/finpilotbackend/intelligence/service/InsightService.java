package com.finpilot.finpilotbackend.intelligence.service;

import com.finpilot.finpilotbackend.finance.entity.CategoryType;
import com.finpilot.finpilotbackend.finance.repository.TransactionRepository;
import com.finpilot.finpilotbackend.identity.entity.User;
import com.finpilot.finpilotbackend.intelligence.dto.InsightResponse;
import com.finpilot.finpilotbackend.intelligence.dto.InsightResponse.InsightType;
import com.finpilot.finpilotbackend.intelligence.dto.InsightResponse.Severity;
import com.finpilot.finpilotbackend.planning.dto.BudgetDtos.BudgetResponse;
import com.finpilot.finpilotbackend.planning.dto.BudgetDtos.BudgetStatus;
import com.finpilot.finpilotbackend.planning.service.BudgetService;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

// Deliberately rule-based, not LLM-based. Real AI-generated insights are
// Section 18's Level 6 / v0.6 milestone - this is the arithmetic-and-thresholds
// version that ships in the MVP, per the "AI insights are just aggregation
// dressed up" discussion earlier in this build.
@Service
public class InsightService {

    // Thresholds chosen to avoid noise: a category jumping from ₹10 to ₹15
    // is a 50% increase but meaningless - both the percentage AND minimum
    // absolute amount must clear the bar before it becomes an insight.
    private static final BigDecimal SPENDING_INCREASE_THRESHOLD_PERCENT = BigDecimal.valueOf(15);
    private static final BigDecimal MIN_MEANINGFUL_AMOUNT = BigDecimal.valueOf(200);

    private final TransactionRepository transactionRepository;
    private final BudgetService budgetService;

    public InsightService(TransactionRepository transactionRepository, BudgetService budgetService) {
        this.transactionRepository = transactionRepository;
        this.budgetService = budgetService;
    }

    public List<InsightResponse> generateInsights(User user, LocalDate anyDateInMonth) {
        LocalDate startOfMonth = anyDateInMonth.withDayOfMonth(1);
        LocalDate startOfNextMonth = startOfMonth.plusMonths(1);
        LocalDate startOfPrevMonth = startOfMonth.minusMonths(1);

        List<InsightResponse> insights = new ArrayList<>();

        insights.addAll(categorySpendingIncreaseInsights(user, startOfMonth, startOfNextMonth, startOfPrevMonth));
        insights.addAll(budgetInsights(user, startOfMonth));
        insights.addAll(overallSpendingInsight(user, startOfMonth, startOfNextMonth));

        if (insights.isEmpty()) {
            insights.add(new InsightResponse(
                    InsightType.NO_ACTIVITY,
                    Severity.INFO,
                    "No transactions recorded yet this month - add some to start seeing insights."
            ));
        }

        return insights;
    }

    private List<InsightResponse> categorySpendingIncreaseInsights(
            User user, LocalDate startOfMonth, LocalDate startOfNextMonth, LocalDate startOfPrevMonth
    ) {
        List<InsightResponse> results = new ArrayList<>();

        Map<String, BigDecimal> currentByCategory = toMap(transactionRepository.sumGroupedByCategory(
                user.getId(), CategoryType.EXPENSE, startOfMonth, startOfNextMonth));
        Map<String, BigDecimal> previousByCategory = toMap(transactionRepository.sumGroupedByCategory(
                user.getId(), CategoryType.EXPENSE, startOfPrevMonth, startOfMonth));

        for (Map.Entry<String, BigDecimal> entry : currentByCategory.entrySet()) {
            String category = entry.getKey();
            BigDecimal current = entry.getValue();
            BigDecimal previous = previousByCategory.get(category);

            if (previous == null || previous.compareTo(BigDecimal.ZERO) == 0) {
                continue; // no baseline to compare against - skip rather than claim a false "increase"
            }
            if (current.compareTo(MIN_MEANINGFUL_AMOUNT) < 0) {
                continue;
            }

            BigDecimal percentChange = current.subtract(previous)
                    .divide(previous, 4, RoundingMode.HALF_UP)
                    .multiply(BigDecimal.valueOf(100));

            if (percentChange.compareTo(SPENDING_INCREASE_THRESHOLD_PERCENT) > 0) {
                results.add(new InsightResponse(
                        InsightType.CATEGORY_SPENDING_INCREASE,
                        Severity.WARNING,
                        String.format(
                                "%s spending is up %.0f%% this month (₹%.2f vs ₹%.2f last month)",
                                category, percentChange, current, previous
                        )
                ));
            }
        }
        return results;
    }

    private List<InsightResponse> budgetInsights(User user, LocalDate startOfMonth) {
        List<InsightResponse> results = new ArrayList<>();

        for (BudgetResponse budget : budgetService.listForMonth(user, startOfMonth)) {
            if (budget.getStatus() == BudgetStatus.EXCEEDED) {
                results.add(new InsightResponse(
                        InsightType.BUDGET_EXCEEDED,
                        Severity.CRITICAL,
                        String.format(
                                "You've exceeded your %s budget by ₹%.2f this month",
                                budget.getCategoryName(), budget.getSpentAmount().subtract(budget.getBudgetedAmount())
                        )
                ));
            } else if (budget.getStatus() == BudgetStatus.WARNING) {
                results.add(new InsightResponse(
                        InsightType.BUDGET_WARNING,
                        Severity.WARNING,
                        String.format(
                                "You've used %.0f%% of your %s budget for this month",
                                budget.getPercentUsed(), budget.getCategoryName()
                        )
                ));
            }
        }
        return results;
    }

    private List<InsightResponse> overallSpendingInsight(User user, LocalDate startOfMonth, LocalDate startOfNextMonth) {
        BigDecimal income = zeroIfNull(transactionRepository.sumByTypeAndDateRange(
                user.getId(), CategoryType.INCOME, startOfMonth, startOfNextMonth));
        BigDecimal expense = zeroIfNull(transactionRepository.sumByTypeAndDateRange(
                user.getId(), CategoryType.EXPENSE, startOfMonth, startOfNextMonth));

        List<InsightResponse> results = new ArrayList<>();

        if (income.compareTo(BigDecimal.ZERO) > 0 && expense.compareTo(income) > 0) {
            results.add(new InsightResponse(
                    InsightType.OVERSPENDING,
                    Severity.CRITICAL,
                    String.format(
                            "You've spent ₹%.2f more than you've earned this month",
                            expense.subtract(income)
                    )
            ));
        } else if (income.compareTo(BigDecimal.ZERO) > 0 && expense.compareTo(BigDecimal.ZERO) > 0) {
            BigDecimal savingsRate = income.subtract(expense)
                    .divide(income, 4, RoundingMode.HALF_UP)
                    .multiply(BigDecimal.valueOf(100));
            if (savingsRate.compareTo(BigDecimal.valueOf(20)) >= 0) {
                results.add(new InsightResponse(
                        InsightType.POSITIVE_SAVINGS,
                        Severity.INFO,
                        String.format("You're saving %.0f%% of your income this month - solid progress", savingsRate)
                ));
            }
        }

        return results;
    }

    private Map<String, BigDecimal> toMap(List<Object[]> rows) {
        Map<String, BigDecimal> map = new HashMap<>();
        for (Object[] row : rows) {
            map.put((String) row[0], (BigDecimal) row[1]);
        }
        return map;
    }

    private BigDecimal zeroIfNull(BigDecimal value) {
        return value != null ? value : BigDecimal.ZERO;
    }
}
