package com.lifetrack.dto;

import java.util.List;
import java.util.Map;

/** Contract boundary between the Spring domain layer and Python AI service. */
public class AiContextDtos {

    /**
     * Aggregated, anonymised-of-PII lifestyle context for the AI service.
     *
     * <p>This is the seam between Spring (source of truth for facts/rules) and
     * the Python AI service (free to do RAG/embeddings/whatever it wants).
     * Field names intentionally mirror {@code ai-service/app/schemas.py}'s
     * {@code LifestyleContext} so the Python side can deserialise this
     * response directly instead of re-deriving these numbers itself.
     *
     * <p>Call this server-to-server with the user's JWT forwarded — never let
     * the AI service accept an arbitrary {@code user_key} from the browser.
     */
    public record AiContextResponse(
            int periodDays,
            Double avgSleepHours,
            double minSleepHours,
            double goodSleepHours,
            Double weeklySpend,
            double spendThreshold,
            Map<String, Double> expensesByCategory,
            Double avgWaterMl,
            double minWaterMl,
            Double habitConsistency,
            double habitConsistencyThreshold,
            Map<String, Long> moodCounts,
            List<String> journalExcerpts
    ) {}
}
