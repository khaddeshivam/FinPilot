package com.finpilot.finpilotbackend.finance.repository;

import com.finpilot.finpilotbackend.finance.entity.CategoryType;
import com.finpilot.finpilotbackend.finance.entity.Transaction;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface TransactionRepository extends JpaRepository<Transaction, Long> {

    List<Transaction> findByUserIdOrderByTransactionDateDesc(Long userId);

    List<Transaction> findByAccountIdOrderByTransactionDateDesc(Long accountId);

    Optional<Transaction> findByIdAndUserId(Long id, Long userId);

    // Used by CSV import deduplication - checks whether a row with this
    // fingerprint was already imported so a repeat upload can skip it.
    boolean existsByImportFingerprint(String importFingerprint);

    // Dashboard recent activity - fetch exactly 5 rows at the DB level
    // rather than loading all transactions and limiting in memory.
    List<Transaction> findTop5ByUserIdOrderByTransactionDateDesc(Long userId);

    // Used by budget calculations - sums actual spend for one category within
    // one month so it can be compared against the budgeted amount. Returns
    // null (not zero) when there are no matching rows - callers must handle that.
    @Query("SELECT SUM(t.amount) FROM Transaction t " +
           "WHERE t.user.id = :userId AND t.category.id = :categoryId " +
           "AND t.transactionType = :type " +
           "AND t.transactionDate >= :startDate AND t.transactionDate < :endDate")
    BigDecimal sumByCategoryAndDateRange(
            @Param("userId") Long userId,
            @Param("categoryId") Long categoryId,
            @Param("type") CategoryType type,
            @Param("startDate") LocalDate startDate,
            @Param("endDate") LocalDate endDate
    );

    // Total income or expense across ALL categories in a date range - used for
    // the dashboard's monthly income/expense summary. Same null-means-zero rule.
    @Query("SELECT SUM(t.amount) FROM Transaction t " +
           "WHERE t.user.id = :userId AND t.transactionType = :type " +
           "AND t.transactionDate >= :startDate AND t.transactionDate < :endDate")
    BigDecimal sumByTypeAndDateRange(
            @Param("userId") Long userId,
            @Param("type") CategoryType type,
            @Param("startDate") LocalDate startDate,
            @Param("endDate") LocalDate endDate
    );

    // Daily income/expense totals for a date range, grouped in the database so
    // the dashboard trend chart needs ONE query instead of two per month.
    // Each row is [LocalDate, CategoryType, BigDecimal]; the caller buckets the
    // days into months. At most (days in range x 2) rows come back.
    @Query("SELECT t.transactionDate, t.transactionType, SUM(t.amount) FROM Transaction t " +
            "WHERE t.user.id = :userId " +
            "AND t.transactionDate >= :startDate AND t.transactionDate < :endDate " +
            "GROUP BY t.transactionDate, t.transactionType")
    List<Object[]> sumDailyByType(
            @Param("userId") Long userId,
            @Param("startDate") LocalDate startDate,
            @Param("endDate") LocalDate endDate
    );

    // Per-category totals for a date range - powers the dashboard's spending
    // breakdown chart. Ordered highest-spend-first so the top categories lead.
    @Query("SELECT t.category.name, SUM(t.amount) FROM Transaction t " +
           "WHERE t.user.id = :userId AND t.transactionType = :type " +
           "AND t.transactionDate >= :startDate AND t.transactionDate < :endDate " +
           "GROUP BY t.category.name ORDER BY SUM(t.amount) DESC")
    List<Object[]> sumGroupedByCategory(
            @Param("userId") Long userId,
            @Param("type") CategoryType type,
            @Param("startDate") LocalDate startDate,
            @Param("endDate") LocalDate endDate
    );
}
