package com.lifetrack.service;

import com.lifetrack.dto.HabitDtos.HabitRequest;
import com.lifetrack.dto.HabitDtos.HabitResponse;
import com.lifetrack.entity.DailyHabitCompletion;
import com.lifetrack.entity.UserHabit;
import com.lifetrack.exception.BadRequestException;
import com.lifetrack.exception.ResourceNotFoundException;
import com.lifetrack.repository.DailyHabitCompletionRepository;
import com.lifetrack.repository.UserHabitRepository;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.stream.Collectors;

@Service
public class HabitService {

    private final UserHabitRepository userHabitRepository;
    private final DailyHabitCompletionRepository completionRepository;

    public HabitService(UserHabitRepository userHabitRepository, DailyHabitCompletionRepository completionRepository) {
        this.userHabitRepository = userHabitRepository;
        this.completionRepository = completionRepository;
    }

    public List<HabitResponse> getHabitsForUser(Long userId, LocalDate date) {
        LocalDate targetDate = (date != null) ? date : LocalDate.now();
        Instant dayStart = targetDate.atStartOfDay(ZoneId.systemDefault()).toInstant();
        Instant dayEnd = targetDate.plusDays(1).atStartOfDay(ZoneId.systemDefault()).toInstant().minusMillis(1);

        List<UserHabit> allUserHabits = userHabitRepository.findByUserIdOrderByIdAsc(userId);

        List<DailyHabitCompletion> completions = completionRepository.findByUserIdAndDate(userId, targetDate);
        Set<Long> completedHabitIds = completions.stream()
                .filter(DailyHabitCompletion::isCompleted)
                .map(DailyHabitCompletion::getHabitId)
                .collect(Collectors.toSet());

        Set<Long> completionHabitIds = completions.stream()
                .map(DailyHabitCompletion::getHabitId)
                .collect(Collectors.toSet());

        List<UserHabit> habitsToReturn = allUserHabits.stream()
                .filter(h -> {
                    // Habit was active on targetDate if:
                    // 1. h.activatedAt is on or before end of targetDate
                    // 2. h.deactivatedAt is null OR on or after start of targetDate
                    boolean wasActivatedBeforeEnd = (h.getActivatedAt() == null || !h.getActivatedAt().isAfter(dayEnd));
                    boolean wasNotDeactivatedBeforeStart = (h.getDeactivatedAt() == null || !h.getDeactivatedAt().isBefore(dayStart));
                    boolean activeOnDate = wasActivatedBeforeEnd && wasNotDeactivatedBeforeStart;

                    return activeOnDate || completionHabitIds.contains(h.getId());
                })
                .collect(Collectors.toList());

        return habitsToReturn.stream()
                .map(h -> new HabitResponse(
                        h.getId(),
                        h.getName(),
                        h.isActive(),
                        completedHabitIds.contains(h.getId())
                ))
                .collect(Collectors.toList());
    }

    public HabitResponse createHabit(Long userId, HabitRequest request) {
        long activeCount = userHabitRepository.countByUserIdAndActiveTrue(userId);
        if (activeCount >= 5) {
            throw new BadRequestException("You can have a maximum of 5 active habits. Deactivate an existing habit first.");
        }

        UserHabit habit = new UserHabit(userId, request.name().trim());
        UserHabit saved = userHabitRepository.save(habit);
        return new HabitResponse(saved.getId(), saved.getName(), saved.isActive(), false);
    }

    public HabitResponse updateHabit(Long userId, Long habitId, HabitRequest request) {
        UserHabit habit = userHabitRepository.findByIdAndUserId(habitId, userId)
                .orElseThrow(() -> new ResourceNotFoundException("Habit not found: " + habitId));

        if (request.name() != null && !request.name().isBlank()) {
            habit.setName(request.name().trim());
        }

        if (request.active() != null) {
            if (request.active() && !habit.isActive()) {
                long activeCount = userHabitRepository.countByUserIdAndActiveTrue(userId);
                if (activeCount >= 5) {
                    throw new BadRequestException("Maximum 5 active habits allowed.");
                }
                habit.setActive(true);
                habit.setActivatedAt(Instant.now());
                habit.setDeactivatedAt(null);
            } else if (!request.active() && habit.isActive()) {
                habit.setActive(false);
                habit.setDeactivatedAt(Instant.now());
            }
        }

        habit.setUpdatedAt(Instant.now());
        UserHabit saved = userHabitRepository.save(habit);

        boolean completedToday = completionRepository
                .findByUserIdAndHabitIdAndDate(userId, saved.getId(), LocalDate.now())
                .map(DailyHabitCompletion::isCompleted)
                .orElse(false);

        return new HabitResponse(saved.getId(), saved.getName(), saved.isActive(), completedToday);
    }

    public void deactivateHabit(Long userId, Long habitId) {
        UserHabit habit = userHabitRepository.findByIdAndUserId(habitId, userId)
                .orElseThrow(() -> new ResourceNotFoundException("Habit not found: " + habitId));

        habit.setActive(false);
        habit.setDeactivatedAt(Instant.now());
        habit.setUpdatedAt(Instant.now());
        userHabitRepository.save(habit);
    }

    public boolean toggleCompletion(Long userId, Long habitId, LocalDate date, Boolean completed) {
        userHabitRepository.findByIdAndUserId(habitId, userId)
                .orElseThrow(() -> new ResourceNotFoundException("Habit not found: " + habitId));

        LocalDate targetDate = (date != null) ? date : LocalDate.now();
        Optional<DailyHabitCompletion> existingOpt = completionRepository.findByUserIdAndHabitIdAndDate(userId, habitId, targetDate);

        if (existingOpt.isPresent()) {
            DailyHabitCompletion existing = existingOpt.get();
            boolean nextState = (completed != null) ? completed : !existing.isCompleted();
            existing.setCompleted(nextState);
            completionRepository.save(existing);
            return nextState;
        } else {
            boolean initialState = (completed != null) ? completed : true;
            DailyHabitCompletion created = new DailyHabitCompletion(userId, habitId, targetDate, initialState);
            completionRepository.save(created);
            return initialState;
        }
    }
}
