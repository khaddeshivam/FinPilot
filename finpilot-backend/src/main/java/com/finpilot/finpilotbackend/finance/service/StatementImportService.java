package com.finpilot.finpilotbackend.finance.service;

import com.finpilot.finpilotbackend.finance.dto.CategoryPredictionResponse;
import com.finpilot.finpilotbackend.finance.dto.ImportDtos.ImportSummaryResponse;
import com.finpilot.finpilotbackend.finance.dto.ImportDtos.RowResult;
import com.finpilot.finpilotbackend.finance.dto.TransactionDtos.CreateTransactionRequest;
import com.finpilot.finpilotbackend.finance.entity.CategoryType;
import com.finpilot.finpilotbackend.finance.entity.Transaction;
import com.finpilot.finpilotbackend.finance.exception.StatementImportException;
import com.finpilot.finpilotbackend.finance.ml.NaiveBayesTextClassifier;
import com.finpilot.finpilotbackend.finance.repository.AccountRepository;
import com.finpilot.finpilotbackend.finance.repository.TransactionRepository;
import com.opencsv.CSVReader;
import com.opencsv.exceptions.CsvValidationException;
import com.finpilot.finpilotbackend.identity.entity.User;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.io.InputStreamReader;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.HexFormat;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

// CSV statement import with deduplication, flexible column layouts, and
// multiple date formats. Design choices:
//
// DEDUPLICATION: a SHA-256 fingerprint of (account_id + transaction_date +
// amount + normalised description) is stored on the transaction row. A unique
// partial index on that column means re-uploading the same file skips already-
// imported rows instead of doubling them. Manually-entered transactions leave
// importFingerprint = null, which is always unique in SQL.
//
// COLUMN LAYOUTS: many Indian bank CSV exports use separate Debit/Credit
// columns instead of a single signed Amount column. This service detects
// which layout is in use from the header row and handles both:
//   Layout A (3-column): Date, Description, Amount  (positive=income, neg=expense)
//   Layout B (4-column): Date, Description, Debit, Credit  (bank statement style)
//
// DATE FORMATS: ISO YYYY-MM-DD is tried first; day-first formats
// dd/MM/yyyy and dd-MM-yyyy are tried as fallbacks so common Indian bank
// exports parse without requiring the user to pre-process the file.
//
// Categorisation is ML-first (personalised Naive Bayes) with keyword fallback.
// Each row still goes through TransactionService.create() for ownership checks,
// category-type validation, and balance updates.
@Service
public class StatementImportService {

    private static final int MAX_ROWS = 2000;

    // Supported date formats in priority order. ISO first because it is
    // unambiguous; day-first next because that is the dominant Indian bank format.
    private static final List<DateTimeFormatter> DATE_FORMATS = List.of(
            DateTimeFormatter.ISO_LOCAL_DATE,           // 2026-08-15
            DateTimeFormatter.ofPattern("dd/MM/yyyy"),  // 15/08/2026
            DateTimeFormatter.ofPattern("dd-MM-yyyy"),  // 15-08-2026
            DateTimeFormatter.ofPattern("d/M/yyyy"),    // 5/8/2026
            DateTimeFormatter.ofPattern("d-M-yyyy")     // 5-8-2026
    );

    private static final Map<String, String> EXPENSE_KEYWORDS = new LinkedHashMap<>();
    private static final Map<String, String> INCOME_KEYWORDS = new LinkedHashMap<>();

    static {
        EXPENSE_KEYWORDS.put("swiggy", "Food");
        EXPENSE_KEYWORDS.put("zomato", "Food");
        EXPENSE_KEYWORDS.put("restaurant", "Food");
        EXPENSE_KEYWORDS.put("cafe", "Food");
        EXPENSE_KEYWORDS.put("food", "Food");
        EXPENSE_KEYWORDS.put("uber", "Transport");
        EXPENSE_KEYWORDS.put("ola", "Transport");
        EXPENSE_KEYWORDS.put("petrol", "Transport");
        EXPENSE_KEYWORDS.put("fuel", "Transport");
        EXPENSE_KEYWORDS.put("metro", "Transport");
        EXPENSE_KEYWORDS.put("rent", "Rent");
        EXPENSE_KEYWORDS.put("landlord", "Rent");
        EXPENSE_KEYWORDS.put("electricity", "Utilities");
        EXPENSE_KEYWORDS.put("broadband", "Utilities");
        EXPENSE_KEYWORDS.put("wifi", "Utilities");
        EXPENSE_KEYWORDS.put("recharge", "Utilities");
        EXPENSE_KEYWORDS.put("amazon", "Shopping");
        EXPENSE_KEYWORDS.put("flipkart", "Shopping");
        EXPENSE_KEYWORDS.put("myntra", "Shopping");
        EXPENSE_KEYWORDS.put("netflix", "Entertainment");
        EXPENSE_KEYWORDS.put("spotify", "Entertainment");
        EXPENSE_KEYWORDS.put("movie", "Entertainment");
        EXPENSE_KEYWORDS.put("bookmyshow", "Entertainment");
        EXPENSE_KEYWORDS.put("hospital", "Health");
        EXPENSE_KEYWORDS.put("pharmacy", "Health");
        EXPENSE_KEYWORDS.put("medicine", "Health");
        EXPENSE_KEYWORDS.put("doctor", "Health");

        INCOME_KEYWORDS.put("salary", "Salary");
        INCOME_KEYWORDS.put("payroll", "Salary");
        INCOME_KEYWORDS.put("freelance", "Freelance");
        INCOME_KEYWORDS.put("invoice", "Freelance");
    }

    private final TransactionService transactionService;
    private final TransactionRepository transactionRepository;
    private final AccountService accountService;
    private final CategoryService categoryService;
    private final CategoryPredictionService categoryPredictionService;

    public StatementImportService(
            TransactionService transactionService,
            TransactionRepository transactionRepository,
            AccountService accountService,
            CategoryService categoryService,
            CategoryPredictionService categoryPredictionService
    ) {
        this.transactionService = transactionService;
        this.transactionRepository = transactionRepository;
        this.accountService = accountService;
        this.categoryService = categoryService;
        this.categoryPredictionService = categoryPredictionService;
    }

    public ImportSummaryResponse importCsv(User user, Long accountId, MultipartFile file) {
        accountService.findOwnedOrThrow(user, accountId);

        Map<String, Long> categoryIdLookup = buildCategoryLookup(user);
        Optional<NaiveBayesTextClassifier> expenseClassifier = categoryPredictionService.trainedClassifierFor(user, CategoryType.EXPENSE);
        Optional<NaiveBayesTextClassifier> incomeClassifier = categoryPredictionService.trainedClassifierFor(user, CategoryType.INCOME);

        List<RowResult> results = new ArrayList<>();
        int imported = 0;
        boolean debitCreditLayout = false;

        try (CSVReader reader = new CSVReader(new InputStreamReader(file.getInputStream(), StandardCharsets.UTF_8))) {
            String[] header = reader.readNext();
            if (header != null) {
                // Detect layout from the header row. A header containing both
                // "debit" and "credit" (case-insensitive) signals the 4-column
                // bank-statement style; otherwise assume signed-amount style.
                String headerJoined = String.join(",", header).toLowerCase();
                debitCreditLayout = headerJoined.contains("debit") && headerJoined.contains("credit");
            }

            String[] row;
            int rowNumber = 1;

            while ((row = reader.readNext()) != null) {
                rowNumber++;
                if (rowNumber > MAX_ROWS) {
                    results.add(RowResult.skipped(rowNumber, "Import stopped - exceeds " + MAX_ROWS + " row limit"));
                    break;
                }

                RowResult result = importRow(user, accountId, row, rowNumber, categoryIdLookup,
                        expenseClassifier, incomeClassifier, debitCreditLayout);
                results.add(result);
                if (result.isImported()) {
                    imported++;
                }
            }
        } catch (IOException | CsvValidationException e) {
            throw new StatementImportException("Couldn't read the uploaded file - make sure it's a valid CSV");
        }

        int skipped = results.size() - imported;
        return new ImportSummaryResponse(results.size(), imported, skipped, results);
    }

    private RowResult importRow(
            User user, Long accountId, String[] row, int rowNumber,
            Map<String, Long> categoryIdLookup,
            Optional<NaiveBayesTextClassifier> expenseClassifier,
            Optional<NaiveBayesTextClassifier> incomeClassifier,
            boolean debitCreditLayout
    ) {
        try {
            int minColumns = debitCreditLayout ? 4 : 3;
            if (row.length < minColumns) {
                return RowResult.skipped(rowNumber, "Expected " + minColumns + " columns, found " + row.length);
            }

            LocalDate date = parseDate(row[0].trim());
            String description = row[1].trim();

            BigDecimal rawAmount;
            if (debitCreditLayout) {
                // Layout B: columns 3 (debit/withdrawal) and 4 (credit/deposit).
                // Empty cell means 0 for that side.
                BigDecimal debit = parseMoney(row[2].trim());
                BigDecimal credit = parseMoney(row[3].trim());
                if (debit.compareTo(BigDecimal.ZERO) == 0 && credit.compareTo(BigDecimal.ZERO) == 0) {
                    return RowResult.skipped(rowNumber, "Both debit and credit are zero");
                }
                // Debit is a withdrawal (expense), credit is a deposit (income).
                rawAmount = credit.compareTo(BigDecimal.ZERO) > 0 ? credit : debit.negate();
            } else {
                // Layout A: single signed amount column.
                rawAmount = new BigDecimal(row[2].trim().replace(",", ""));
            }

            if (date.isAfter(LocalDate.now())) {
                return RowResult.skipped(rowNumber, "Date is in the future: " + date);
            }
            if (rawAmount.compareTo(BigDecimal.ZERO) == 0) {
                return RowResult.skipped(rowNumber, "Amount cannot be zero");
            }

            CategoryType type = rawAmount.signum() > 0 ? CategoryType.INCOME : CategoryType.EXPENSE;
            BigDecimal amount = rawAmount.abs().setScale(2, RoundingMode.HALF_UP);

            // Deduplication: compute a stable fingerprint for this row and skip if
            // it was already imported. This makes re-uploading the same statement
            // safe - no double-counting, no phantom balance changes.
            String fingerprint = computeFingerprint(accountId, date, amount, description);
            if (transactionRepository.existsByImportFingerprint(fingerprint)) {
                return RowResult.skipped(rowNumber, "Already imported (duplicate row skipped)");
            }

            String categoryName = resolveCategory(user, description, type,
                    type == CategoryType.INCOME ? incomeClassifier : expenseClassifier);
            Long categoryId = categoryIdLookup.get(lookupKey(categoryName, type));
            if (categoryId == null) {
                return RowResult.skipped(rowNumber, "Could not resolve a category for this row");
            }

            CreateTransactionRequest request = new CreateTransactionRequest();
            request.setAccountId(accountId);
            request.setCategoryId(categoryId);
            request.setTransactionType(type);
            request.setAmount(amount);
            request.setDescription(description);
            request.setTransactionDate(date);

            Transaction created = transactionService.createImported(user, request, fingerprint);
            return RowResult.imported(rowNumber, created.getDescription(), categoryName);

        } catch (DateTimeParseException e) {
            return RowResult.skipped(rowNumber, "Unrecognised date format (try YYYY-MM-DD, DD/MM/YYYY, or DD-MM-YYYY)");
        } catch (NumberFormatException e) {
            return RowResult.skipped(rowNumber, "Invalid amount value");
        } catch (Exception e) {
            // Catch-all so one bad row never aborts the whole import.
            // Do not forward e.getMessage() - it may contain internal details.
            return RowResult.skipped(rowNumber, "Could not import this row - check the date and amount format");
        }
    }

    private LocalDate parseDate(String value) {
        for (DateTimeFormatter fmt : DATE_FORMATS) {
            try {
                return LocalDate.parse(value, fmt);
            } catch (DateTimeParseException ignored) {
                // try next format
            }
        }
        throw new DateTimeParseException("No supported date format matched", value, 0);
    }

    private BigDecimal parseMoney(String value) {
        if (value.isEmpty()) return BigDecimal.ZERO;
        // Strip commas used as thousands separators (e.g. "1,23,456.78")
        return new BigDecimal(value.replace(",", ""));
    }

    // SHA-256 of "accountId|date|amount|normalisedDescription" as a hex string.
    // Stripping whitespace/case from the description guards against trivial
    // formatting differences in re-exports of the same underlying data.
    private String computeFingerprint(Long accountId, LocalDate date, BigDecimal amount, String description) {
        String raw = accountId + "|" + date + "|" + amount.toPlainString() + "|"
                + description.trim().toLowerCase();
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(raw.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(hash);
        } catch (NoSuchAlgorithmException e) {
            // SHA-256 is mandated by the JVM spec; this can never happen.
            throw new IllegalStateException("SHA-256 not available", e);
        }
    }

    private String resolveCategory(User user, String description, CategoryType type,
                                   Optional<NaiveBayesTextClassifier> classifier) {
        if (classifier.isPresent()) {
            Optional<CategoryPredictionResponse> prediction =
                    categoryPredictionService.predictWithClassifier(user, classifier.get(), description, type);
            if (prediction.isPresent()) {
                return prediction.get().getCategoryName();
            }
        }
        return suggestCategoryByKeyword(description, type);
    }

    private String suggestCategoryByKeyword(String description, CategoryType type) {
        String lower = description.toLowerCase();
        Map<String, String> keywords = (type == CategoryType.INCOME) ? INCOME_KEYWORDS : EXPENSE_KEYWORDS;
        for (Map.Entry<String, String> entry : keywords.entrySet()) {
            if (lower.contains(entry.getKey())) {
                return entry.getValue();
            }
        }
        return (type == CategoryType.INCOME) ? "Other Income" : "Other";
    }

    private Map<String, Long> buildCategoryLookup(User user) {
        Map<String, Long> lookup = new LinkedHashMap<>();
        categoryService.listForUser(user).forEach(category ->
                lookup.put(lookupKey(category.getName(), category.getCategoryType()), category.getId())
        );
        return lookup;
    }

    private String lookupKey(String categoryName, CategoryType type) {
        return categoryName + "|" + type;
    }
}
