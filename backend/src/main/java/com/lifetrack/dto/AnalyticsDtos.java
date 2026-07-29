package com.lifetrack.dto;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

/** Read-only projections produced by the backend analytics engine. */
public class AnalyticsDtos {

    /** Sleep duration observed on a particular date. */
    public record SleepPoint(LocalDate date, Double hours) {}

    /** Backend-computed total expense amount for a particular date. */
    public record DailyExpensePoint(LocalDate date, double totalAmount) {}

    /** User analytics for the exact date range requested by the client. */
    public record UserAnalyticsResponse(
            List<SleepPoint> sleepPoints,
            List<SleepPoint> weeklySleep,
            List<DailyExpensePoint> dailyExpenses,
            Map<String, Double> expensesByCategory,
            double totalExpenses,
            double budgetUsagePct,
            double monthlyBudget,
            Map<String, Long> moodCounts,
            long journalEntryCount
    ) {}

    /** System-wide aggregate counts visible only to administrators. */
    public record AdminStatsResponse(
            long totalUsers,
            long totalDailyLogs,
            long totalExpenses,
            long totalJournalEntries,
            Map<String, Double> aggregatedExpensesByCategory,
            Map<String, Long> aggregatedMoodCounts
    ) {}
}
