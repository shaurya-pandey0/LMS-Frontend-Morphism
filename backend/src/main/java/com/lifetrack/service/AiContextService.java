package com.lifetrack.service;

import com.lifetrack.dto.AiContextDtos.AiContextResponse;
import com.lifetrack.entity.DailyLog;
import com.lifetrack.entity.Expense;
import com.lifetrack.entity.JournalEntry;
import com.lifetrack.entity.UserSettings;
import com.lifetrack.repository.DailyLogRepository;
import com.lifetrack.repository.ExpenseRepository;
import com.lifetrack.repository.JournalEntryRepository;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.OptionalDouble;
import java.util.stream.Collectors;

/**
 * Builds the aggregated lifestyle context the AI service (Python, Phase 4)
 * consumes instead of the frontend assembling it and shipping raw journal
 * text across services.
 *
 * <p>All thresholds come from the requesting user's {@link UserSettings}.
 * The caller may supply an explicit {@code requestedDays} override (e.g.
 * from a query param); otherwise the user's saved {@code insightPeriodDays}
 * is used.  Spending threshold is derived from monthlyBudget × days ÷ 30.
 */
@Service
public class AiContextService {

    private static final int MAX_JOURNAL_EXCERPTS = 10;
    private static final int MAX_EXCERPT_CHARS = 500;

    private final DailyLogRepository dailyLogRepository;
    private final ExpenseRepository expenseRepository;
    private final JournalEntryRepository journalEntryRepository;
    private final UserSettingsService userSettingsService;

    public AiContextService(DailyLogRepository dailyLogRepository,
                            ExpenseRepository expenseRepository,
                            JournalEntryRepository journalEntryRepository,
                            UserSettingsService userSettingsService) {
        this.dailyLogRepository = dailyLogRepository;
        this.expenseRepository = expenseRepository;
        this.journalEntryRepository = journalEntryRepository;
        this.userSettingsService = userSettingsService;
    }

    public AiContextResponse buildContext(Long userId, Integer requestedDays) {
        UserSettings settings = userSettingsService.getOrCreate(userId);

        // Honour explicit override; fall back to the user's saved preference.
        int days = (requestedDays != null && requestedDays > 0)
                ? requestedDays
                : settings.getInsightPeriodDays();

        LocalDate today = LocalDate.now();
        LocalDate from = today.minusDays(days - 1L);

        List<DailyLog> logs = dailyLogRepository.findByUserIdAndDateBetweenOrderByDateAsc(userId, from, today);
        List<Expense> expenses = expenseRepository.findByUserIdAndDateBetween(userId, from, today);
        List<JournalEntry> journals = journalEntryRepository.findByUserIdAndDateBetween(userId, from, today);

        Double avgSleepHours = average(logs.stream()
                .map(DailyLog::getSleepHours)
                .filter(java.util.Objects::nonNull)
                .mapToDouble(Double::doubleValue));

        Double avgWaterMl = average(logs.stream()
                .map(DailyLog::getWaterIntake)
                .filter(java.util.Objects::nonNull)
                .mapToDouble(Double::doubleValue));

        Double habitConsistency = logs.isEmpty() ? null : (double) logs.stream()
                .filter(l -> (l.getTransactionalHabits() != null && !l.getTransactionalHabits().isEmpty())
                        || (l.getEmbeddedHabits() != null && !l.getEmbeddedHabits().isEmpty()))
                .count() / (double) logs.size();

        double periodSpend = expenses.stream().mapToDouble(Expense::getAmount).sum();
        double spendThreshold = settings.getMonthlyBudget() * days / 30.0;

        Map<String, Double> expensesByCategory = expenses.stream()
                .collect(Collectors.groupingBy(
                        Expense::getCategory,
                        LinkedHashMap::new,
                        Collectors.summingDouble(Expense::getAmount)));

        Map<String, Long> moodCounts = collectMoodCounts(logs, journals);

        List<String> journalExcerpts = journals.stream()
                .sorted((a, b) -> b.getDate().compareTo(a.getDate()))
                .limit(MAX_JOURNAL_EXCERPTS)
                .map(JournalEntry::getText)
                .filter(java.util.Objects::nonNull)
                .map(text -> text.length() > MAX_EXCERPT_CHARS ? text.substring(0, MAX_EXCERPT_CHARS) : text)
                .collect(Collectors.toList());

        return new AiContextResponse(
                days,
                avgSleepHours,
                settings.getLowSleepThreshold(),
                settings.getSleepTargetHours(),
                expenses.isEmpty() ? null : periodSpend,
                spendThreshold,
                expensesByCategory,
                avgWaterMl,
                settings.getWaterTargetMl(),
                habitConsistency,
                settings.getHabitConsistencyTarget() / 100.0,
                moodCounts,
                journalExcerpts
        );
    }

    private Map<String, Long> collectMoodCounts(List<DailyLog> logs, List<JournalEntry> journals) {
        Map<String, Long> counts = new LinkedHashMap<>();
        journals.stream()
                .map(JournalEntry::getMood)
                .filter(java.util.Objects::nonNull)
                .forEach(m -> counts.merge(m, 1L, Long::sum));
        for (DailyLog log : logs) {
            mergeMood(counts, log.getMorningMood());
            mergeMood(counts, log.getAfternoonMood());
            mergeMood(counts, log.getEveningMood());
        }
        return counts;
    }

    private void mergeMood(Map<String, Long> counts, String mood) {
        if (mood != null && !mood.isBlank()) counts.merge(mood, 1L, Long::sum);
    }

    private static Double average(java.util.stream.DoubleStream stream) {
        OptionalDouble avg = stream.average();
        return avg.isPresent() ? Math.round(avg.getAsDouble() * 100.0) / 100.0 : null;
    }
}
