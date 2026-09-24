package com.finpilot.finpilotbackend.finance.service;

import com.finpilot.finpilotbackend.finance.dto.TransactionDtos.CreateTransactionRequest;
import com.finpilot.finpilotbackend.finance.dto.TransactionDtos.TransactionResponse;
import com.finpilot.finpilotbackend.finance.entity.Account;
import com.finpilot.finpilotbackend.finance.entity.Category;
import com.finpilot.finpilotbackend.finance.entity.CategoryType;
import com.finpilot.finpilotbackend.finance.entity.Transaction;
import com.finpilot.finpilotbackend.finance.exception.InvalidTransactionException;
import com.finpilot.finpilotbackend.finance.exception.ResourceNotFoundException;
import com.finpilot.finpilotbackend.finance.repository.AccountRepository;
import com.finpilot.finpilotbackend.finance.repository.TransactionRepository;
import com.finpilot.finpilotbackend.identity.entity.User;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;
import java.util.stream.Collectors;

@Service
public class TransactionService {

    private final TransactionRepository transactionRepository;
    private final AccountRepository accountRepository;
    private final AccountService accountService;
    private final CategoryService categoryService;

    public TransactionService(
            TransactionRepository transactionRepository,
            AccountRepository accountRepository,
            AccountService accountService,
            CategoryService categoryService
    ) {
        this.transactionRepository = transactionRepository;
        this.accountRepository = accountRepository;
        this.accountService = accountService;
        this.categoryService = categoryService;
    }

    @Transactional
    public TransactionResponse create(User user, CreateTransactionRequest request) {
        // Ownership checks - never trust an ID from the client without confirming
        // it actually belongs to the authenticated user.
        Account account = accountService.findOwnedOrThrow(user, request.getAccountId());
        Category category = categoryService.findAvailableOrThrow(user, request.getCategoryId());

        validateTypeMatchesCategory(request.getTransactionType(), category);

        Transaction transaction = new Transaction(
                user,
                account,
                category,
                request.getTransactionType(),
                request.getAmount(),
                request.getDescription(),
                request.getTransactionDate()
        );
        Transaction saved = transactionRepository.save(transaction);

        applyToBalance(account, request.getTransactionType(), request.getAmount());

        return new TransactionResponse(saved);
    }

    // Used exclusively by StatementImportService. Identical to create() but
    // also stores the deduplication fingerprint so a repeat upload of the same
    // file skips this row rather than creating a duplicate. Returns the raw
    // entity because the import service needs to read back the description for
    // the RowResult - avoids a second repository lookup.
    @Transactional
    public Transaction createImported(User user, CreateTransactionRequest request, String importFingerprint) {
        Account account = accountService.findOwnedOrThrow(user, request.getAccountId());
        Category category = categoryService.findAvailableOrThrow(user, request.getCategoryId());
        validateTypeMatchesCategory(request.getTransactionType(), category);

        Transaction transaction = new Transaction(
                user,
                account,
                category,
                request.getTransactionType(),
                request.getAmount(),
                request.getDescription(),
                request.getTransactionDate()
        );
        transaction.setImportFingerprint(importFingerprint);
        Transaction saved = transactionRepository.save(transaction);

        applyToBalance(account, request.getTransactionType(), request.getAmount());

        return saved;
    }

    // Edit support - the correction path CSV import and ML suggestions need
    // (a wrongly-imported or wrongly-categorized transaction previously had
    // no fix but delete-and-recreate). Validates the NEW account/category
    // BEFORE touching any balance, so a rejected edit never leaves a
    // reversed-but-not-reapplied balance to reason about.
    @Transactional
    public TransactionResponse update(User user, Long transactionId, CreateTransactionRequest request) {
        Transaction transaction = transactionRepository.findByIdAndUserId(transactionId, user.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Transaction not found: " + transactionId));

        Account newAccount = accountService.findOwnedOrThrow(user, request.getAccountId());
        Category newCategory = categoryService.findAvailableOrThrow(user, request.getCategoryId());
        validateTypeMatchesCategory(request.getTransactionType(), newCategory);

        // Only now, after validation passed, is it safe to touch balances -
        // reverse the OLD effect on the OLD account (even if the account
        // isn't changing, the amount or type might be), then apply the new
        // effect on the (possibly different) new account.
        reverseFromBalance(transaction.getAccount(), transaction.getTransactionType(), transaction.getAmount());

        transaction.setAccount(newAccount);
        transaction.setCategory(newCategory);
        transaction.setTransactionType(request.getTransactionType());
        transaction.setAmount(request.getAmount());
        transaction.setDescription(request.getDescription());
        transaction.setTransactionDate(request.getTransactionDate());

        Transaction saved = transactionRepository.save(transaction);
        applyToBalance(newAccount, request.getTransactionType(), request.getAmount());

        return new TransactionResponse(saved);
    }

    // Deleting a transaction must reverse its effect on the account balance -
    // otherwise a deleted ₹500 expense leaves the balance ₹500 short forever.
    @Transactional
    public void delete(User user, Long transactionId) {
        Transaction transaction = transactionRepository.findByIdAndUserId(transactionId, user.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Transaction not found: " + transactionId));

        reverseFromBalance(transaction.getAccount(), transaction.getTransactionType(), transaction.getAmount());
        transactionRepository.delete(transaction);
    }

    public List<TransactionResponse> listForUser(User user) {
        return transactionRepository.findByUserIdOrderByTransactionDateDesc(user.getId()).stream()
                .map(TransactionResponse::new)
                .collect(Collectors.toList());
    }

    public TransactionResponse getOne(User user, Long transactionId) {
        Transaction transaction = transactionRepository.findByIdAndUserId(transactionId, user.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Transaction not found: " + transactionId));
        return new TransactionResponse(transaction);
    }

    private void validateTypeMatchesCategory(CategoryType transactionType, Category category) {
        if (category.getCategoryType() != transactionType) {
            throw new InvalidTransactionException(
                    "Transaction type " + transactionType +
                    " does not match category '" + category.getName() + "' (" + category.getCategoryType() + ")"
            );
        }
    }

    private void applyToBalance(Account account, CategoryType type, BigDecimal amount) {
        account.setBalance(account.getBalance().add(signedDelta(type, amount)));
        accountRepository.save(account);
    }

    // The exact inverse of applyToBalance - shares signedDelta() with it
    // deliberately, so apply and reverse can never drift out of sync with
    // each other (e.g. one getting updated for a new CategoryType without
    // the other).
    private void reverseFromBalance(Account account, CategoryType type, BigDecimal amount) {
        account.setBalance(account.getBalance().subtract(signedDelta(type, amount)));
        accountRepository.save(account);
    }

    private BigDecimal signedDelta(CategoryType type, BigDecimal amount) {
        return (type == CategoryType.INCOME) ? amount : amount.negate();
    }
}
