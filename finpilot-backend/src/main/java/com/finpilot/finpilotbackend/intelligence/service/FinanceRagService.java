package com.finpilot.finpilotbackend.intelligence.service;

import com.finpilot.finpilotbackend.finance.entity.Transaction;
import com.finpilot.finpilotbackend.finance.ml.VectorMath;
import com.finpilot.finpilotbackend.finance.repository.TransactionRepository;
import com.finpilot.finpilotbackend.identity.entity.User;
import com.finpilot.finpilotbackend.intelligence.client.EmbeddingClient;
import com.finpilot.finpilotbackend.intelligence.client.OpenAiClient;
import com.finpilot.finpilotbackend.intelligence.dto.AskDtos.AskResponse;
import com.finpilot.finpilotbackend.intelligence.dto.AskDtos.CitedTransaction;
import com.finpilot.finpilotbackend.intelligence.dto.HealthScoreResponse;
import com.finpilot.finpilotbackend.intelligence.exception.AiNotConfiguredException;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.stream.Collectors;

// The actual RAG pipeline: Retrieval (embedding similarity search over the
// user's own transactions) followed by Augmented Generation (the retrieved
// transactions + current insights get stuffed into the prompt, then an LLM
// answers grounded in exactly that context). This is a meaningfully
// different capability from NarrativeService - narration formats numbers
// FinPilot already computed; this retrieves specific historical records
// relevant to an arbitrary, unstructured question and cites them back.
//
// Retrieval strategy, stated plainly: embed the user's N most recent
// transactions (capped, see MAX_TRANSACTIONS_TO_SEARCH) and the question in
// exactly 2 API calls total (one batched call for all transactions, one for
// the question) - not one call per transaction. Rank by cosine similarity,
// keep the top K. This is a from-scratch, in-memory vector search - no
// vector database - which is the right scope for a personal finance app's
// data volume (hundreds of transactions, not millions). A real production
// system serving many users at larger scale would move this to a proper
// vector store (pgvector, Pinecone) rather than recomputing embeddings on
// every question; that tradeoff is deliberate here, not an oversight.
@Service
public class FinanceRagService {

    private static final int MAX_TRANSACTIONS_TO_SEARCH = 150;
    private static final int TOP_K_RESULTS = 6;

    private static final String SYSTEM_PROMPT = """
            You are a financial assistant for a personal finance app called FinPilot.
            You will be given a user's question along with a set of their own transactions and \
            financial summary data that were retrieved as relevant context.

            Answer using ONLY the information provided in the context below. Never invent a \
            transaction, amount, date, or figure that isn't explicitly present in the context. \
            If the context doesn't contain enough information to answer confidently, say so \
            plainly rather than guessing. Keep answers concise - a few sentences, not an essay. \
            Write in second person ("you"), calm and factual.
            """;

    private final TransactionRepository transactionRepository;
    private final EmbeddingClient embeddingClient;
    private final OpenAiClient openAiClient;
    private final InsightService insightService;
    private final HealthScoreService healthScoreService;

    public FinanceRagService(
            TransactionRepository transactionRepository,
            EmbeddingClient embeddingClient,
            OpenAiClient openAiClient,
            InsightService insightService,
            HealthScoreService healthScoreService
    ) {
        this.transactionRepository = transactionRepository;
        this.embeddingClient = embeddingClient;
        this.openAiClient = openAiClient;
        this.insightService = insightService;
        this.healthScoreService = healthScoreService;
    }

    public AskResponse answer(User user, String question) {
        if (!embeddingClient.isConfigured() || !openAiClient.isConfigured()) {
            throw new AiNotConfiguredException(
                    "Ask FinPilot isn't configured on this server. Set the OPENAI_API_KEY environment variable to enable it."
            );
        }

        List<Transaction> candidates = transactionRepository.findByUserIdOrderByTransactionDateDesc(user.getId())
                .stream()
                .limit(MAX_TRANSACTIONS_TO_SEARCH)
                .toList();

        List<Transaction> retrieved = retrieveRelevant(candidates, question);

        String context = buildContext(user, retrieved);
        String userPrompt = "Context:\n" + context + "\n\nQuestion: " + question;

        String answer = openAiClient.chat(SYSTEM_PROMPT, userPrompt);

        List<CitedTransaction> citations = retrieved.stream()
                .map(t -> new CitedTransaction(t.getId(), t.getDescription(), t.getAmount(), t.getCategory().getName(), t.getTransactionDate()))
                .toList();

        return new AskResponse(answer, citations);
    }

    // Step 1 of RAG: Retrieval. Embeds every candidate transaction in one
    // batch call, embeds the question in a second call, ranks by cosine
    // similarity, returns the top K.
    private List<Transaction> retrieveRelevant(List<Transaction> candidates, String question) {
        if (candidates.isEmpty()) {
            return List.of();
        }

        List<String> transactionTexts = candidates.stream()
                .map(this::toEmbeddableText)
                .collect(Collectors.toList());

        List<float[]> transactionVectors = embeddingClient.embedBatch(transactionTexts);
        float[] questionVector = embeddingClient.embedBatch(List.of(question)).get(0);

        List<ScoredTransaction> scored = new ArrayList<>();
        for (int i = 0; i < candidates.size(); i++) {
            double similarity = VectorMath.cosineSimilarity(transactionVectors.get(i), questionVector);
            scored.add(new ScoredTransaction(candidates.get(i), similarity));
        }

        return scored.stream()
                .sorted(Comparator.comparingDouble(ScoredTransaction::similarity).reversed())
                .limit(TOP_K_RESULTS)
                .map(ScoredTransaction::transaction)
                .toList();
    }

    // How a transaction is represented as text before embedding - includes
    // the fields someone might actually ask about (category, amount, date),
    // not just the free-text description alone.
    private String toEmbeddableText(Transaction transaction) {
        return String.format(
                "%s: %s, %s %s, on %s",
                transaction.getTransactionType(),
                transaction.getDescription() != null ? transaction.getDescription() : transaction.getCategory().getName(),
                transaction.getCategory().getName(),
                transaction.getAmount(),
                transaction.getTransactionDate()
        );
    }

    // Step 2 of RAG: Augmented Generation. Combines the retrieved
    // transactions with the always-relevant structured summary (health
    // score, current insights) so the model has both specific historical
    // detail AND the current month's overall picture to draw from.
    private String buildContext(User user, List<Transaction> retrieved) {
        StringBuilder sb = new StringBuilder();

        LocalDate now = LocalDate.now();
        HealthScoreResponse healthScore = healthScoreService.calculate(user, now);
        sb.append("Current health score: ").append(healthScore.getScore()).append("/100 (")
                .append(healthScore.getLabel()).append(")\n");
        sb.append("Current savings rate: ").append(healthScore.getSavingsRate()).append("%\n\n");

        sb.append("This month's observations:\n");
        insightService.generateInsights(user, now).forEach(insight ->
                sb.append("- ").append(insight.getMessage()).append("\n")
        );

        sb.append("\nRelevant transactions from your history:\n");
        if (retrieved.isEmpty()) {
            sb.append("(none found)\n");
        } else {
            for (Transaction t : retrieved) {
                sb.append("- ").append(toEmbeddableText(t)).append("\n");
            }
        }

        return sb.toString();
    }

    private record ScoredTransaction(Transaction transaction, double similarity) {
    }
}
