package com.lifetrack.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;

import java.time.Instant;
import java.time.LocalDate;

/**
 * Completion state of one user-defined habit on one calendar date.
 *
 * <p>The unique constraint guarantees a single mutable state per
 * user/habit/date while keeping the habit definition independent from its
 * historical observations.</p>
 */
@Entity
@Table(
    name = "daily_habit_completions",
    uniqueConstraints = {
        @UniqueConstraint(columnNames = {"user_id", "habit_id", "date"})
    }
)
public class DailyHabitCompletion {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Column(name = "habit_id", nullable = false)
    private Long habitId;

    @Column(nullable = false)
    private LocalDate date;

    @Column(nullable = false)
    private boolean completed = true;

    @Column(name = "created_at")
    private Instant createdAt = Instant.now();

    public DailyHabitCompletion() {}

    public DailyHabitCompletion(Long userId, Long habitId, LocalDate date, boolean completed) {
        this.userId = userId;
        this.habitId = habitId;
        this.date = date;
        this.completed = completed;
        this.createdAt = Instant.now();
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

    public Long getHabitId() {
        return habitId;
    }

    public void setHabitId(Long habitId) {
        this.habitId = habitId;
    }

    public LocalDate getDate() {
        return date;
    }

    public void setDate(LocalDate date) {
        this.date = date;
    }

    public boolean isCompleted() {
        return completed;
    }

    public void setCompleted(boolean completed) {
        this.completed = completed;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(Instant createdAt) {
        this.createdAt = createdAt;
    }
}
