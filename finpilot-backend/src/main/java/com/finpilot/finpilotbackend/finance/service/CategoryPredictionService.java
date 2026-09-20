package com.finpilot.finpilotbackend.finance.service;

import com.finpilot.finpilotbackend.finance.dto.CategoryPredictionResponse;
import com.finpilot.finpilotbackend.finance.dto.CategoryResponse;
import com.finpilot.finpilotbackend.finance.entity.CategoryType;
import com.finpilot.finpilotbackend.finance.entity.Transaction;
import com.finpilot.finpilotbackend.finance.ml.NaiveBayesTextClassifier;
import com.finpilot.finpilotbackend.finance.repository.TransactionRepository;
import com.finpilot.finpilotbackend.identity.entity.User;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;

// Trains a fresh Naive Bayes classifier per request from the user's own
// past transactions (description -> category they chose), then predicts a
// category for new, not-yet-categorized text. This is genuinely personalized
// in a way a fixed keyword list can never be - it learns YOUR spending
// vocabulary specifically (a user who writes "chai" instead of "coffee"
// gets that pattern learned automatically, no keyword list update needed).
//
// Retraining on every call is deliberately simple rather than caching a
// persisted model - at the transaction volumes a personal finance app
// actually has (hundreds to low thousands of rows per user, not millions),
// retraining costs single-digit milliseconds. Caching would be premature
// optimization here, and this way the model is always current with the
// user's latest categorization choices, no invalidation logic needed.
@Service
public class CategoryPredictionService {

    private static final int MIN_TRAINING_EXAMPLES = 5;
    private static final double MIN_CONFIDENCE = 0.5;

    private final TransactionRepository transactionRepository;
    private final CategoryService categoryService;

    public CategoryPredictionService(TransactionRepository transactionRepository, CategoryService categoryService) {
        this.transactionRepository = transactionRepository;
        this.categoryService = categoryService;
    }

    public Optional<CategoryPredictionResponse> predict(User user, String description, CategoryType type) {
        Optional<NaiveBayesTextClassifier> classifier = trainedClassifierFor(user, type);
        if (classifier.isEmpty()) {
            return Optional.empty();
        }
        return predictWithClassifier(user, classifier.get(), description, type);
    }

    // Exposed separately so a caller processing many descriptions at once
    // (e.g. StatementImportService importing a whole CSV) can train ONE
    // classifier up front and reuse it per row, instead of re-fetching and
    // re-training from scratch on every single row.
    public Optional<NaiveBayesTextClassifier> trainedClassifierFor(User user, CategoryType type) {
        List<Transaction> history = transactionRepository.findByUserIdOrderByTransactionDateDesc(user.getId()).stream()
                .filter(t -> t.getTransactionType() == type)
                .filter(t -> t.getDescription() != null && !t.getDescription().isBlank())
                .toList();

        if (history.size() < MIN_TRAINING_EXAMPLES) {
            // Not enough of the user's own history to learn from yet -
            // honest "no prediction" rather than guessing off too little data.
            return Optional.empty();
        }

        NaiveBayesTextClassifier classifier = new NaiveBayesTextClassifier();
        for (Transaction transaction : history) {
            classifier.train(transaction.getDescription(), transaction.getCategory().getName());
        }
        return Optional.of(classifier);
    }

    public Optional<CategoryPredictionResponse> predictWithClassifier(
            User user, NaiveBayesTextClassifier classifier, String description, CategoryType type
    ) {
        Optional<NaiveBayesTextClassifier.Prediction> prediction = classifier.predict(description);
        if (prediction.isEmpty() || prediction.get().confidence() < MIN_CONFIDENCE) {
            return Optional.empty();
        }

        String predictedCategoryName = prediction.get().label();
        Long categoryId = resolveCategoryId(user, predictedCategoryName, type);
        if (categoryId == null) {
            // The predicted label doesn't match a category that still exists
            // for this user (e.g. deleted since) - fail safe, no prediction.
            return Optional.empty();
        }

        return Optional.of(new CategoryPredictionResponse(categoryId, predictedCategoryName, prediction.get().confidence()));
    }

    private Long resolveCategoryId(User user, String categoryName, CategoryType type) {
        Map<String, Long> lookup = categoryService.listForUser(user).stream()
                .filter(c -> c.getCategoryType() == type)
                .collect(Collectors.toMap(CategoryResponse::getName, CategoryResponse::getId, (a, b) -> a));
        return lookup.get(categoryName);
    }
}
