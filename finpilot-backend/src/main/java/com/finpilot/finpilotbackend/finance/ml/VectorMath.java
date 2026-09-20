package com.finpilot.finpilotbackend.finance.ml;

// Cosine similarity between two embedding vectors - the standard way to
// measure "how semantically similar is this transaction to this question"
// once both are represented as vectors. Written by hand rather than pulled
// from a vector-math library, for the same reason NaiveBayesTextClassifier
// is hand-rolled: every step should be visible and explainable, not a
// black box import.
//
// Returns a value from -1 (opposite meaning) to 1 (identical meaning);
// in practice, embeddings from the same model land mostly in the 0-1 range
// for related text.
public final class VectorMath {

    private VectorMath() {
    }

    public static double cosineSimilarity(float[] a, float[] b) {
        if (a.length != b.length) {
            throw new IllegalArgumentException("Vectors must be the same length to compare");
        }

        double dotProduct = 0.0;
        double normA = 0.0;
        double normB = 0.0;

        for (int i = 0; i < a.length; i++) {
            dotProduct += a[i] * b[i];
            normA += a[i] * a[i];
            normB += b[i] * b[i];
        }

        if (normA == 0.0 || normB == 0.0) {
            return 0.0; // a zero vector has no direction to compare
        }

        return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
    }
}
