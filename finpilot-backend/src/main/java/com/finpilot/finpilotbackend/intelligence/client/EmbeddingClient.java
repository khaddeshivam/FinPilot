package com.finpilot.finpilotbackend.intelligence.client;

import com.finpilot.finpilotbackend.intelligence.exception.AiServiceException;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

// A second thin client alongside OpenAiClient, for a different OpenAI
// endpoint (embeddings, not chat). Kept separate rather than merged into
// OpenAiClient - the two APIs have unrelated request/response shapes, and
// a class with two unrelated jobs is harder to reason about than two
// classes with one job each.
//
// embedBatch sends every text in ONE HTTP request rather than one request
// per text - OpenAI's embeddings endpoint accepts an array input natively,
// so embedding 50 transactions costs 1 API call, not 50. This matters both
// for latency (one round trip, not fifty) and for cost predictability.
@Component
public class EmbeddingClient {

    private final RestClient restClient;
    private final String apiKey;
    private final String model;

    public EmbeddingClient(
            @Value("${app.ai.openai.api-key:}") String apiKey,
            @Value("${app.ai.openai.embedding-model}") String model
    ) {
        this.apiKey = apiKey;
        this.model = model;
        this.restClient = RestClient.builder()
                .baseUrl("https://api.openai.com/v1")
                .build();
    }

    public boolean isConfigured() {
        return apiKey != null && !apiKey.isBlank();
    }

    @SuppressWarnings("unchecked")
    public List<float[]> embedBatch(List<String> texts) {
        if (texts.isEmpty()) {
            return List.of();
        }

        Map<String, Object> requestBody = Map.of(
                "model", model,
                "input", texts
        );

        try {
            Map<String, Object> response = restClient.post()
                    .uri("/embeddings")
                    .header("Authorization", "Bearer " + apiKey)
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(requestBody)
                    .retrieve()
                    .body(Map.class);

            List<Map<String, Object>> data = (List<Map<String, Object>>) response.get("data");
            List<float[]> vectors = new ArrayList<>();
            for (Map<String, Object> item : data) {
                List<Double> raw = (List<Double>) item.get("embedding");
                float[] vector = new float[raw.size()];
                for (int i = 0; i < raw.size(); i++) {
                    vector[i] = raw.get(i).floatValue();
                }
                vectors.add(vector);
            }
            return vectors;
        } catch (RestClientException | ClassCastException | NullPointerException e) {
            throw new AiServiceException("The embedding service is temporarily unavailable", e);
        }
    }
}
