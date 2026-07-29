package com.lifetrack.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

/**
 * Per-user targets and insight preferences.  One row per user, created with
 * sane defaults the first time it's requested (see {@code UserSettingsService}).
 *
 * <p>The four new insight-preference columns carry DDL defaults so that
 * existing rows keep safe values when Hibernate's {@code update} DDL mode adds
 * the columns.
 */
@Entity
@Table(name = "user_settings")
public class UserSettings {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true)
    private Long userId;

    // ── display / budget targets (unchanged) ───────────────────────────────
    @Column(nullable = false)
    private double monthlyBudget = 4000.0;

    @Column(nullable = false)
    private double sleepTargetHours = 8.0;

    @Column(nullable = false)
    private int stepTarget = 10000;

    @Column(nullable = false)
    private double waterTargetMl = 2000.0;

    // ── AI / insight preferences (new) ─────────────────────────────────────
    /** Trailing window analysed by insights & AI context (7–30 days). */
    @Column(nullable = false, columnDefinition = "INT DEFAULT 7")
    private int insightPeriodDays = 7;

    /**
     * Minimum number of daily-log entries in the window before a rule fires.
     * Must be ≤ insightPeriodDays.
     */
    @Column(nullable = false, columnDefinition = "INT DEFAULT 3")
    private int minPairedDays = 3;

    /**
     * Average sleep below this threshold triggers a warning.
     * Must be strictly below sleepTargetHours.
     */
    @Column(nullable = false, columnDefinition = "DOUBLE DEFAULT 6.0")
    private double lowSleepThreshold = 6.0;

    /**
     * Fraction of days (0–100 %) with at least one completed habit below which
     * consistency is flagged.
     */
    @Column(nullable = false, columnDefinition = "INT DEFAULT 70")
    private int habitConsistencyTarget = 70;

    // ── getters / setters ──────────────────────────────────────────────────
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Long getUserId() { return userId; }
    public void setUserId(Long userId) { this.userId = userId; }

    public double getMonthlyBudget() { return monthlyBudget; }
    public void setMonthlyBudget(double monthlyBudget) { this.monthlyBudget = monthlyBudget; }

    public double getSleepTargetHours() { return sleepTargetHours; }
    public void setSleepTargetHours(double sleepTargetHours) { this.sleepTargetHours = sleepTargetHours; }

    public int getStepTarget() { return stepTarget; }
    public void setStepTarget(int stepTarget) { this.stepTarget = stepTarget; }

    public double getWaterTargetMl() { return waterTargetMl; }
    public void setWaterTargetMl(double waterTargetMl) { this.waterTargetMl = waterTargetMl; }

    public int getInsightPeriodDays() { return insightPeriodDays; }
    public void setInsightPeriodDays(int insightPeriodDays) { this.insightPeriodDays = insightPeriodDays; }

    public int getMinPairedDays() { return minPairedDays; }
    public void setMinPairedDays(int minPairedDays) { this.minPairedDays = minPairedDays; }

    public double getLowSleepThreshold() { return lowSleepThreshold; }
    public void setLowSleepThreshold(double lowSleepThreshold) { this.lowSleepThreshold = lowSleepThreshold; }

    public int getHabitConsistencyTarget() { return habitConsistencyTarget; }
    public void setHabitConsistencyTarget(int habitConsistencyTarget) { this.habitConsistencyTarget = habitConsistencyTarget; }
}
