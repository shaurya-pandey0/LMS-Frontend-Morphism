package com.lifetrack.controller;

import com.lifetrack.dto.DailyLogDtos.DailyLogRequest;
import com.lifetrack.dto.DailyLogDtos.DailyLogResponse;
import com.lifetrack.security.SecurityUtils;
import com.lifetrack.service.DailyLogService;
import jakarta.validation.Valid;
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
import com.lifetrack.entity.DailyLog;

import java.time.LocalDate;
import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/daily-logs")
public class DailyLogController {

    private final DailyLogService dailyLogService;

    public DailyLogController(DailyLogService dailyLogService) {
        this.dailyLogService = dailyLogService;
    }

    @GetMapping
    public List<DailyLogResponse> list(
            @RequestParam(required = false) LocalDate date,
            @RequestParam(required = false) LocalDate from,
            @RequestParam(required = false) LocalDate to) {
        Long userId = SecurityUtils.currentUserId();
        List<DailyLog> logs;
        if (date != null) {
            logs = dailyLogService.findByDate(userId, date)
                    .map(List::of)
                    .orElseGet(List::of);
        } else if (from != null && to != null) {
            logs = dailyLogService.findByDateRange(userId, from, to);
        } else {
            logs = dailyLogService.findAll(userId);
        }
        return logs.stream().map(DailyLogResponse::from).collect(Collectors.toList());
    }

    /** Convenience for "load today's log if it exists" — avoids fetching everything client-side. */
    @GetMapping("/today")
    public ResponseEntity<DailyLogResponse> today() {
        return dailyLogService.findByDate(SecurityUtils.currentUserId(), LocalDate.now())
                .map(DailyLogResponse::from)
                .map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.noContent().build());
    }

    @GetMapping("/{id}")
    public DailyLogResponse get(@PathVariable Long id) {
        return DailyLogResponse.from(dailyLogService.findById(SecurityUtils.currentUserId(), id));
    }

    @PostMapping
    public ResponseEntity<DailyLogResponse> create(@Valid @RequestBody DailyLogRequest request) {
        DailyLogResponse body = DailyLogResponse.from(
                dailyLogService.create(SecurityUtils.currentUserId(), request));
        return ResponseEntity.status(HttpStatus.CREATED).body(body);
    }

    @PostMapping("/merge")
    public ResponseEntity<DailyLogResponse> merge(@Valid @RequestBody DailyLogRequest request) {
        DailyLogResponse body = DailyLogResponse.from(
                dailyLogService.merge(SecurityUtils.currentUserId(), request));
        return ResponseEntity.status(HttpStatus.OK).body(body);
    }

    @PutMapping("/{id}")
    public DailyLogResponse update(@PathVariable Long id, @Valid @RequestBody DailyLogRequest request) {
        return DailyLogResponse.from(dailyLogService.update(SecurityUtils.currentUserId(), id, request));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        dailyLogService.delete(SecurityUtils.currentUserId(), id);
        return ResponseEntity.noContent().build();
    }
}
