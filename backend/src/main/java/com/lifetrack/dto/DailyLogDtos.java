package com.lifetrack.dto;

import com.lifetrack.entity.DailyLog;
import com.lifetrack.entity.DayType;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

/** Transport contracts for daily-log meals, submissions, and persisted records. */
public class DailyLogDtos {

    /** Meal name and its incrementally collected food items. */
    public record MealDto(String name, List<String> items) {
        public static MealDto from(DailyLog.Meal meal) {
            return new MealDto(meal.getName(), meal.getItems());
        }

        public DailyLog.Meal toEntity() {
            DailyLog.Meal meal = new DailyLog.Meal();
            meal.setName(name);
            meal.setItems(items == null ? new ArrayList<>() : items);
            return meal;
        }
    }

    /**
     * Partial daily-log submission.
     *
     * <p>Nullable fields are intentional: the merge endpoint accepts check-ins
     * throughout the day without erasing values that were not resubmitted.</p>
     */
    public record DailyLogRequest(
            LocalDate date,
            Double sleepHours,
            Integer stepTarget,
            Double waterIntake,

            @Min(value = 1, message = "Sleep quality must be between 1 and 5")
            @Max(value = 5, message = "Sleep quality must be between 1 and 5")
            Integer sleepQuality,

            @Min(value = 1, message = "Stress level must be between 1 and 5")
            @Max(value = 5, message = "Stress level must be between 1 and 5")
            Integer stressLevel,

            @Min(value = 1, message = "Energy level must be between 1 and 5")
            @Max(value = 5, message = "Energy level must be between 1 and 5")
            Integer energyLevel,

            @Min(value = 1, message = "Productivity level must be between 1 and 5")
            @Max(value = 5, message = "Productivity level must be between 1 and 5")
            Integer productivityLevel,

            DayType dayType,

            List<String> transactionalHabits,
            List<String> embeddedHabits,
            List<MealDto> meals,
            String morningMood,
            String afternoonMood,
            String eveningMood
    ) {}

    /** Complete persisted daily log returned after entity-to-contract mapping. */
    public record DailyLogResponse(
            Long id,
            LocalDate date,
            Double sleepHours,
            Integer stepTarget,
            Double waterIntake,
            Integer sleepQuality,
            Integer stressLevel,
            Integer energyLevel,
            Integer productivityLevel,
            DayType dayType,
            List<String> transactionalHabits,
            List<String> embeddedHabits,
            List<MealDto> meals,
            String morningMood,
            String afternoonMood,
            String eveningMood
    ) {
        public static DailyLogResponse from(DailyLog log) {
            List<MealDto> mealDtos = new ArrayList<>();
            if (log.getMeals() != null) {
                for (DailyLog.Meal m : log.getMeals()) {
                    mealDtos.add(MealDto.from(m));
                }
            }
            return new DailyLogResponse(
                    log.getId(),
                    log.getDate(),
                    log.getSleepHours(),
                    log.getStepTarget(),
                    log.getWaterIntake(),
                    log.getSleepQuality(),
                    log.getStressLevel(),
                    log.getEnergyLevel(),
                    log.getProductivityLevel(),
                    log.getDayType(),
                    log.getTransactionalHabits(),
                    log.getEmbeddedHabits(),
                    mealDtos,
                    log.getMorningMood(),
                    log.getAfternoonMood(),
                    log.getEveningMood()
            );
        }
    }
}
