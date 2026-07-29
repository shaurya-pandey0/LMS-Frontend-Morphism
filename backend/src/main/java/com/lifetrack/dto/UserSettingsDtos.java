package com.lifetrack.dto;

import com.lifetrack.entity.UserSettings;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.PositiveOrZero;

/** API contracts for persistent, per-user targets and insight preferences. */
public class UserSettingsDtos {

    /**
     * Complete settings update.
     *
     * <p>Cross-field rules, such as paired days not exceeding the analysis
     * period, are enforced by the service rather than duplicated in React.</p>
     */
    public record UserSettingsRequest(
            @PositiveOrZero double monthlyBudget,
            @Positive double sleepTargetHours,
            @Positive int stepTarget,
            @Positive double waterTargetMl,

            // ── insight preferences ─────────────────────────────────────────
            @Min(7) @Max(30) int insightPeriodDays,
            @Min(1) @Max(30) int minPairedDays,
            @PositiveOrZero double lowSleepThreshold,
            @Min(0) @Max(100) int habitConsistencyTarget
    ) {}

    /** Current persisted settings returned to the owning user. */
    public record UserSettingsResponse(
            double monthlyBudget,
            double sleepTargetHours,
            int stepTarget,
            double waterTargetMl,
            int insightPeriodDays,
            int minPairedDays,
            double lowSleepThreshold,
            int habitConsistencyTarget
    ) {
        public static UserSettingsResponse from(UserSettings s) {
            return new UserSettingsResponse(
                    s.getMonthlyBudget(),
                    s.getSleepTargetHours(),
                    s.getStepTarget(),
                    s.getWaterTargetMl(),
                    s.getInsightPeriodDays(),
                    s.getMinPairedDays(),
                    s.getLowSleepThreshold(),
                    s.getHabitConsistencyTarget()
            );
        }
    }
}
