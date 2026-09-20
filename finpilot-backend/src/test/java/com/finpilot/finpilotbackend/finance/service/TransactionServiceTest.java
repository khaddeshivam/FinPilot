package com.finpilot.finpilotbackend.finance.service;

import com.finpilot.finpilotbackend.finance.dto.TransactionDtos.CreateTransactionRequest;
import com.finpilot.finpilotbackend.finance.dto.TransactionDtos.TransactionResponse;
import com.finpilot.finpilotbackend.finance.entity.Account;
import com.finpilot.finpilotbackend.finance.entity.AccountType;
import com.finpilot.finpilotbackend.finance.entity.Category;
import com.finpilot.finpilotbackend.finance.entity.CategoryType;
import com.finpilot.finpilotbackend.finance.entity.Transaction;
import com.finpilot.finpilotbackend.finance.exception.InvalidTransactionException;
import com.finpilot.finpilotbackend.finance.exception.ResourceNotFoundException;
import com.finpilot.finpilotbackend.finance.repository.AccountRepository;
import com.finpilot.finpilotbackend.finance.repository.TransactionRepository;
import com.finpilot.finpilotbackend.identity.entity.User;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

// Pure unit tests with mocked repositories/services - no Spring context, no
// database. Fast (milliseconds) and focused on the one piece of logic in
// this codebase where a bug would silently corrupt real money data: the
// balance update that runs alongside every transaction.
@ExtendWith(MockitoExtension.class)
class TransactionServiceTest {

    @Mock
    private TransactionRepository transactionRepository;
    @Mock
    private AccountRepository accountRepository;
    @Mock
    private AccountService accountService;
    @Mock
    private CategoryService categoryService;

    @InjectMocks
    private TransactionService transactionService;

    private User user;
    private Account account;
    private Category expenseCategory;
    private Category incomeCategory;

    @BeforeEach
    void setUp() {
        user = new User("user@example.com", "hashed", "Test User");
        account = new Account(user, "Test Account", AccountType.BANK, BigDecimal.valueOf(1000), "INR");
        expenseCategory = new Category(user, "Food", CategoryType.EXPENSE);
        incomeCategory = new Category(user, "Salary", CategoryType.INCOME);
    }

    @Test
    void expenseTransactionDecreasesAccountBalance() {
        CreateTransactionRequest request = expenseRequest(BigDecimal.valueOf(250));
        when(accountService.findOwnedOrThrow(user, request.getAccountId())).thenReturn(account);
        when(categoryService.findAvailableOrThrow(user, request.getCategoryId())).thenReturn(expenseCategory);
        when(transactionRepository.save(any(Transaction.class))).thenAnswer(inv -> inv.getArgument(0));

        transactionService.create(user, request);

        // Started at 1000, spent 250 -> should be exactly 750, not "approximately"
        // 750 - BigDecimal comparisons must be exact for money.
        assertThat(account.getBalance()).isEqualByComparingTo(BigDecimal.valueOf(750));
        verify(accountRepository).save(account);
    }

    @Test
    void incomeTransactionIncreasesAccountBalance() {
        CreateTransactionRequest request = new CreateTransactionRequest();
        request.setAccountId(1L);
        request.setCategoryId(2L);
        request.setTransactionType(CategoryType.INCOME);
        request.setAmount(BigDecimal.valueOf(5000));
        request.setTransactionDate(LocalDate.now());

        when(accountService.findOwnedOrThrow(user, request.getAccountId())).thenReturn(account);
        when(categoryService.findAvailableOrThrow(user, request.getCategoryId())).thenReturn(incomeCategory);
        when(transactionRepository.save(any(Transaction.class))).thenAnswer(inv -> inv.getArgument(0));

        transactionService.create(user, request);

        assertThat(account.getBalance()).isEqualByComparingTo(BigDecimal.valueOf(6000));
    }

    @Test
    void rejectsTransactionWhenTypeDoesNotMatchCategoryType() {
        // Filing an EXPENSE transaction under an INCOME category (e.g. "Salary")
        // must be rejected server-side - this is the exact guard that stops a
        // client from posting data that would silently corrupt reporting.
        CreateTransactionRequest request = new CreateTransactionRequest();
        request.setAccountId(1L);
        request.setCategoryId(2L);
        request.setTransactionType(CategoryType.EXPENSE);
        request.setAmount(BigDecimal.valueOf(100));
        request.setTransactionDate(LocalDate.now());

        when(accountService.findOwnedOrThrow(user, request.getAccountId())).thenReturn(account);
        when(categoryService.findAvailableOrThrow(user, request.getCategoryId())).thenReturn(incomeCategory);

        assertThatThrownBy(() -> transactionService.create(user, request))
                .isInstanceOf(InvalidTransactionException.class)
                .hasMessageContaining("does not match category");

        // Balance must be untouched when the transaction is rejected.
        assertThat(account.getBalance()).isEqualByComparingTo(BigDecimal.valueOf(1000));
    }

    @Test
    void responseReflectsSavedTransactionData() {
        CreateTransactionRequest request = expenseRequest(BigDecimal.valueOf(99));
        when(accountService.findOwnedOrThrow(user, request.getAccountId())).thenReturn(account);
        when(categoryService.findAvailableOrThrow(user, request.getCategoryId())).thenReturn(expenseCategory);
        when(transactionRepository.save(any(Transaction.class))).thenAnswer(inv -> inv.getArgument(0));

        TransactionResponse response = transactionService.create(user, request);

        assertThat(response.getAmount()).isEqualByComparingTo(BigDecimal.valueOf(99));
        assertThat(response.getCategoryName()).isEqualTo("Food");
        assertThat(response.getTransactionType()).isEqualTo(CategoryType.EXPENSE);
    }

    // --- update() ---

    @Test
    void updatingAmountAdjustsBalanceCorrectly() {
        // Simulates an existing EXPENSE 250 transaction already reflected in
        // the balance (1000 - 250 = 750), then edited to 400.
        Transaction existing = new Transaction(user, account, expenseCategory, CategoryType.EXPENSE,
                BigDecimal.valueOf(250), "old desc", LocalDate.now());
        account.setBalance(BigDecimal.valueOf(750));

        when(transactionRepository.findByIdAndUserId(10L, user.getId())).thenReturn(Optional.of(existing));
        when(accountService.findOwnedOrThrow(user, 1L)).thenReturn(account);
        when(categoryService.findAvailableOrThrow(user, 1L)).thenReturn(expenseCategory);
        when(transactionRepository.save(any(Transaction.class))).thenAnswer(inv -> inv.getArgument(0));

        transactionService.update(user, 10L, expenseRequest(BigDecimal.valueOf(400)));

        // Reverse the old 250 (750 -> 1000), then apply the new 400 (1000 -> 600).
        assertThat(account.getBalance()).isEqualByComparingTo(BigDecimal.valueOf(600));
    }

    @Test
    void updatingAccountMovesBalanceEffectBetweenAccounts() {
        Account oldAccount = new Account(user, "Old", AccountType.BANK, BigDecimal.valueOf(750), "INR");
        Account newAccount = new Account(user, "New", AccountType.BANK, BigDecimal.valueOf(500), "INR");
        Transaction existing = new Transaction(user, oldAccount, expenseCategory, CategoryType.EXPENSE,
                BigDecimal.valueOf(250), "desc", LocalDate.now());

        when(transactionRepository.findByIdAndUserId(10L, user.getId())).thenReturn(Optional.of(existing));
        when(accountService.findOwnedOrThrow(user, 2L)).thenReturn(newAccount);
        when(categoryService.findAvailableOrThrow(user, 1L)).thenReturn(expenseCategory);
        when(transactionRepository.save(any(Transaction.class))).thenAnswer(inv -> inv.getArgument(0));

        CreateTransactionRequest request = expenseRequest(BigDecimal.valueOf(250));
        request.setAccountId(2L);
        transactionService.update(user, 10L, request);

        assertThat(oldAccount.getBalance()).isEqualByComparingTo(BigDecimal.valueOf(1000)); // fully reversed
        assertThat(newAccount.getBalance()).isEqualByComparingTo(BigDecimal.valueOf(250)); // newly applied
    }

    @Test
    void changingTransactionTypeFlipsBalanceDirection() {
        Transaction existing = new Transaction(user, account, expenseCategory, CategoryType.EXPENSE,
                BigDecimal.valueOf(200), "desc", LocalDate.now());
        account.setBalance(BigDecimal.valueOf(800));

        when(transactionRepository.findByIdAndUserId(10L, user.getId())).thenReturn(Optional.of(existing));
        when(accountService.findOwnedOrThrow(user, 1L)).thenReturn(account);
        when(categoryService.findAvailableOrThrow(user, 2L)).thenReturn(incomeCategory);
        when(transactionRepository.save(any(Transaction.class))).thenAnswer(inv -> inv.getArgument(0));

        CreateTransactionRequest request = new CreateTransactionRequest();
        request.setAccountId(1L);
        request.setCategoryId(2L);
        request.setTransactionType(CategoryType.INCOME);
        request.setAmount(BigDecimal.valueOf(200));
        request.setTransactionDate(LocalDate.now());

        transactionService.update(user, 10L, request);

        // Reverse the EXPENSE 200 (800 -> 1000), then apply as INCOME (1000 -> 1200) -
        // the sign must flip correctly, not just the magnitude.
        assertThat(account.getBalance()).isEqualByComparingTo(BigDecimal.valueOf(1200));
    }

    @Test
    void updateValidationFailureLeavesOldBalanceUntouched() {
        Transaction existing = new Transaction(user, account, expenseCategory, CategoryType.EXPENSE,
                BigDecimal.valueOf(250), "desc", LocalDate.now());
        account.setBalance(BigDecimal.valueOf(750));

        when(transactionRepository.findByIdAndUserId(10L, user.getId())).thenReturn(Optional.of(existing));
        when(accountService.findOwnedOrThrow(user, 1L)).thenReturn(account);
        when(categoryService.findAvailableOrThrow(user, 2L)).thenReturn(incomeCategory); // mismatched type

        CreateTransactionRequest request = new CreateTransactionRequest();
        request.setAccountId(1L);
        request.setCategoryId(2L);
        request.setTransactionType(CategoryType.EXPENSE); // mismatches incomeCategory
        request.setAmount(BigDecimal.valueOf(400));
        request.setTransactionDate(LocalDate.now());

        assertThatThrownBy(() -> transactionService.update(user, 10L, request))
                .isInstanceOf(InvalidTransactionException.class);

        // The old balance was never reversed, because validation is checked
        // before any balance mutation happens.
        assertThat(account.getBalance()).isEqualByComparingTo(BigDecimal.valueOf(750));
    }

    @Test
    void updateThrowsWhenTransactionNotFoundOrNotOwned() {
        when(transactionRepository.findByIdAndUserId(99L, user.getId())).thenReturn(Optional.empty());

        assertThatThrownBy(() -> transactionService.update(user, 99L, expenseRequest(BigDecimal.valueOf(100))))
                .isInstanceOf(ResourceNotFoundException.class);
    }

    // --- delete() ---

    @Test
    void deleteReversesBalanceEffect() {
        Transaction existing = new Transaction(user, account, expenseCategory, CategoryType.EXPENSE,
                BigDecimal.valueOf(300), "desc", LocalDate.now());
        account.setBalance(BigDecimal.valueOf(700));

        when(transactionRepository.findByIdAndUserId(10L, user.getId())).thenReturn(Optional.of(existing));

        transactionService.delete(user, 10L);

        assertThat(account.getBalance()).isEqualByComparingTo(BigDecimal.valueOf(1000));
        verify(transactionRepository).delete(existing);
    }

    @Test
    void deleteThrowsWhenTransactionNotFoundOrNotOwned() {
        when(transactionRepository.findByIdAndUserId(99L, user.getId())).thenReturn(Optional.empty());

        assertThatThrownBy(() -> transactionService.delete(user, 99L))
                .isInstanceOf(ResourceNotFoundException.class);
    }

    private CreateTransactionRequest expenseRequest(BigDecimal amount) {
        CreateTransactionRequest request = new CreateTransactionRequest();
        request.setAccountId(1L);
        request.setCategoryId(1L);
        request.setTransactionType(CategoryType.EXPENSE);
        request.setAmount(amount);
        request.setTransactionDate(LocalDate.now());
        return request;
    }
}
