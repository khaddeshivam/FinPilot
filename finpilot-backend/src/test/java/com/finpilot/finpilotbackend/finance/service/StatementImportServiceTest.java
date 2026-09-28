package com.finpilot.finpilotbackend.finance.service;

import com.finpilot.finpilotbackend.finance.dto.CategoryResponse;
import com.finpilot.finpilotbackend.finance.dto.ImportDtos.ImportSummaryResponse;
import com.finpilot.finpilotbackend.finance.entity.CategoryType;
import com.finpilot.finpilotbackend.finance.entity.Transaction;
import com.finpilot.finpilotbackend.finance.repository.TransactionRepository;
import com.finpilot.finpilotbackend.identity.entity.User;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mock.web.MockMultipartFile;

import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

// Covers the two things most likely to go wrong in a CSV import: rows that
// LOOK valid but shouldn't import (future dates, zero amounts), and the
// keyword-based category guess actually landing on the right category.
// The ML classifier is mocked to report "not enough history" throughout,
// so these tests exercise the keyword-fallback path specifically -
// CategoryPredictionServiceTest (separate file) covers the classifier itself.
@ExtendWith(MockitoExtension.class)
class StatementImportServiceTest {

    @Mock
    private TransactionService transactionService;
    @Mock
    private TransactionRepository transactionRepository;
    @Mock
    private AccountService accountService;
    @Mock
    private CategoryService categoryService;
    @Mock
    private CategoryPredictionService categoryPredictionService;

    private StatementImportService importService;
    private User user;

    @BeforeEach
    void setUp() {
        importService = new StatementImportService(
                transactionService, transactionRepository, accountService,
                categoryService, categoryPredictionService);
        user = new User("user@example.com", "hashed", "Test User");

        when(categoryService.listForUser(user)).thenReturn(List.of(
                mockCategory(1L, "Food", CategoryType.EXPENSE),
                mockCategory(2L, "Other", CategoryType.EXPENSE),
                mockCategory(3L, "Salary", CategoryType.INCOME),
                mockCategory(4L, "Other Income", CategoryType.INCOME)
        ));
        // Stub createImported so imported rows return a Transaction with a description.
        Transaction stubTx = mock(Transaction.class);
        when(stubTx.getDescription()).thenReturn("stub");
        when(transactionService.createImported(any(), any(), anyString())).thenReturn(stubTx);
        // No training history yet - forces every row through the keyword
        // fallback path, which is what these tests are actually verifying.
        when(categoryPredictionService.trainedClassifierFor(any(), any())).thenReturn(Optional.empty());
    }

    @Test
    void importsWellFormedRowsAndGuessesCorrectCategory() {
        String csv = "Date,Description,Amount\n"
                + "2026-08-01,Swiggy order,-450\n"
                + "2026-08-02,Monthly Salary,50000\n";
        MockMultipartFile file = csvFile(csv);

        ImportSummaryResponse summary = importService.importCsv(user, 1L, file);

        assertThat(summary.getImportedCount()).isEqualTo(2);
        assertThat(summary.getSkippedCount()).isZero();
        assertThat(summary.getRows().get(0).getCategoryName()).isEqualTo("Food"); // "Swiggy" keyword match
        assertThat(summary.getRows().get(1).getCategoryName()).isEqualTo("Salary"); // "Salary" keyword match
    }

    @Test
    void unmatchedDescriptionFallsBackToOtherCategory() {
        String csv = "Date,Description,Amount\n"
                + "2026-08-01,Random unclassifiable purchase,-100\n";
        MockMultipartFile file = csvFile(csv);

        ImportSummaryResponse summary = importService.importCsv(user, 1L, file);

        assertThat(summary.getImportedCount()).isEqualTo(1);
        assertThat(summary.getRows().get(0).getCategoryName()).isEqualTo("Other");
    }

    @Test
    void skipsRowWithFutureDate() {
        String csv = "Date,Description,Amount\n"
                + "2099-01-01,Future purchase,-100\n";
        MockMultipartFile file = csvFile(csv);

        ImportSummaryResponse summary = importService.importCsv(user, 1L, file);

        assertThat(summary.getImportedCount()).isZero();
        assertThat(summary.getSkippedCount()).isEqualTo(1);
        assertThat(summary.getRows().get(0).getReason()).contains("future");
    }

    @Test
    void skipsRowWithZeroAmount() {
        String csv = "Date,Description,Amount\n"
                + "2026-08-01,Zero amount row,0\n";
        MockMultipartFile file = csvFile(csv);

        ImportSummaryResponse summary = importService.importCsv(user, 1L, file);

        assertThat(summary.getSkippedCount()).isEqualTo(1);
        assertThat(summary.getRows().get(0).getReason()).contains("zero");
    }

    @Test
    void oneMalformedRowDoesNotAbortTheRestOfTheImport() {
        // Row 2 has garbage instead of a real amount - row 3 (well-formed)
        // must still be imported afterward, not lost along with row 2.
        String csv = "Date,Description,Amount\n"
                + "2026-08-01,Good row,-100\n"
                + "not-a-date,Bad row,abc\n"
                + "2026-08-03,Another good row,-200\n";
        MockMultipartFile file = csvFile(csv);

        ImportSummaryResponse summary = importService.importCsv(user, 1L, file);

        assertThat(summary.getImportedCount()).isEqualTo(2);
        assertThat(summary.getSkippedCount()).isEqualTo(1);
    }

    @Test
    void twoIdenticalRowsInOneCsvImportAsTwoSeparateTransactions() {
        // Two purchases with the same account, date, amount, and description should
        // both be imported — they are genuinely distinct real-world transactions.
        // Without the occurrence counter they would share the same fingerprint;
        // the second row would appear already-imported and be silently dropped.
        String csv = "Date,Description,Amount\n"
                + "2026-08-01,Chai,-50\n"
                + "2026-08-01,Chai,-50\n";   // identical to the row above
        MockMultipartFile file = csvFile(csv);

        ImportSummaryResponse summary = importService.importCsv(user, 1L, file);

        assertThat(summary.getImportedCount()).isEqualTo(2);
        assertThat(summary.getSkippedCount()).isZero();
    }

    @Test
    void reImportingTheSameCsvSkipsBothRows() {
        // Re-uploading a file that was previously imported must skip every row.
        // The DB already has fingerprint for occurrence-1 and occurrence-2,
        // so both should be reported as "already imported".
        String csv = "Date,Description,Amount\n"
                + "2026-08-01,Chai,-50\n"
                + "2026-08-01,Chai,-50\n";
        MockMultipartFile file = csvFile(csv);

        // Simulate both fingerprints already present in the database.
        when(transactionRepository.existsByImportFingerprint(anyString())).thenReturn(true);

        ImportSummaryResponse summary = importService.importCsv(user, 1L, file);

        assertThat(summary.getImportedCount()).isZero();
        assertThat(summary.getSkippedCount()).isEqualTo(2);
        assertThat(summary.getRows()).allMatch(r -> r.getReason().contains("duplicate") || r.getReason().contains("Already imported"));
    }

    private MockMultipartFile csvFile(String content) {
        return new MockMultipartFile(
                "file", "statement.csv", "text/csv", content.getBytes(StandardCharsets.UTF_8)
        );
    }

    private CategoryResponse mockCategory(Long id, String name, CategoryType type) {
        CategoryResponse category = mock(CategoryResponse.class);
        when(category.getId()).thenReturn(id);
        when(category.getName()).thenReturn(name);
        when(category.getCategoryType()).thenReturn(type);
        return category;
    }
}
