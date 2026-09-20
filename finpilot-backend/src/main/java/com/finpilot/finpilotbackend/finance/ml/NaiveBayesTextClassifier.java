package com.finpilot.finpilotbackend.finance.ml;

import java.util.*;
import java.util.regex.Pattern;

// A real, from-scratch multinomial Naive Bayes text classifier - not a call
// to an external AI service. This is deliberately implemented by hand rather
// than pulled in as a library, so every step (tokenization, smoothing,
// log-probability scoring) is visible and explainable, not a black box.
//
// How it works: given labeled training text ("swiggy order" -> "Food"),
// it learns which WORDS tend to co-occur with which LABELS, then scores a
// new piece of text against every known label using Bayes' theorem:
//   P(label | words) is proportional to P(label) * product of P(word | label)
//
// Log-probabilities are used throughout instead of raw probabilities, since
// multiplying many small probabilities together underflows to zero in
// floating point - summing their logs avoids that entirely.
//
// Laplace (add-one) smoothing handles words never seen during training for
// a given label - without it, any single unseen word would zero out that
// label's entire probability, which is too fragile for real transaction
// descriptions that constantly contain new merchant names.
public class NaiveBayesTextClassifier {

    private static final Pattern TOKEN_PATTERN = Pattern.compile("[a-z0-9]+");
    private static final int MIN_TOKEN_LENGTH = 2;

    private final Map<String, Map<String, Integer>> wordCountsByLabel = new HashMap<>();
    private final Map<String, Integer> totalWordsByLabel = new HashMap<>();
    private final Map<String, Integer> documentCountByLabel = new HashMap<>();
    private final Set<String> vocabulary = new HashSet<>();
    private int totalDocuments = 0;

    public void train(String text, String label) {
        List<String> tokens = tokenize(text);
        if (tokens.isEmpty()) {
            return;
        }

        Map<String, Integer> counts = wordCountsByLabel.computeIfAbsent(label, k -> new HashMap<>());
        for (String token : tokens) {
            counts.merge(token, 1, Integer::sum);
            vocabulary.add(token);
        }

        totalWordsByLabel.merge(label, tokens.size(), Integer::sum);
        documentCountByLabel.merge(label, 1, Integer::sum);
        totalDocuments++;
    }

    public Optional<Prediction> predict(String text) {
        if (totalDocuments == 0 || documentCountByLabel.size() < 2) {
            // Not enough training data to make a meaningful prediction -
            // honest "I don't know" rather than a guess with no basis.
            return Optional.empty();
        }

        List<String> tokens = tokenize(text);
        if (tokens.isEmpty()) {
            return Optional.empty();
        }

        int vocabularySize = vocabulary.size();
        Map<String, Double> scoreByLabel = new HashMap<>();

        for (String label : documentCountByLabel.keySet()) {
            double logProbLabel = Math.log((double) documentCountByLabel.get(label) / totalDocuments);
            double score = logProbLabel;

            Map<String, Integer> counts = wordCountsByLabel.getOrDefault(label, Map.of());
            int totalWords = totalWordsByLabel.getOrDefault(label, 0);

            for (String token : tokens) {
                int wordCount = counts.getOrDefault(token, 0);
                // Laplace smoothing: +1 to every count, +vocabularySize to
                // the denominator, so an unseen word gets a small non-zero
                // probability instead of killing the whole score.
                double probWordGivenLabel = (wordCount + 1.0) / (totalWords + vocabularySize);
                score += Math.log(probWordGivenLabel);
            }

            scoreByLabel.put(label, score);
        }

        String bestLabel = Collections.max(scoreByLabel.entrySet(), Map.Entry.comparingByValue()).getKey();
        double confidence = softmaxConfidence(scoreByLabel, bestLabel);

        return Optional.of(new Prediction(bestLabel, confidence));
    }

    // Converts raw log-scores into a 0-1 confidence value via softmax -
    // subtracting the max score first keeps exp() from overflowing on
    // large negative log-probabilities.
    private double softmaxConfidence(Map<String, Double> scoreByLabel, String bestLabel) {
        double maxScore = Collections.max(scoreByLabel.values());
        double sumExp = 0.0;
        double bestExp = 0.0;

        for (Map.Entry<String, Double> entry : scoreByLabel.entrySet()) {
            double exp = Math.exp(entry.getValue() - maxScore);
            sumExp += exp;
            if (entry.getKey().equals(bestLabel)) {
                bestExp = exp;
            }
        }

        return bestExp / sumExp;
    }

    private List<String> tokenize(String text) {
        List<String> tokens = new ArrayList<>();
        if (text == null) {
            return tokens;
        }
        var matcher = TOKEN_PATTERN.matcher(text.toLowerCase());
        while (matcher.find()) {
            String token = matcher.group();
            if (token.length() >= MIN_TOKEN_LENGTH) {
                tokens.add(token);
            }
        }
        return tokens;
    }

    public int trainingDocumentCount() {
        return totalDocuments;
    }

    public record Prediction(String label, double confidence) {
    }
}
