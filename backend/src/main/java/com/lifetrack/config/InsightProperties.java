package com.lifetrack.config;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

/**
 * Tunable thresholds for the rule-based insight engine. Overridable via
 * environment variables, e.g. {@code APP_INSIGHTS_WEEKLY_SPENDING_THRESHOLD}.
 */
@Component
@ConfigurationProperties(prefix = "app.insights")
public class InsightProperties {

    /** Average nightly sleep (hours) below which sleep is flagged as insufficient. */
    private double minSleepHours = 6.0;

    /** Average nightly sleep (hours) at or above which sleep is praised. */
    private double goodSleepHours = 7.5;

    /** Total spend over the trailing week above which spending is flagged. */
    private double weeklySpendingThreshold = 1000.0;

    /** Average daily water intake (ml) below which hydration is flagged. */
    private double minWaterIntakeMl = 2000.0;

    /** Fraction of days (0-1) with at least one logged habit below which consistency is flagged. */
    private double habitConsistencyThreshold = 0.5;

    public double getMinSleepHours() {
        return minSleepHours;
    }

    public void setMinSleepHours(double minSleepHours) {
        this.minSleepHours = minSleepHours;
    }

    public double getGoodSleepHours() {
        return goodSleepHours;
    }

    public void setGoodSleepHours(double goodSleepHours) {
        this.goodSleepHours = goodSleepHours;
    }

    public double getWeeklySpendingThreshold() {
        return weeklySpendingThreshold;
    }

    public void setWeeklySpendingThreshold(double weeklySpendingThreshold) {
        this.weeklySpendingThreshold = weeklySpendingThreshold;
    }

    public double getMinWaterIntakeMl() {
        return minWaterIntakeMl;
    }

    public void setMinWaterIntakeMl(double minWaterIntakeMl) {
        this.minWaterIntakeMl = minWaterIntakeMl;
    }

    public double getHabitConsistencyThreshold() {
        return habitConsistencyThreshold;
    }

    public void setHabitConsistencyThreshold(double habitConsistencyThreshold) {
        this.habitConsistencyThreshold = habitConsistencyThreshold;
    }
}
