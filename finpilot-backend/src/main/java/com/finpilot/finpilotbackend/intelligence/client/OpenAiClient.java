package com.finpilot.finpilotbackend.intelligence.client;

import com.finpilot.finpilotbackend.intelligence.exception.AiServiceException;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

import java.util.List;
import java.util.Map;

// Deliberately thin - one method, one job: send a system+user prompt to
// OpenAI, return the text back. Nothing above this layer (NarrativeService)
// ever sees OpenAI's raw JSON shape, so swapping providers later (Anthropic,
// a local model, etc.) means rewriting this one class, not touching
// business logic.
@Component
public class OpenAiClient {

    private final RestClient restClient;
    private final String apiKey;
    private final String model;
    private final int maxTokens;

    public OpenAiClient(
            @Value("${app.ai.openai.api-key:}") String apiKey,
            @Value("${app.ai.openai.model}") String model,
            @Value("${app.ai.openai.max-tokens}") int maxTokens
    ) {
        this.apiKey = apiKey;
        this.model = model;
        this.maxTokens = maxTokens;
        this.restClient = RestClient.builder()
                .baseUrl("https://api.openai.com/v1")
                .build();
    }

    public boolean isConfigured() {
        return apiKey != null && !apiKey.isBlank();
    }

    @SuppressWarnings("unchecked")
    public String chat(String systemPrompt, String userPrompt) {
        Map<String, Object> requestBody = Map.of(
                "model", model,
                "messages", List.of(
                        Map.of("role", "system", "content", systemPrompt),
                        Map.of("role", "user", "content", userPrompt)
                ),
                "max_tokens", maxTokens,
                // Low temperature on purpose - this narrates real financial
                // numbers, not creative writing. Keep it close to deterministic.
                "temperature", 0.3
        );

        try {
            Map<String, Object> response = restClient.post()
                    .uri("/chat/completions")
                    .header("Authorization", "Bearer " + apiKey)
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(requestBody)
                    .retrieve()
                    .body(Map.class);

            List<Map<String, Object>> choices = (List<Map<String, Object>>) response.get("choices");
            Map<String, Object> message = (Map<String, Object>) choices.get(0).get("message");
            return ((String) message.get("content")).trim();
        } catch (RestClientException | ClassCastException | NullPointerException | IndexOutOfBoundsException e) {
            // Any failure mode here (network error, OpenAI outage, unexpected
            // response shape, rate limit) collapses to one clear exception -
            // the caller shouldn't need to know which of these happened.
            throw new AiServiceException("The AI narration service is temporarily unavailable", e);
        }
    }
}
