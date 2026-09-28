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

import org.mockito.ArgumentCaptor;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.clearInvocations;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
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

        // Build the list BEFORE passing it to when(...), so that the inner
        // mock(CategoryResponse.class) + when(category.getId()) stubs inside
        // mockCategory() are fully resolved before Mockito opens the outer stub.
        // Nesting a when() call inside another when()'s argument causes the
        // "Unfinished stubbing" error in strict mode.
        List<CategoryResponse> categories = List.of(
                mockCategory(1L, "Food", CategoryType.EXPENSE),
                mockCategory(2L, "Other", CategoryType.EXPENSE),
                mockCategory(3L, "Salary", CategoryType.INCOME),
                mockCategory(4L, "Other Income", CategoryType.INCOME)
        );
        when(categoryService.listForUser(user)).thenReturn(categories);

        // Stub createImported so imported rows return a Transaction with a description.
        // lenient() because tests that skip every row (future date, zero amount) never
        // reach createImported or trainedClassifierFor, and strict mode would flag them
        // as unnecessary stubs.
        Transaction stubTx = mock(Transaction.class);
        lenient().when(stubTx.getDescription()).thenReturn("stub");
        lenient().when(transactionService.createImported(any(), any(), anyString())).thenReturn(stubTx);
        // No training history yet - forces every row through the keyword
        // fallback path, which is what these tests are actually verifying.
        lenient().when(categoryPredictionService.trainedClassifierFor(any(), any())).thenReturn(Optional.empty());
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
        // Capture the fingerprints actually passed to createImported and assert they
        // are distinct — this proves the occurrence-counter logic produces two
        // different hashes, not just that two rows happened to get through.
        String csv = "Date,Description,Amount\n"
                + "2026-08-01,Chai,-50\n"
                + "2026-08-01,Chai,-50\n";

        ImportSummaryResponse summary = importService.importCsv(user, 1L, csvFile(csv));

        ArgumentCaptor<String> fingerprints = ArgumentCaptor.forClass(String.class);
        verify(transactionService, times(2)).createImported(any(), any(), fingerprints.capture());
        assertThat(fingerprints.getAllValues()).hasSize(2).doesNotHaveDuplicates();
        assertThat(summary.getImportedCount()).isEqualTo(2);
        assertThat(summary.getSkippedCount()).isZero();
    }

    @Test
    void reImportingTheSameCsvSkipsBothRows() {
        // Re-uploading a file that was previously imported must skip every row.
        // Run the import once to learn the exact fingerprints the service produces,
        // then stub existsByImportFingerprint to return true for those specific values
        // so the second import sees them as "already in the DB".
        String csv = "Date,Description,Amount\n"
                + "2026-08-01,Chai,-50\n"
                + "2026-08-01,Chai,-50\n";

        // First import: capture the two distinct fingerprints that get stored.
        importService.importCsv(user, 1L, csvFile(csv));
        ArgumentCaptor<String> stored = ArgumentCaptor.forClass(String.class);
        verify(transactionService, times(2)).createImported(any(), any(), stored.capture());

        // Second import: only those exact fingerprints already exist in the DB.
        stored.getAllValues().forEach(fp ->
                when(transactionRepository.existsByImportFingerprint(fp)).thenReturn(true));
        clearInvocations(transactionService);

        ImportSummaryResponse summary = importService.importCsv(user, 1L, csvFile(csv));

        assertThat(summary.getSkippedCount()).isEqualTo(2);
        verify(transactionService, never()).createImported(any(), any(), anyString());
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
