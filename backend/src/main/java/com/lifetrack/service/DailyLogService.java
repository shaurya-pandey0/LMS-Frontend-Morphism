package com.lifetrack.service;

import com.lifetrack.config.ReferenceProperties;
import com.lifetrack.dto.DailyLogDtos.DailyLogRequest;
import com.lifetrack.dto.DailyLogDtos.MealDto;
import com.lifetrack.entity.DailyLog;
import com.lifetrack.exception.BadRequestException;
import com.lifetrack.exception.ResourceNotFoundException;
import com.lifetrack.repository.DailyLogRepository;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

@Service
public class DailyLogService {

    private final DailyLogRepository dailyLogRepository;
    private final ReferenceProperties referenceProperties;

    public DailyLogService(DailyLogRepository dailyLogRepository, ReferenceProperties referenceProperties) {
        this.dailyLogRepository = dailyLogRepository;
        this.referenceProperties = referenceProperties;
    }

    public List<DailyLog> findAll(Long userId) {
        return dailyLogRepository.findByUserIdOrderByDateDesc(userId);
    }

    public DailyLog findById(Long userId, Long id) {
        return dailyLogRepository.findByIdAndUserId(id, userId)
                .orElseThrow(() -> new ResourceNotFoundException("Daily log not found: " + id));
    }

    /** Used by GET /today and GET ?date= — no reason to fetch every log to find one date. */
    public java.util.Optional<DailyLog> findByDate(Long userId, LocalDate date) {
        return dailyLogRepository.findByUserIdAndDate(userId, date);
    }

    public List<DailyLog> findByDateRange(Long userId, LocalDate from, LocalDate to) {
        return dailyLogRepository.findByUserIdAndDateBetweenOrderByDateAsc(userId, from, to);
    }

    public DailyLog create(Long userId, DailyLogRequest request) {
        LocalDate date = request.date() != null ? request.date() : LocalDate.now();
        // A user has at most one log per date (enforced by a unique index). Upsert
        // so re-logging the same day updates the existing entry instead of failing
        // with a duplicate-key error.
        DailyLog log = dailyLogRepository.findByUserIdAndDate(userId, date)
                .orElseGet(() -> {
                    DailyLog created = new DailyLog();
                    created.setUserId(userId);
                    created.setCreatedAt(Instant.now());
                    return created;
                });
        apply(log, request);
        log.setUpdatedAt(Instant.now());
        return dailyLogRepository.save(log);
    }

    public DailyLog merge(Long userId, DailyLogRequest request) {
        boolean hasScalar = request.sleepHours() != null || request.stepTarget() != null || request.waterIntake() != null ||
                request.sleepQuality() != null || request.stressLevel() != null || request.energyLevel() != null ||
                request.productivityLevel() != null || request.dayType() != null;

        boolean hasHabits = (request.transactionalHabits() != null && !request.transactionalHabits().isEmpty()) ||
                (request.embeddedHabits() != null && !request.embeddedHabits().isEmpty());

        boolean hasMeals = request.meals() != null && !request.meals().isEmpty() &&
                request.meals().stream().anyMatch(m -> m != null && m.items() != null && !m.items().isEmpty());

        boolean hasMoods = (request.morningMood() != null && !request.morningMood().isBlank()) ||
                (request.afternoonMood() != null && !request.afternoonMood().isBlank()) ||
                (request.eveningMood() != null && !request.eveningMood().isBlank());

        if (!hasScalar && !hasHabits && !hasMeals && !hasMoods) {
            throw new BadRequestException("Cannot submit a completely empty log entry. Please fill at least one field.");
        }

        LocalDate date = request.date() != null ? request.date() : LocalDate.now();
        DailyLog log = dailyLogRepository.findByUserIdAndDate(userId, date)
                .orElseGet(() -> {
                    DailyLog created = new DailyLog();
                    created.setUserId(userId);
                    created.setCreatedAt(Instant.now());
                    created.setDate(date);
                    created.setTransactionalHabits(new ArrayList<>());
                    created.setEmbeddedHabits(new ArrayList<>());
                    created.setMeals(new ArrayList<>());
                    return created;
                });

        if (request.sleepHours() != null) log.setSleepHours(request.sleepHours());
        if (request.stepTarget() != null) log.setStepTarget(request.stepTarget());
        if (request.waterIntake() != null) log.setWaterIntake(request.waterIntake());
        if (request.sleepQuality() != null) log.setSleepQuality(request.sleepQuality());
        if (request.stressLevel() != null) log.setStressLevel(request.stressLevel());
        if (request.energyLevel() != null) log.setEnergyLevel(request.energyLevel());
        if (request.productivityLevel() != null) log.setProductivityLevel(request.productivityLevel());
        if (request.dayType() != null) log.setDayType(request.dayType());

        if (request.morningMood() != null && !request.morningMood().isBlank()) {
            validateMood(request.morningMood());
            log.setMorningMood(request.morningMood());
        }
        if (request.afternoonMood() != null && !request.afternoonMood().isBlank()) {
            validateMood(request.afternoonMood());
            log.setAfternoonMood(request.afternoonMood());
        }
        if (request.eveningMood() != null && !request.eveningMood().isBlank()) {
            validateMood(request.eveningMood());
            log.setEveningMood(request.eveningMood());
        }

        if (request.transactionalHabits() != null && !request.transactionalHabits().isEmpty()) {
            List<String> existing = log.getTransactionalHabits() != null ? new ArrayList<>(log.getTransactionalHabits()) : new ArrayList<>();
            for (String h : request.transactionalHabits()) {
                if (h != null && !h.isBlank() && !existing.contains(h)) {
                    existing.add(h);
                }
            }
            log.setTransactionalHabits(existing);
        }

        if (request.embeddedHabits() != null && !request.embeddedHabits().isEmpty()) {
            List<String> existing = log.getEmbeddedHabits() != null ? new ArrayList<>(log.getEmbeddedHabits()) : new ArrayList<>();
            for (String h : request.embeddedHabits()) {
                if (h != null && !h.isBlank() && !existing.contains(h)) {
                    existing.add(h);
                }
            }
            log.setEmbeddedHabits(existing);
        }

        if (request.meals() != null && !request.meals().isEmpty()) {
            List<DailyLog.Meal> currentMeals = log.getMeals() != null ? new ArrayList<>(log.getMeals()) : new ArrayList<>();
            for (MealDto incomingDto : request.meals()) {
                if (incomingDto == null || incomingDto.name() == null || incomingDto.name().isBlank()) continue;
                String mealName = incomingDto.name().trim();
                List<String> incomingItems = incomingDto.items() != null ? incomingDto.items() : new ArrayList<>();

                DailyLog.Meal existingMeal = currentMeals.stream()
                        .filter(m -> m.getName() != null && m.getName().equalsIgnoreCase(mealName))
                        .findFirst()
                        .orElse(null);

                if (existingMeal != null) {
                    List<String> existingItems = existingMeal.getItems() != null ? new ArrayList<>(existingMeal.getItems()) : new ArrayList<>();
                    for (String item : incomingItems) {
                        if (item != null && !item.isBlank() && !existingItems.contains(item)) {
                            existingItems.add(item);
                        }
                    }
                    existingMeal.setItems(existingItems);
                } else {
                    DailyLog.Meal newMeal = new DailyLog.Meal();
                    newMeal.setName(mealName);
                    List<String> itemsList = new ArrayList<>();
                    for (String item : incomingItems) {
                        if (item != null && !item.isBlank() && !itemsList.contains(item)) {
                            itemsList.add(item);
                        }
                    }
                    newMeal.setItems(itemsList);
                    currentMeals.add(newMeal);
                }
            }
            log.setMeals(currentMeals);
        }

        log.setUpdatedAt(Instant.now());
        return dailyLogRepository.save(log);
    }

    public DailyLog update(Long userId, Long id, DailyLogRequest request) {
        DailyLog log = findById(userId, id);
        apply(log, request);
        log.setUpdatedAt(Instant.now());
        return dailyLogRepository.save(log);
    }

    public void delete(Long userId, Long id) {
        DailyLog log = findById(userId, id);
        dailyLogRepository.delete(log);
    }

    private void apply(DailyLog log, DailyLogRequest request) {
        validateMood(request.morningMood());
        validateMood(request.afternoonMood());
        validateMood(request.eveningMood());
        log.setDate(request.date() != null ? request.date() : LocalDate.now());
        log.setSleepHours(request.sleepHours());
        log.setStepTarget(request.stepTarget());
        log.setWaterIntake(request.waterIntake());
        log.setSleepQuality(request.sleepQuality());
        log.setStressLevel(request.stressLevel());
        log.setEnergyLevel(request.energyLevel());
        log.setProductivityLevel(request.productivityLevel());
        log.setDayType(request.dayType());
        log.setTransactionalHabits(request.transactionalHabits() != null ? request.transactionalHabits() : new ArrayList<>());
        log.setEmbeddedHabits(request.embeddedHabits() != null ? request.embeddedHabits() : new ArrayList<>());
        List<DailyLog.Meal> meals = new ArrayList<>();
        if (request.meals() != null) {
            for (MealDto m : request.meals()) {
                meals.add(m.toEntity());
            }
        }
        log.setMeals(meals);
        log.setMorningMood(request.morningMood());
        log.setAfternoonMood(request.afternoonMood());
        log.setEveningMood(request.eveningMood());
    }

    /** Mood fields are optional on a daily log; only validate when supplied. */
    private void validateMood(String mood) {
        if (mood != null && !mood.isBlank() && !referenceProperties.isValidDailyMood(mood)) {
            throw new BadRequestException(
                    "Unknown mood: " + mood + ". Valid moods: " + referenceProperties.getDailyMoods());
        }
    }
}
