package com.finpilot.finpilotbackend.intelligence.service;

import com.finpilot.finpilotbackend.finance.entity.Account;
import com.finpilot.finpilotbackend.finance.entity.AccountType;
import com.finpilot.finpilotbackend.finance.entity.Category;
import com.finpilot.finpilotbackend.finance.entity.CategoryType;
import com.finpilot.finpilotbackend.finance.entity.Transaction;
import com.finpilot.finpilotbackend.finance.repository.TransactionRepository;
import com.finpilot.finpilotbackend.identity.entity.User;
import com.finpilot.finpilotbackend.intelligence.client.EmbeddingClient;
import com.finpilot.finpilotbackend.intelligence.client.OpenAiClient;
import com.finpilot.finpilotbackend.intelligence.dto.AskDtos.AskResponse;
import com.finpilot.finpilotbackend.intelligence.dto.HealthScoreResponse;
import com.finpilot.finpilotbackend.intelligence.dto.HealthScoreResponse.HealthLabel;
import com.finpilot.finpilotbackend.intelligence.exception.AiNotConfiguredException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

// Note: Transaction.id is DB-generated with no public setter, so test
// transactions built via `new Transaction(...)` always have a null id -
// assertions here compare by description text (which the test DOES
// control) rather than id, to actually verify retrieval ordering.
@ExtendWith(MockitoExtension.class)
class FinanceRagServiceTest {

    @Mock
    private TransactionRepository transactionRepository;
    @Mock
    private EmbeddingClient embeddingClient;
    @Mock
    private OpenAiClient openAiClient;
    @Mock
    private InsightService insightService;
    @Mock
    private HealthScoreService healthScoreService;

    private FinanceRagService ragService;
    private User user;

    @BeforeEach
    void setUp() {
        ragService = new FinanceRagService(transactionRepository, embeddingClient, openAiClient, insightService, healthScoreService);
        user = new User("user@example.com", "hashed", "Test User");
    }

    @Test
    void throwsWhenAiIsNotConfigured() {
        when(embeddingClient.isConfigured()).thenReturn(false);

        assertThatThrownBy(() -> ragService.answer(user, "how much did I spend on food?"))
                .isInstanceOf(AiNotConfiguredException.class);
    }

    @Test
    void retrievesAndRanksTransactionsByEmbeddingSimilarity() {
        when(embeddingClient.isConfigured()).thenReturn(true);
        when(openAiClient.isConfigured()).thenReturn(true);

        Transaction txA = transaction("random unrelated purchase");
        Transaction txB = transaction("swiggy dinner order");
        Transaction txC = transaction("zomato lunch order");
        when(transactionRepository.findByUserIdOrderByTransactionDateDesc(user.getId()))
                .thenReturn(List.of(txA, txB, txC));

        // Question vector [0,1] matches txB's vector exactly (similarity 1.0),
        // is close to txC (similarity ~0.11), and orthogonal to txA (0.0) -
        // so the expected retrieval order is B, C, A.
        List<float[]> transactionVectors = List.of(
                new float[]{1f, 0f},    // txA - orthogonal to question
                new float[]{0f, 1f},    // txB - identical to question
                new float[]{0.9f, 0.1f} // txC - close to question
        );
        float[] questionVector = {0f, 1f};

        when(embeddingClient.embedBatch(any())).thenReturn(transactionVectors, List.of(questionVector));
        when(openAiClient.chat(any(), any())).thenReturn("You spent on food-related purchases recently.");
        when(insightService.generateInsights(any(), any())).thenReturn(List.of());
        when(healthScoreService.calculate(any(), any())).thenReturn(
                new HealthScoreResponse(75, HealthLabel.GOOD, BigDecimal.valueOf(20), BigDecimal.valueOf(80))
        );

        AskResponse response = ragService.answer(user, "how much did I spend on food?");

        assertThat(response.getAnswer()).isEqualTo("You spent on food-related purchases recently.");
        assertThat(response.getCitedTransactions()).hasSize(3);
        // Most similar transaction (txB) must be cited first, least similar last.
        assertThat(response.getCitedTransactions().get(0).getDescription()).isEqualTo("swiggy dinner order");
        assertThat(response.getCitedTransactions().get(1).getDescription()).isEqualTo("zomato lunch order");
        assertThat(response.getCitedTransactions().get(2).getDescription()).isEqualTo("random unrelated purchase");
    }

    private Transaction transaction(String description) {
        Category category = new Category(user, "Food", CategoryType.EXPENSE);
        Account account = new Account(user, "Test", AccountType.BANK, BigDecimal.ZERO, "INR");
        return new Transaction(user, account, category, CategoryType.EXPENSE, BigDecimal.TEN, description, LocalDate.now());
    }
}
