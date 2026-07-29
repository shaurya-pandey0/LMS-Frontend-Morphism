package com.lifetrack.service;

import com.lifetrack.dto.AnalyticsDtos.AdminStatsResponse;
import com.lifetrack.dto.AnalyticsDtos.DailyExpensePoint;
import com.lifetrack.dto.AnalyticsDtos.SleepPoint;
import com.lifetrack.dto.AnalyticsDtos.UserAnalyticsResponse;
import com.lifetrack.entity.DailyLog;
import com.lifetrack.entity.Expense;
import com.lifetrack.entity.JournalEntry;
import com.lifetrack.entity.UserSettings;
import com.lifetrack.exception.BadRequestException;
import com.lifetrack.repository.DailyLogRepository;
import com.lifetrack.repository.ExpenseRepository;
import com.lifetrack.repository.JournalEntryRepository;
import com.lifetrack.repository.UserRepository;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.TreeMap;
import java.util.stream.Collectors;

@Service
public class AnalyticsService {

    private final DailyLogRepository dailyLogRepository;
    private final ExpenseRepository expenseRepository;
    private final JournalEntryRepository journalEntryRepository;
    private final UserRepository userRepository;
    private final UserSettingsService userSettingsService;

    public AnalyticsService(DailyLogRepository dailyLogRepository,
                             ExpenseRepository expenseRepository,
                             JournalEntryRepository journalEntryRepository,
                             UserRepository userRepository,
                             UserSettingsService userSettingsService) {
        this.dailyLogRepository = dailyLogRepository;
        this.expenseRepository = expenseRepository;
        this.journalEntryRepository = journalEntryRepository;
        this.userRepository = userRepository;
        this.userSettingsService = userSettingsService;
    }

    public UserAnalyticsResponse userAnalytics(Long userId) {
        return userAnalytics(userId, null, null);
    }

    public UserAnalyticsResponse userAnalytics(Long userId, LocalDate from, LocalDate to) {
        LocalDate end = (to != null) ? to : LocalDate.now();
        LocalDate start = (from != null) ? from : end.withDayOfMonth(1);

        if (start.isAfter(end)) {
            throw new BadRequestException("'from' date (" + start + ") cannot be after 'to' date (" + end + ")");
        }

        // Trailing 7-day sleep data for Dashboard
        LocalDate today = LocalDate.now();
        LocalDate weekAgo = today.minusDays(6);
        List<SleepPoint> weeklySleep = dailyLogRepository
                .findByUserIdAndDateBetweenOrderByDateAsc(userId, weekAgo, today)
                .stream()
                .map(log -> new SleepPoint(log.getDate(), log.getSleepHours()))
                .collect(Collectors.toList());

        // Range-filtered sleep points for Analytics Trends
        List<SleepPoint> sleepPoints = dailyLogRepository
                .findByUserIdAndDateBetweenOrderByDateAsc(userId, start, end)
                .stream()
                .map(log -> new SleepPoint(log.getDate(), log.getSleepHours()))
                .collect(Collectors.toList());

        List<Expense> rangeExpenses = expenseRepository
                .findByUserIdAndDateBetween(userId, start, end);

        Map<String, Double> byCategory = rangeExpenses.stream()
                .collect(Collectors.groupingBy(
                        Expense::getCategory,
                        LinkedHashMap::new,
                        Collectors.summingDouble(Expense::getAmount)));

        double totalExpenses = rangeExpenses.stream().mapToDouble(Expense::getAmount).sum();

        // Sort daily expense points by date ascending
        Map<LocalDate, Double> dailyExpensesMap = rangeExpenses.stream()
                .collect(Collectors.groupingBy(
                        Expense::getDate,
                        TreeMap::new,
                        Collectors.summingDouble(Expense::getAmount)));

        List<DailyExpensePoint> dailyExpenses = dailyExpensesMap.entrySet().stream()
                .map(e -> new DailyExpensePoint(e.getKey(), e.getValue()))
                .collect(Collectors.toList());

        UserSettings settings = userSettingsService.getOrCreate(userId);
        double monthlyBudget = settings.getMonthlyBudget();
        double budgetUsagePct = monthlyBudget > 0 ? Math.min((totalExpenses / monthlyBudget) * 100.0, 100.0) : 0.0;

        // Range-filtered journals and mood counts
        List<JournalEntry> rangeJournals = journalEntryRepository.findByUserIdAndDateBetween(userId, start, end);
        Map<String, Long> moodCounts = rangeJournals.stream()
                .filter(j -> j.getMood() != null)
                .collect(Collectors.groupingBy(JournalEntry::getMood, LinkedHashMap::new, Collectors.counting()));

        return new UserAnalyticsResponse(
                sleepPoints,
                weeklySleep,
                dailyExpenses,
                byCategory,
                totalExpenses,
                budgetUsagePct,
                monthlyBudget,
                moodCounts,
                rangeJournals.size()
        );
    }

    public AdminStatsResponse adminStats() {
        List<Expense> allExpenses = expenseRepository.findAll();
        Map<String, Double> aggregatedExpenses = allExpenses.stream()
                .collect(Collectors.groupingBy(
                        Expense::getCategory,
                        LinkedHashMap::new,
                        Collectors.summingDouble(Expense::getAmount)));

        List<JournalEntry> allJournals = journalEntryRepository.findAll();
        Map<String, Long> aggregatedMoods = allJournals.stream()
                .filter(j -> j.getMood() != null)
                .collect(Collectors.groupingBy(JournalEntry::getMood, LinkedHashMap::new, Collectors.counting()));

        return new AdminStatsResponse(
                userRepository.count(),
                dailyLogRepository.count(),
                allExpenses.size(),
                allJournals.size(),
                aggregatedExpenses,
                aggregatedMoods);
    }
}
