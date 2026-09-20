package com.finpilot.finpilotbackend.finance.ml;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.assertj.core.api.Assertions.within;

class VectorMathTest {

    @Test
    void identicalVectorsHaveSimilarityOfOne() {
        float[] a = {1f, 2f, 3f};
        float[] b = {1f, 2f, 3f};

        assertThat(VectorMath.cosineSimilarity(a, b)).isCloseTo(1.0, within(0.0001));
    }

    @Test
    void orthogonalVectorsHaveSimilarityOfZero() {
        float[] a = {1f, 0f};
        float[] b = {0f, 1f};

        assertThat(VectorMath.cosineSimilarity(a, b)).isCloseTo(0.0, within(0.0001));
    }

    @Test
    void oppositeVectorsHaveSimilarityOfNegativeOne() {
        float[] a = {1f, 0f};
        float[] b = {-1f, 0f};

        assertThat(VectorMath.cosineSimilarity(a, b)).isCloseTo(-1.0, within(0.0001));
    }

    @Test
    void magnitudeDoesNotAffectSimilarity() {
        // A vector scaled 100x should still point in the same direction -
        // cosine similarity measures angle, not length, so this must stay 1.
        float[] a = {1f, 2f, 3f};
        float[] scaled = {100f, 200f, 300f};

        assertThat(VectorMath.cosineSimilarity(a, scaled)).isCloseTo(1.0, within(0.0001));
    }

    @Test
    void zeroVectorReturnsZeroRatherThanDividingByZero() {
        float[] zero = {0f, 0f, 0f};
        float[] normal = {1f, 2f, 3f};

        assertThat(VectorMath.cosineSimilarity(zero, normal)).isEqualTo(0.0);
    }

    @Test
    void mismatchedLengthsThrow() {
        float[] a = {1f, 2f};
        float[] b = {1f, 2f, 3f};

        assertThatThrownBy(() -> VectorMath.cosineSimilarity(a, b))
                .isInstanceOf(IllegalArgumentException.class);
    }
}
