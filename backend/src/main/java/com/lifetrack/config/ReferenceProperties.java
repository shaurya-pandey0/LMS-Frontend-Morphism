package com.lifetrack.config;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

import java.util.List;

/**
 * Domain vocabulary served by {@code GET /api/reference} and enforced by the
 * write-side services (expense category, journal/daily-log moods).
 *
 * <p>This is the backend's single source of truth for these lists. The
 * frontend used to hardcode them; now it fetches this endpoint once and the
 * server rejects any value outside these lists — see {@code ExpenseService},
 * {@code JournalService}, {@code DailyLogService}.
 *
 * <p>Overridable via {@code app.reference.*} (e.g. a comma-separated env var
 * bound by Spring Boot's relaxed binding for {@code List<String>} properties).
 */
@Component
@ConfigurationProperties(prefix = "app.reference")
public class ReferenceProperties {

    private List<String> expenseCategories = List.of("Food", "Housing", "Travel", "Wellness", "Misc");

    private List<String> transactionalHabits = List.of(
            "Drink Water Before Coffee",
            "Meditation (10 min)",
            "Steps Goal Met",
            "Journal Entry Written"
    );

    private List<String> embeddedHabits = List.of(
            "Drink Water Before Coffee",
            "Meditation (10 min)",
            "Steps Goal Met",
            "Journal Entry Written",
            "Evening Stretch"
    );

    /** Moods used by journal entries. */
    private List<String> journalMoods = List.of("happy", "calm", "anxious", "grateful", "tired");

    /** Moods used by the daily log's morning/afternoon/evening mood fields. */
    private List<String> dailyMoods = List.of("great", "good", "okay", "meh", "bad");

    public List<String> getExpenseCategories() {
        return expenseCategories;
    }

    public void setExpenseCategories(List<String> expenseCategories) {
        this.expenseCategories = expenseCategories;
    }

    public List<String> getTransactionalHabits() {
        return transactionalHabits;
    }

    public void setTransactionalHabits(List<String> transactionalHabits) {
        this.transactionalHabits = transactionalHabits;
    }

    public List<String> getEmbeddedHabits() {
        return embeddedHabits;
    }

    public void setEmbeddedHabits(List<String> embeddedHabits) {
        this.embeddedHabits = embeddedHabits;
    }

    public List<String> getJournalMoods() {
        return journalMoods;
    }

    public void setJournalMoods(List<String> journalMoods) {
        this.journalMoods = journalMoods;
    }

    public List<String> getDailyMoods() {
        return dailyMoods;
    }

    public void setDailyMoods(List<String> dailyMoods) {
        this.dailyMoods = dailyMoods;
    }

    public boolean isValidExpenseCategory(String category) {
        return category != null && expenseCategories.stream().anyMatch(c -> c.equalsIgnoreCase(category));
    }

    public boolean isValidJournalMood(String mood) {
        return mood != null && journalMoods.stream().anyMatch(m -> m.equalsIgnoreCase(mood));
    }

    public boolean isValidDailyMood(String mood) {
        return mood != null && dailyMoods.stream().anyMatch(m -> m.equalsIgnoreCase(mood));
    }
}
