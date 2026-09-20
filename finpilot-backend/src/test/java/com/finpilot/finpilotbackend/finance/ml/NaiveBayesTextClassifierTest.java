package com.finpilot.finpilotbackend.finance.ml;

import org.junit.jupiter.api.Test;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;

// Tests the classifier in complete isolation from Spring, the database, or
// any FinPilot-specific concept - it's trained here with plain, made-up
// text/label pairs, the same way any general-purpose text classifier would
// be tested. This is deliberate: it proves the ALGORITHM works, independent
// of anything finance-specific.
class NaiveBayesTextClassifierTest {

    @Test
    void predictsCorrectLabelForClearlySeparableCategories() {
        NaiveBayesTextClassifier classifier = new NaiveBayesTextClassifier();
        classifier.train("swiggy food order", "Food");
        classifier.train("zomato dinner delivery", "Food");
        classifier.train("restaurant lunch bill", "Food");
        classifier.train("uber ride to office", "Transport");
        classifier.train("ola cab fare", "Transport");
        classifier.train("petrol station fill up", "Transport");

        Optional<NaiveBayesTextClassifier.Prediction> prediction = classifier.predict("swiggy dinner order");

        assertThat(prediction).isPresent();
        assertThat(prediction.get().label()).isEqualTo("Food");
        assertThat(prediction.get().confidence()).isGreaterThan(0.5);
    }

    @Test
    void confidenceIsHigherForUnambiguousTextThanAmbiguousText() {
        NaiveBayesTextClassifier classifier = new NaiveBayesTextClassifier();
        classifier.train("swiggy food order", "Food");
        classifier.train("zomato dinner delivery", "Food");
        classifier.train("restaurant lunch bill", "Food");
        classifier.train("uber ride to office", "Transport");
        classifier.train("ola cab fare", "Transport");
        classifier.train("petrol station fill up", "Transport");

        // "swiggy" is a strong, unambiguous signal seen only with Food.
        double clearConfidence = classifier.predict("swiggy order").get().confidence();
        // A word never seen in training has no signal either way - the
        // classifier still has to pick something, but should be far less sure.
        double ambiguousConfidence = classifier.predict("miscellaneous purchase").get().confidence();

        assertThat(clearConfidence).isGreaterThan(ambiguousConfidence);
    }

    @Test
    void returnsEmptyWhenFewerThanTwoLabelsHaveBeenTrained() {
        NaiveBayesTextClassifier classifier = new NaiveBayesTextClassifier();
        classifier.train("swiggy food order", "Food");
        classifier.train("zomato dinner delivery", "Food");
        // Only one label trained - nothing to discriminate between yet.

        Optional<NaiveBayesTextClassifier.Prediction> prediction = classifier.predict("swiggy order");

        assertThat(prediction).isEmpty();
    }

    @Test
    void returnsEmptyForBlankInput() {
        NaiveBayesTextClassifier classifier = new NaiveBayesTextClassifier();
        classifier.train("swiggy food order", "Food");
        classifier.train("uber ride", "Transport");

        assertThat(classifier.predict("")).isEmpty();
        assertThat(classifier.predict("   ")).isEmpty();
    }

    @Test
    void unseenWordsDoNotCrashPrediction() {
        // Laplace smoothing must handle a word that appeared in NEITHER
        // label's training data without throwing or zeroing out silently.
        NaiveBayesTextClassifier classifier = new NaiveBayesTextClassifier();
        classifier.train("swiggy food order", "Food");
        classifier.train("uber ride", "Transport");

        Optional<NaiveBayesTextClassifier.Prediction> prediction = classifier.predict("xyzzyplugh nonsense token");

        assertThat(prediction).isPresent(); // doesn't crash, still returns a best guess
        assertThat(prediction.get().confidence()).isBetween(0.0, 1.0);
    }

    @Test
    void trainingDocumentCountTracksTotalExamplesSeen() {
        NaiveBayesTextClassifier classifier = new NaiveBayesTextClassifier();
        classifier.train("a", "X");
        classifier.train("b", "Y");
        classifier.train("c", "X");

        assertThat(classifier.trainingDocumentCount()).isEqualTo(3);
    }
}
