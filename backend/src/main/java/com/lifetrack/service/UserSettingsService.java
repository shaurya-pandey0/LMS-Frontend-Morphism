package com.lifetrack.service;

import com.lifetrack.dto.UserSettingsDtos.UserSettingsRequest;
import com.lifetrack.entity.UserSettings;
import com.lifetrack.exception.BadRequestException;
import com.lifetrack.repository.UserSettingsRepository;
import org.springframework.stereotype.Service;

@Service
public class UserSettingsService {

    private final UserSettingsRepository userSettingsRepository;

    public UserSettingsService(UserSettingsRepository userSettingsRepository) {
        this.userSettingsRepository = userSettingsRepository;
    }

    /** Every user gets defaults on first read — no explicit provisioning step needed. */
    public UserSettings getOrCreate(Long userId) {
        return userSettingsRepository.findByUserId(userId)
                .orElseGet(() -> {
                    UserSettings settings = new UserSettings();
                    settings.setUserId(userId);
                    return userSettingsRepository.save(settings);
                });
    }

    public UserSettings update(Long userId, UserSettingsRequest request) {
        // Cross-field validation that @Min/@Max annotations cannot express.
        if (request.minPairedDays() > request.insightPeriodDays()) {
            throw new BadRequestException(
                    "Minimum paired days (" + request.minPairedDays() + ") must not exceed " +
                    "the analysis period (" + request.insightPeriodDays() + " days).");
        }
        if (request.lowSleepThreshold() >= request.sleepTargetHours()) {
            throw new BadRequestException(
                    "Low sleep threshold (" + request.lowSleepThreshold() + " hrs) must be " +
                    "strictly below the sleep target (" + request.sleepTargetHours() + " hrs).");
        }

        UserSettings settings = getOrCreate(userId);
        settings.setMonthlyBudget(request.monthlyBudget());
        settings.setSleepTargetHours(request.sleepTargetHours());
        settings.setStepTarget(request.stepTarget());
        settings.setWaterTargetMl(request.waterTargetMl());
        settings.setInsightPeriodDays(request.insightPeriodDays());
        settings.setMinPairedDays(request.minPairedDays());
        settings.setLowSleepThreshold(request.lowSleepThreshold());
        settings.setHabitConsistencyTarget(request.habitConsistencyTarget());
        return userSettingsRepository.save(settings);
    }
}
