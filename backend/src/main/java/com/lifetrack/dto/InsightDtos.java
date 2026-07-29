package com.lifetrack.dto;

import java.time.LocalDate;
import java.util.List;

/** Contracts returned by the deterministic Spring insight engine. */
public class InsightDtos {

    /** Severity buckets the frontend can colour-code (e.g. green / amber / grey). */
    public static final class Severity {
        public static final String POSITIVE = "positive";
        public static final String WARNING = "warning";
        public static final String INFO = "info";

        private Severity() {
        }
    }

    /**
     * A single rule-based observation.
     *
     * @param category one of SLEEP, SPENDING, HABITS, HYDRATION, MOOD, GENERAL
     * @param severity see {@link Severity}
     * @param title    short headline
     * @param message  human-readable explanation / recommendation
     * @param metric   the underlying value that triggered the rule (nullable)
     */
    public record Insight(
            String category,
            String severity,
            String title,
            String message,
            Double metric
    ) {}

    /** Insight collection and the inclusive date window used to produce it. */
    public record InsightsResponse(
            LocalDate from,
            LocalDate to,
            List<Insight> insights
    ) {}
}
