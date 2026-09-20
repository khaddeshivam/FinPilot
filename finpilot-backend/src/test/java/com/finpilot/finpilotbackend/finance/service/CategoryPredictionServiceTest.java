package com.finpilot.finpilotbackend.finance.service;

import com.finpilot.finpilotbackend.finance.dto.CategoryPredictionResponse;
import com.finpilot.finpilotbackend.finance.dto.CategoryResponse;
import com.finpilot.finpilotbackend.finance.entity.Account;
import com.finpilot.finpilotbackend.finance.entity.AccountType;
import com.finpilot.finpilotbackend.finance.entity.Category;
import com.finpilot.finpilotbackend.finance.entity.CategoryType;
import com.finpilot.finpilotbackend.finance.entity.Transaction;
import com.finpilot.finpilotbackend.finance.repository.TransactionRepository;
import com.finpilot.finpilotbackend.identity.entity.User;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class CategoryPredictionServiceTest {

    @Mock
    private TransactionRepository transactionRepository;
    @Mock
    private CategoryService categoryService;

    private CategoryPredictionService predictionService;
    private User user;
    private Category foodCategory;
    private Category transportCategory;

    @BeforeEach
    void setUp() {
        predictionService = new CategoryPredictionService(transactionRepository, categoryService);
        user = new User("user@example.com", "hashed", "Test User");
        foodCategory = new Category(user, "Food", CategoryType.EXPENSE);
        transportCategory = new Category(user, "Transport", CategoryType.EXPENSE);
    }

    @Test
    void returnsEmptyWhenUserHasFewerThanMinimumHistoryRequired() {
        // Only 2 transactions - below the minimum needed to train on.
        when(transactionRepository.findByUserIdOrderByTransactionDateDesc(user.getId()))
                .thenReturn(List.of(
                        transaction("swiggy order", foodCategory),
                        transaction("uber ride", transportCategory)
                ));

        Optional<CategoryPredictionResponse> prediction =
                predictionService.predict(user, "swiggy dinner", CategoryType.EXPENSE);

        assertThat(prediction).isEmpty();
    }

    @Test
    void predictsFromUsersOwnHistoryOnceEnoughDataExists() {
        List<Transaction> history = new ArrayList<>();
        history.add(transaction("swiggy order", foodCategory));
        history.add(transaction("zomato delivery", foodCategory));
        history.add(transaction("restaurant bill", foodCategory));
        history.add(transaction("uber ride", transportCategory));
        history.add(transaction("ola cab", transportCategory));
        history.add(transaction("petrol fillup", transportCategory));

        when(transactionRepository.findByUserIdOrderByTransactionDateDesc(user.getId())).thenReturn(history);
        when(categoryService.listForUser(user)).thenReturn(List.of(
                mockCategoryResponse(1L, "Food", CategoryType.EXPENSE),
                mockCategoryResponse(2L, "Transport", CategoryType.EXPENSE)
        ));

        Optional<CategoryPredictionResponse> prediction =
                predictionService.predict(user, "swiggy lunch order", CategoryType.EXPENSE);

        assertThat(prediction).isPresent();
        assertThat(prediction.get().getCategoryName()).isEqualTo("Food");
        assertThat(prediction.get().getCategoryId()).isEqualTo(1L);
    }

    @Test
    void ignoresTransactionsOfTheWrongType() {
        // These are all INCOME transactions - predicting for EXPENSE should
        // find no usable history, even though the repository call returns rows.
        List<Transaction> history = new ArrayList<>();
        Category salary = new Category(user, "Salary", CategoryType.INCOME);
        for (int i = 0; i < 6; i++) {
            history.add(transaction("monthly salary", salary, CategoryType.INCOME));
        }

        when(transactionRepository.findByUserIdOrderByTransactionDateDesc(user.getId())).thenReturn(history);

        Optional<CategoryPredictionResponse> prediction =
                predictionService.predict(user, "swiggy order", CategoryType.EXPENSE);

        assertThat(prediction).isEmpty();
    }

    private Transaction transaction(String description, Category category) {
        return transaction(description, category, CategoryType.EXPENSE);
    }

    private Transaction transaction(String description, Category category, CategoryType type) {
        Account account = new Account(user, "Test", AccountType.BANK, BigDecimal.ZERO, "INR");
        return new Transaction(user, account, category, type, BigDecimal.TEN, description, LocalDate.now());
    }

    private CategoryResponse mockCategoryResponse(Long id, String name, CategoryType type) {
        CategoryResponse response = mock(CategoryResponse.class);
        when(response.getId()).thenReturn(id);
        when(response.getName()).thenReturn(name);
        when(response.getCategoryType()).thenReturn(type);
        return response;
    }
}
