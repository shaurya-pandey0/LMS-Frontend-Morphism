package com.lifetrack.controller;

import com.lifetrack.dto.HabitDtos.HabitRequest;
import com.lifetrack.dto.HabitDtos.HabitResponse;
import com.lifetrack.security.SecurityUtils;
import com.lifetrack.service.HabitService;
import jakarta.validation.Valid;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/habits")
public class HabitController {

    private final HabitService habitService;

    public HabitController(HabitService habitService) {
        this.habitService = habitService;
    }

    @GetMapping
    public ResponseEntity<List<HabitResponse>> getHabits(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date
    ) {
        Long userId = SecurityUtils.currentUserId();
        return ResponseEntity.ok(habitService.getHabitsForUser(userId, date));
    }

    @PostMapping
    public ResponseEntity<HabitResponse> createHabit(@Valid @RequestBody HabitRequest request) {
        Long userId = SecurityUtils.currentUserId();
        return ResponseEntity.status(HttpStatus.CREATED).body(habitService.createHabit(userId, request));
    }

    @PutMapping("/{id}")
    public ResponseEntity<HabitResponse> updateHabit(
            @PathVariable Long id,
            @Valid @RequestBody HabitRequest request
    ) {
        Long userId = SecurityUtils.currentUserId();
        return ResponseEntity.ok(habitService.updateHabit(userId, id, request));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deactivateHabit(@PathVariable Long id) {
        Long userId = SecurityUtils.currentUserId();
        habitService.deactivateHabit(userId, id);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{id}/toggle")
    public ResponseEntity<Map<String, Object>> toggleCompletion(
            @PathVariable Long id,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date,
            @RequestParam(required = false) Boolean completed
    ) {
        Long userId = SecurityUtils.currentUserId();
        boolean result = habitService.toggleCompletion(userId, id, date, completed);
        return ResponseEntity.ok(Map.of("habitId", id, "completed", result));
    }
}
