package com.finpilot.finpilotbackend.finance.controller;

import com.finpilot.finpilotbackend.finance.dto.CategoryPredictionResponse;
import com.finpilot.finpilotbackend.finance.dto.TransactionDtos.CreateTransactionRequest;
import com.finpilot.finpilotbackend.finance.dto.TransactionDtos.TransactionResponse;
import com.finpilot.finpilotbackend.finance.entity.CategoryType;
import com.finpilot.finpilotbackend.finance.service.CategoryPredictionService;
import com.finpilot.finpilotbackend.finance.service.TransactionService;
import com.finpilot.finpilotbackend.identity.entity.User;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/transactions")
public class TransactionController {

    private final TransactionService transactionService;
    private final CategoryPredictionService categoryPredictionService;

    public TransactionController(TransactionService transactionService, CategoryPredictionService categoryPredictionService) {
        this.transactionService = transactionService;
        this.categoryPredictionService = categoryPredictionService;
    }

    @PostMapping
    public ResponseEntity<TransactionResponse> create(
            @AuthenticationPrincipal User user,
            @Valid @RequestBody CreateTransactionRequest request
    ) {
        return ResponseEntity.status(HttpStatus.CREATED).body(transactionService.create(user, request));
    }

    @GetMapping
    public List<TransactionResponse> list(@AuthenticationPrincipal User user) {
        return transactionService.listForUser(user);
    }

    @GetMapping("/{id}")
    public TransactionResponse getOne(@AuthenticationPrincipal User user, @PathVariable Long id) {
        return transactionService.getOne(user, id);
    }

    // Full replace, not a partial patch - every field is re-validated the
    // same way a create is, including ownership of the (possibly new)
    // account and category, and the type-matches-category check.
    @PutMapping("/{id}")
    public TransactionResponse update(
            @AuthenticationPrincipal User user,
            @PathVariable Long id,
            @Valid @RequestBody CreateTransactionRequest request
    ) {
        return transactionService.update(user, id, request);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@AuthenticationPrincipal User user, @PathVariable Long id) {
        transactionService.delete(user, id);
        return ResponseEntity.noContent().build();
    }

    // Learns from the user's own categorization history via a Naive Bayes
    // classifier - returns 204 No Content (not an error) when there isn't
    // enough history yet to predict confidently. The frontend treats "no
    // suggestion" as a normal, expected state, not a failure.
    @GetMapping("/suggest-category")
    public ResponseEntity<CategoryPredictionResponse> suggestCategory(
            @AuthenticationPrincipal User user,
            @RequestParam String description,
            @RequestParam CategoryType type
    ) {
        return categoryPredictionService.predict(user, description, type)
                .map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.noContent().build());
    }
}
