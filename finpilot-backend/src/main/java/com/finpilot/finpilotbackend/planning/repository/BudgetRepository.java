package com.finpilot.finpilotbackend.planning.repository;

import com.finpilot.finpilotbackend.planning.entity.Budget;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface BudgetRepository extends JpaRepository<Budget, Long> {

    List<Budget> findByUserIdAndPeriodMonth(Long userId, LocalDate periodMonth);

    Optional<Budget> findByIdAndUserId(Long id, Long userId);

    Optional<Budget> findByUserIdAndCategoryIdAndPeriodMonth(Long userId, Long categoryId, LocalDate periodMonth);
}
