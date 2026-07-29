package com.lifetrack.entity;

import jakarta.persistence.CollectionTable;
import jakarta.persistence.Column;
import jakarta.persistence.Convert;
import jakarta.persistence.ElementCollection;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;

import java.time.Instant;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

/**
 * A user's consolidated activity and wellbeing record for one calendar date.
 *
 * <p>The unique user/date constraint makes repeated submissions updates or
 * merges of the same logical day rather than separate daily records.</p>
 */
@Entity
@Table(
        name = "daily_logs",
        uniqueConstraints = @UniqueConstraint(name = "uk_daily_log_user_date", columnNames = {"userId", "date"})
)
public class DailyLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private Long userId;

    @Column(nullable = false)
    private LocalDate date;

    private Double sleepHours;
    private Integer stepTarget;
    private Double waterIntake;

    private Integer sleepQuality;
    private Integer stressLevel;
    private Integer energyLevel;
    private Integer productivityLevel;

    @Enumerated(EnumType.STRING)
    @Column(length = 30)
    private DayType dayType;

    /**
     * Legacy habit-name snapshots retained for backward compatibility.
     * New user-managed habit tracking is persisted by {@link UserHabit} and
     * {@link DailyHabitCompletion}.
     */
    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(
            name = "daily_log_transactional_habits",
            joinColumns = @JoinColumn(name = "daily_log_id")
    )
    @Column(name = "habit")
    private List<String> transactionalHabits = new ArrayList<>();

    /** Second legacy habit collection retained while old records are migrated. */
    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(
            name = "daily_log_embedded_habits",
            joinColumns = @JoinColumn(name = "daily_log_id")
    )
    @Column(name = "habit")
    private List<String> embeddedHabits = new ArrayList<>();

    // Stored as JSON — see MealListConverter for the rationale.
    @Convert(converter = MealListConverter.class)
    @Column(columnDefinition = "TEXT")
    private List<Meal> meals = new ArrayList<>();

    @Column(length = 40)
    private String morningMood;

    @Column(length = 40)
    private String afternoonMood;

    @Column(length = 40)
    private String eveningMood;

    @Column(nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    private Instant updatedAt = Instant.now();

    /** Plain value object; persisted inside the {@code meals} JSON column. */
    public static class Meal {
        private String name;
        private List<String> items = new ArrayList<>();

        public String getName() {
            return name;
        }

        public void setName(String name) {
            this.name = name;
        }

        public List<String> getItems() {
            return items;
        }

        public void setItems(List<String> items) {
            this.items = items;
        }
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public Long getUserId() {
        return userId;
    }

    public void setUserId(Long userId) {
        this.userId = userId;
    }

    public LocalDate getDate() {
        return date;
    }

    public void setDate(LocalDate date) {
        this.date = date;
    }

    public Double getSleepHours() {
        return sleepHours;
    }

    public void setSleepHours(Double sleepHours) {
        this.sleepHours = sleepHours;
    }

    public Integer getStepTarget() {
        return stepTarget;
    }

    public void setStepTarget(Integer stepTarget) {
        this.stepTarget = stepTarget;
    }

    public Double getWaterIntake() {
        return waterIntake;
    }

    public void setWaterIntake(Double waterIntake) {
        this.waterIntake = waterIntake;
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

    public List<Meal> getMeals() {
        return meals;
    }

    public void setMeals(List<Meal> meals) {
        this.meals = meals;
    }

    public String getMorningMood() {
        return morningMood;
    }

    public void setMorningMood(String morningMood) {
        this.morningMood = morningMood;
    }

    public String getAfternoonMood() {
        return afternoonMood;
    }

    public void setAfternoonMood(String afternoonMood) {
        this.afternoonMood = afternoonMood;
    }

    public String getEveningMood() {
        return eveningMood;
    }

    public void setEveningMood(String eveningMood) {
        this.eveningMood = eveningMood;
    }

    public Integer getSleepQuality() {
        return sleepQuality;
    }

    public void setSleepQuality(Integer sleepQuality) {
        this.sleepQuality = sleepQuality;
    }

    public Integer getStressLevel() {
        return stressLevel;
    }

    public void setStressLevel(Integer stressLevel) {
        this.stressLevel = stressLevel;
    }

    public Integer getEnergyLevel() {
        return energyLevel;
    }

    public void setEnergyLevel(Integer energyLevel) {
        this.energyLevel = energyLevel;
    }

    public Integer getProductivityLevel() {
        return productivityLevel;
    }

    public void setProductivityLevel(Integer productivityLevel) {
        this.productivityLevel = productivityLevel;
    }

    public DayType getDayType() {
        return dayType;
    }

    public void setDayType(DayType dayType) {
        this.dayType = dayType;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(Instant createdAt) {
        this.createdAt = createdAt;
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(Instant updatedAt) {
        this.updatedAt = updatedAt;
    }
}
