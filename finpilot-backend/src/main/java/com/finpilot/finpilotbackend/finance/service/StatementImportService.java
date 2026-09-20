package com.finpilot.finpilotbackend.finance.service;

import com.finpilot.finpilotbackend.finance.dto.CategoryPredictionResponse;
import com.finpilot.finpilotbackend.finance.dto.ImportDtos.ImportSummaryResponse;
import com.finpilot.finpilotbackend.finance.dto.ImportDtos.RowResult;
import com.finpilot.finpilotbackend.finance.dto.TransactionDtos.CreateTransactionRequest;
import com.finpilot.finpilotbackend.finance.entity.CategoryType;
import com.finpilot.finpilotbackend.finance.exception.StatementImportException;
import com.finpilot.finpilotbackend.finance.ml.NaiveBayesTextClassifier;
import com.opencsv.CSVReader;
import com.opencsv.exceptions.CsvValidationException;
import com.finpilot.finpilotbackend.identity.entity.User;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.io.InputStreamReader;
import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

// Solves the actual adoption problem flagged earlier in this project's
// research phase: manual entry alone has poor real-world retention. This
// lets a user upload a plain CSV (Date,Description,Amount - amount sign
// indicates income/expense) and get transactions created automatically.
//
// Categorization is ML-first: a Naive Bayes classifier trained on the
// user's OWN transaction history (CategoryPredictionService) is tried
// first, since it's personalized to how that specific user actually
// writes descriptions. A fixed keyword list is the fallback for users
// who don't have enough history yet for the classifier to learn from -
// this keeps the feature useful from day one, not just after weeks of use.
//
// Deliberately reuses TransactionService.create() per row instead of
// writing a second, parallel path to the database - every row still goes
// through the same ownership checks, category-type validation, and atomic
// balance update as a manually-entered transaction. This is the same
// "call into services, not repositories directly" principle the rest of
// the codebase follows.
//
// Known limitation, stated honestly rather than glossed over: this does
// not detect or skip duplicate transactions on a repeat upload of the same
// statement. A real production version would need that - out of scope here.
@Service
public class StatementImportService {

    private static final int MAX_ROWS = 2000; // guards against an accidentally huge upload

    private static final Map<String, String> EXPENSE_KEYWORDS = new LinkedHashMap<>();
    private static final Map<String, String> INCOME_KEYWORDS = new LinkedHashMap<>();

    static {
        // Checked in insertion order, first match wins - most specific
        // merchant names first, generic terms last.
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
    private final AccountService accountService;
    private final CategoryService categoryService;
    private final CategoryPredictionService categoryPredictionService;

    public StatementImportService(
            TransactionService transactionService,
            AccountService accountService,
            CategoryService categoryService,
            CategoryPredictionService categoryPredictionService
    ) {
        this.transactionService = transactionService;
        this.accountService = accountService;
        this.categoryService = categoryService;
        this.categoryPredictionService = categoryPredictionService;
    }

    public ImportSummaryResponse importCsv(User user, Long accountId, MultipartFile file) {
        // Fail fast on account ownership before processing a single row,
        // rather than discovering it's not the user's account mid-import.
        accountService.findOwnedOrThrow(user, accountId);

        Map<String, Long> categoryIdLookup = buildCategoryLookup(user);

        // Train once per import, not once per row - retraining on every
        // single row would be wasteful when the underlying history doesn't
        // change mid-import. Empty if the user doesn't have enough history
        // yet for that type - the row loop falls back to keyword matching
        // in that case.
        Optional<NaiveBayesTextClassifier> expenseClassifier = categoryPredictionService.trainedClassifierFor(user, CategoryType.EXPENSE);
        Optional<NaiveBayesTextClassifier> incomeClassifier = categoryPredictionService.trainedClassifierFor(user, CategoryType.INCOME);

        List<RowResult> results = new ArrayList<>();
        int imported = 0;

        try (CSVReader reader = new CSVReader(new InputStreamReader(file.getInputStream(), StandardCharsets.UTF_8))) {
            reader.readNext(); // skip header row
            String[] row;
            int rowNumber = 1;

            while ((row = reader.readNext()) != null) {
                rowNumber++;
                if (rowNumber > MAX_ROWS) {
                    results.add(RowResult.skipped(rowNumber, "Import stopped - exceeds " + MAX_ROWS + " row limit"));
                    break;
                }

                RowResult result = importRow(user, accountId, row, rowNumber, categoryIdLookup, expenseClassifier, incomeClassifier);
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
            User user, Long accountId, String[] row, int rowNumber, Map<String, Long> categoryIdLookup,
            Optional<NaiveBayesTextClassifier> expenseClassifier, Optional<NaiveBayesTextClassifier> incomeClassifier
    ) {
        try {
            if (row.length < 3) {
                return RowResult.skipped(rowNumber, "Expected 3 columns (Date, Description, Amount), found " + row.length);
            }

            LocalDate date = parseDate(row[0].trim());
            String description = row[1].trim();
            BigDecimal rawAmount = new BigDecimal(row[2].trim());

            if (date.isAfter(LocalDate.now())) {
                return RowResult.skipped(rowNumber, "Date is in the future: " + date);
            }
            if (rawAmount.compareTo(BigDecimal.ZERO) == 0) {
                return RowResult.skipped(rowNumber, "Amount cannot be zero");
            }

            // Convention: positive amount = income, negative = expense -
            // the same sign convention most bank/spreadsheet exports use.
            CategoryType type = rawAmount.signum() > 0 ? CategoryType.INCOME : CategoryType.EXPENSE;
            BigDecimal amount = rawAmount.abs();

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

            transactionService.create(user, request);
            return RowResult.imported(rowNumber, description, categoryName);

        } catch (DateTimeParseException e) {
            return RowResult.skipped(rowNumber, "Invalid date format - expected YYYY-MM-DD");
        } catch (NumberFormatException e) {
            return RowResult.skipped(rowNumber, "Invalid amount value");
        } catch (Exception e) {
            // Catch-all so one malformed row never aborts the whole import -
            // every other row still gets a fair chance to process.
            return RowResult.skipped(rowNumber, "Could not import this row: " + e.getMessage());
        }
    }

    private LocalDate parseDate(String value) {
        return LocalDate.parse(value); // expects ISO format, YYYY-MM-DD
    }

    // ML prediction first (personalized to this user's own history), keyword
    // matching as the fallback - covers brand-new users who have no history
    // for the classifier to learn from yet, so the feature degrades
    // gracefully instead of producing no category at all.
    private String resolveCategory(User user, String description, CategoryType type, Optional<NaiveBayesTextClassifier> classifier) {
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
