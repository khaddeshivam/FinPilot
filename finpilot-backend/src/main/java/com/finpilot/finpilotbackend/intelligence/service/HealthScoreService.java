package com.finpilot.finpilotbackend.intelligence.service;

import com.finpilot.finpilotbackend.finance.entity.CategoryType;
import com.finpilot.finpilotbackend.finance.repository.TransactionRepository;
import com.finpilot.finpilotbackend.identity.entity.User;
import com.finpilot.finpilotbackend.intelligence.dto.HealthScoreResponse;
import com.finpilot.finpilotbackend.intelligence.dto.HealthScoreResponse.HealthLabel;
import com.finpilot.finpilotbackend.planning.dto.BudgetDtos.BudgetResponse;
import com.finpilot.finpilotbackend.planning.service.BudgetService;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.List;

// A deliberately simple, explainable formula - not a black-box score. Two
// inputs only: how much of your income you keep (savings rate) and how well
// you're sticking to the budgets you set (budget adherence). Weighted 60/40
// because savings rate is the more fundamental signal - it matters even for
// someone who hasn't set any budgets yet.
//
// Savings score calibration: a raw savings rate maps poorly to a 0-100 score
// because 1% → 1 pt and 100% → 100 pts, making "Good" essentially unreachable
// at normal savings rates. Instead we define a TARGET_SAVINGS_RATE (20%) that
// earns full marks (100 pts) on this component. Rates above the target are
// clamped to 100; negative rates (overspending) are clamped to 0.
// Example: 20% rate → 100 pts → score 0.6×100 + 0.4×70 = 88 (Excellent).
@Service
public class HealthScoreService {

    private static final BigDecimal SAVINGS_WEIGHT = BigDecimal.valueOf(0.6);
    private static final BigDecimal BUDGET_WEIGHT = BigDecimal.valueOf(0.4);
    private static final BigDecimal NEUTRAL_BUDGET_SCORE = BigDecimal.valueOf(70); // used when no budgets exist yet

    // A 20% savings rate is the target for full marks. Rates above this are
    // capped at 100; the scaling is (savingsRate / TARGET) * 100.
    private static final BigDecimal TARGET_SAVINGS_RATE = BigDecimal.valueOf(20);

    private final TransactionRepository transactionRepository;
    private final BudgetService budgetService;

    public HealthScoreService(TransactionRepository transactionRepository, BudgetService budgetService) {
        this.transactionRepository = transactionRepository;
        this.budgetService = budgetService;
    }

    public HealthScoreResponse calculate(User user, LocalDate anyDateInMonth) {
        LocalDate startOfMonth = anyDateInMonth.withDayOfMonth(1);
        LocalDate startOfNextMonth = startOfMonth.plusMonths(1);

        BigDecimal income = zeroIfNull(transactionRepository.sumByTypeAndDateRange(
                user.getId(), CategoryType.INCOME, startOfMonth, startOfNextMonth));
        BigDecimal expense = zeroIfNull(transactionRepository.sumByTypeAndDateRange(
                user.getId(), CategoryType.EXPENSE, startOfMonth, startOfNextMonth));

        BigDecimal savingsRate = calculateSavingsRate(income, expense);
        // Scale: (savingsRate / TARGET_SAVINGS_RATE) * 100, then clamp 0-100.
        // A 20% rate earns 100 pts; 10% earns 50 pts; negative → 0 pts.
        BigDecimal savingsScore = clamp(
                savingsRate.divide(TARGET_SAVINGS_RATE, 4, RoundingMode.HALF_UP)
                        .multiply(BigDecimal.valueOf(100)),
                BigDecimal.ZERO,
                BigDecimal.valueOf(100)
        );

        List<BudgetResponse> budgets = budgetService.listForMonth(user, startOfMonth);
        BigDecimal budgetAdherence = budgets.isEmpty() ? null : calculateBudgetAdherence(budgets);
        BigDecimal budgetScore = budgetAdherence != null ? budgetAdherence : NEUTRAL_BUDGET_SCORE;

        BigDecimal weighted = savingsScore.multiply(SAVINGS_WEIGHT)
                .add(budgetScore.multiply(BUDGET_WEIGHT));

        int finalScore = weighted.setScale(0, RoundingMode.HALF_UP).intValue();

        return new HealthScoreResponse(finalScore, labelFor(finalScore), savingsRate, budgetAdherence);
    }

    private BigDecimal calculateSavingsRate(BigDecimal income, BigDecimal expense) {
        if (income.compareTo(BigDecimal.ZERO) == 0) {
            return BigDecimal.ZERO; // no income data yet - neutral, not penalized
        }
        return income.subtract(expense)
                .divide(income, 4, RoundingMode.HALF_UP)
                .multiply(BigDecimal.valueOf(100));
    }

    // ON_TRACK = 100 points, WARNING = 60, EXCEEDED = 0 - averaged across all budgets.
    private BigDecimal calculateBudgetAdherence(List<BudgetResponse> budgets) {
        BigDecimal total = BigDecimal.ZERO;
        for (BudgetResponse budget : budgets) {
            BigDecimal points = switch (budget.getStatus()) {
                case ON_TRACK -> BigDecimal.valueOf(100);
                case WARNING -> BigDecimal.valueOf(60);
                case EXCEEDED -> BigDecimal.ZERO;
            };
            total = total.add(points);
        }
        return total.divide(BigDecimal.valueOf(budgets.size()), 4, RoundingMode.HALF_UP);
    }

    private BigDecimal clamp(BigDecimal value, BigDecimal min, BigDecimal max) {
        if (value.compareTo(min) < 0) return min;
        if (value.compareTo(max) > 0) return max;
        return value;
    }

    private HealthLabel labelFor(int score) {
        if (score >= 80) return HealthLabel.EXCELLENT;
        if (score >= 60) return HealthLabel.GOOD;
        if (score >= 40) return HealthLabel.FAIR;
        return HealthLabel.NEEDS_ATTENTION;
    }

    private BigDecimal zeroIfNull(BigDecimal value) {
        return value != null ? value : BigDecimal.ZERO;
    }
}
