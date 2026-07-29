package com.lifetrack.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import java.time.LocalDate;

/** API contracts for user-defined habits and their dated completion states. */
public class HabitDtos {

    /** Habit definition changes; {@code active} is optional for rename-only updates. */
    public record HabitRequest(
            @NotBlank(message = "Habit name is required")
            @Size(max = 100, message = "Habit name cannot exceed 100 characters")
            String name,

            Boolean active
    ) {}

    /** Habit definition combined with its completion state for the requested date. */
    public record HabitResponse(
            Long id,
            String name,
            boolean active,
            boolean completedToday
    ) {}

    /** Optional explicit state used when changing a dated habit completion. */
    public record ToggleCompletionRequest(
            LocalDate date,
            Boolean completed
    ) {}
}
