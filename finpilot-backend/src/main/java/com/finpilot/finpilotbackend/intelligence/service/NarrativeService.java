package com.finpilot.finpilotbackend.intelligence.service;

import com.finpilot.finpilotbackend.identity.entity.User;
import com.finpilot.finpilotbackend.intelligence.client.OpenAiClient;
import com.finpilot.finpilotbackend.intelligence.dto.HealthScoreResponse;
import com.finpilot.finpilotbackend.intelligence.dto.InsightResponse;
import com.finpilot.finpilotbackend.intelligence.dto.NarrativeResponse;
import com.finpilot.finpilotbackend.intelligence.exception.AiNotConfiguredException;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.List;

// This is the ONE place in FinPilot that calls an LLM. Deliberately narrow
// scope: the numbers themselves (insights, health score) are still computed
// by InsightService/HealthScoreService exactly as before - fully
// deterministic, fully rule-based, already unit tested. The LLM's only job
// is to turn that structured data into a short written paragraph. It is
// never given the ability to invent figures, because it's only ever shown
// numbers that were already calculated - the prompt explicitly forbids
// adding anything not present in that data.
@Service
public class NarrativeService {

    private static final String SYSTEM_PROMPT = """
            You are a financial summary writer for a personal finance app called FinPilot.
            You will be given a user's financial data for one month: their health score, \
            savings rate, and a list of specific observations already calculated by the app.

            Write a short, plain-language summary (2-3 sentences, no more) of how their month \
            is going. Use only the numbers and facts given to you - never invent, estimate, or \
            round figures that aren't explicitly provided. Do not give financial advice or \
            recommendations beyond what the observations already state. Write in second person \
            ("you"), in a calm, factual tone - not alarmist, not overly congratulatory.
            """;

    private final OpenAiClient openAiClient;
    private final InsightService insightService;
    private final HealthScoreService healthScoreService;

    public NarrativeService(
            OpenAiClient openAiClient,
            InsightService insightService,
            HealthScoreService healthScoreService
    ) {
        this.openAiClient = openAiClient;
        this.insightService = insightService;
        this.healthScoreService = healthScoreService;
    }

    public NarrativeResponse generate(User user, LocalDate anyDateInMonth) {
        if (!openAiClient.isConfigured()) {
            throw new AiNotConfiguredException(
                    "AI narration isn't configured on this server. Set the OPENAI_API_KEY environment variable to enable it."
            );
        }

        List<InsightResponse> insights = insightService.generateInsights(user, anyDateInMonth);
        HealthScoreResponse healthScore = healthScoreService.calculate(user, anyDateInMonth);

        String userPrompt = buildPrompt(insights, healthScore);
        String narrative = openAiClient.chat(SYSTEM_PROMPT, userPrompt);

        return new NarrativeResponse(narrative);
    }

    private String buildPrompt(List<InsightResponse> insights, HealthScoreResponse healthScore) {
        StringBuilder sb = new StringBuilder();
        sb.append("Health score: ").append(healthScore.getScore()).append("/100 (").append(healthScore.getLabel()).append(")\n");
        sb.append("Savings rate: ").append(healthScore.getSavingsRate()).append("%\n");
        if (healthScore.getBudgetAdherence() != null) {
            sb.append("Budget adherence: ").append(healthScore.getBudgetAdherence()).append("%\n");
        }
        sb.append("\nObservations this month:\n");
        for (InsightResponse insight : insights) {
            sb.append("- ").append(insight.getMessage()).append("\n");
        }
        return sb.toString();
    }
}
