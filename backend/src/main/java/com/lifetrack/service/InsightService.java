package com.lifetrack.service;

import com.lifetrack.dto.InsightDtos.Insight;
import com.lifetrack.dto.InsightDtos.InsightsResponse;
import com.lifetrack.dto.InsightDtos.Severity;
import com.lifetrack.entity.DailyLog;
import com.lifetrack.entity.Expense;
import com.lifetrack.entity.JournalEntry;
import com.lifetrack.entity.UserSettings;
import com.lifetrack.repository.DailyLogRepository;
import com.lifetrack.repository.ExpenseRepository;
import com.lifetrack.repository.JournalEntryRepository;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.OptionalDouble;
import java.util.Set;

/**
 * Rule-based insight engine (Phase 4a).
 *
 * <p>All thresholds come from the requesting user's {@link UserSettings} so
 * each user's preferences drive the analysis.  No global InsightProperties
 * constants are used for per-user thresholds; {@code UserSettingsService}
 * supplies the values instead.
 *
 * <p>Spending is treated as <em>period</em> spending; its threshold is derived
 * from the user's monthly budget × period days ÷ 30.
 */
@Service
public class InsightService {

    private static final Set<String> NEGATIVE_MOODS = Set.of("anxious", "tired", "sad", "stressed", "angry");
    private static final Set<String> POSITIVE_MOODS = Set.of("happy", "calm", "grateful", "great", "good");

    private final DailyLogRepository dailyLogRepository;
    private final ExpenseRepository expenseRepository;
    private final JournalEntryRepository journalEntryRepository;
    private final UserSettingsService userSettingsService;

    public InsightService(DailyLogRepository dailyLogRepository,
                          ExpenseRepository expenseRepository,
                          JournalEntryRepository journalEntryRepository,
                          UserSettingsService userSettingsService) {
        this.dailyLogRepository = dailyLogRepository;
        this.expenseRepository = expenseRepository;
        this.journalEntryRepository = journalEntryRepository;
        this.userSettingsService = userSettingsService;
    }

    public InsightsResponse generate(Long userId) {
        UserSettings settings = userSettingsService.getOrCreate(userId);
        int windowDays = settings.getInsightPeriodDays();

        LocalDate today = LocalDate.now();
        LocalDate from = today.minusDays(windowDays - 1L);

        List<DailyLog> logs = dailyLogRepository.findByUserIdAndDateBetweenOrderByDateAsc(userId, from, today);
        List<Expense> expenses = expenseRepository.findByUserIdAndDateBetween(userId, from, today);
        List<JournalEntry> journals = journalEntryRepository.findByUserIdAndDateBetween(userId, from, today);

        // Derive period spending threshold from monthly budget.
        double spendThreshold = settings.getMonthlyBudget() * windowDays / 30.0;

        List<Insight> insights = new ArrayList<>();
        evaluateSleep(logs, settings, insights);
        evaluateSpending(expenses, spendThreshold, windowDays, insights);
        evaluateHabitConsistency(logs, settings, windowDays, insights);
        evaluateHydration(logs, settings, insights);
        evaluateMood(logs, journals, insights);

        if (insights.isEmpty()) {
            insights.add(new Insight(
                    "GENERAL",
                    Severity.INFO,
                    "Not enough data yet",
                    "Keep logging your days, expenses, and journal entries to unlock personalised insights.",
                    null));
        }

        return new InsightsResponse(from, today, insights);
    }

    private void evaluateSleep(List<DailyLog> logs, UserSettings settings, List<Insight> insights) {
        OptionalDouble avg = logs.stream()
                .filter(l -> l.getSleepHours() != null)
                .mapToDouble(DailyLog::getSleepHours)
                .average();
        if (avg.isEmpty()) return;

        double avgSleep = round(avg.getAsDouble());
        double lowThreshold = settings.getLowSleepThreshold();
        double goodTarget = settings.getSleepTargetHours();

        if (avgSleep < lowThreshold) {
            insights.add(new Insight(
                    "SLEEP",
                    Severity.WARNING,
                    "Insufficient sleep",
                    String.format(Locale.US,
                            "You're averaging %.1f hours of sleep this period, below your %.1f-hour threshold. " +
                            "Try an earlier wind-down routine.",
                            avgSleep, lowThreshold),
                    avgSleep));
        } else if (avgSleep >= goodTarget) {
            insights.add(new Insight(
                    "SLEEP",
                    Severity.POSITIVE,
                    "Healthy sleep",
                    String.format(Locale.US,
                            "Nice work — you're averaging %.1f hours of sleep this period.", avgSleep),
                    avgSleep));
        }
    }

    private void evaluateSpending(List<Expense> expenses, double spendThreshold,
                                  int windowDays, List<Insight> insights) {
        if (expenses.isEmpty()) return;
        double periodSpend = round(expenses.stream().mapToDouble(Expense::getAmount).sum());
        if (periodSpend > spendThreshold) {
            insights.add(new Insight(
                    "SPENDING",
                    Severity.WARNING,
                    "Overspending",
                    String.format(Locale.US,
                            "You've spent %.2f over the past %d days, above your %.2f period threshold. " +
                            "Review your largest categories.",
                            periodSpend, windowDays, spendThreshold),
                    periodSpend));
        }
    }

    private void evaluateHabitConsistency(List<DailyLog> logs, UserSettings settings,
                                          int windowDays, List<Insight> insights) {
        if (logs.size() < settings.getMinPairedDays()) return;

        long daysWithHabits = logs.stream()
                .filter(l -> (l.getTransactionalHabits() != null && !l.getTransactionalHabits().isEmpty())
                        || (l.getEmbeddedHabits() != null && !l.getEmbeddedHabits().isEmpty()))
                .count();
        double rate = (double) daysWithHabits / windowDays;
        double threshold = settings.getHabitConsistencyTarget() / 100.0;

        if (rate < threshold) {
            insights.add(new Insight(
                    "HABITS",
                    Severity.WARNING,
                    "Low consistency",
                    String.format(Locale.US,
                            "You logged habits on %d of the last %d days (%.0f%%). " +
                            "Small daily wins build momentum.",
                            daysWithHabits, windowDays, rate * 100),
                    round(rate)));
        }
    }

    private void evaluateHydration(List<DailyLog> logs, UserSettings settings, List<Insight> insights) {
        OptionalDouble avg = logs.stream()
                .filter(l -> l.getWaterIntake() != null)
                .mapToDouble(DailyLog::getWaterIntake)
                .average();
        if (avg.isEmpty()) return;

        double avgWater = round(avg.getAsDouble());
        double waterTarget = settings.getWaterTargetMl();
        if (avgWater < waterTarget) {
            insights.add(new Insight(
                    "HYDRATION",
                    Severity.WARNING,
                    "Low hydration",
                    String.format(Locale.US,
                            "You're averaging %.0f ml of water a day, below your %.0f ml target. " +
                            "Keep a bottle within reach.",
                            avgWater, waterTarget),
                    avgWater));
        }
    }

    private void evaluateMood(List<DailyLog> logs, List<JournalEntry> journals, List<Insight> insights) {
        List<String> moods = new ArrayList<>();
        journals.stream().map(JournalEntry::getMood).filter(java.util.Objects::nonNull).forEach(moods::add);
        for (DailyLog log : logs) {
            addIfPresent(moods, log.getMorningMood());
            addIfPresent(moods, log.getAfternoonMood());
            addIfPresent(moods, log.getEveningMood());
        }
        if (moods.isEmpty()) return;

        long negative = moods.stream().filter(m -> NEGATIVE_MOODS.contains(m.toLowerCase(Locale.US))).count();
        long positive = moods.stream().filter(m -> POSITIVE_MOODS.contains(m.toLowerCase(Locale.US))).count();
        if (negative > positive) {
            insights.add(new Insight("MOOD", Severity.WARNING, "Mood dip",
                    "Your recent moods skew negative. Consider what's draining you and lean on activities that recharge you.",
                    (double) negative));
        } else if (positive > 0 && positive >= negative) {
            insights.add(new Insight("MOOD", Severity.POSITIVE, "Positive mood",
                    "Your mood has been largely positive this period. Keep doing what's working.",
                    (double) positive));
        }
    }

    private static void addIfPresent(List<String> moods, String mood) {
        if (mood != null && !mood.isBlank()) moods.add(mood);
    }

    private static double round(double value) {
        return Math.round(value * 100.0) / 100.0;
    }
}
