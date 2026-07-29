package com.lifetrack.controller;

import com.lifetrack.dto.AnalyticsDtos.AdminStatsResponse;
import com.lifetrack.dto.UserDto;
import com.lifetrack.repository.UserRepository;
import com.lifetrack.service.AnalyticsService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/admin")
public class AdminController {

    private final AnalyticsService analyticsService;
    private final UserRepository userRepository;

    public AdminController(AnalyticsService analyticsService, UserRepository userRepository) {
        this.analyticsService = analyticsService;
        this.userRepository = userRepository;
    }

    @GetMapping("/stats")
    public AdminStatsResponse stats() {
        return analyticsService.adminStats();
    }

    @GetMapping("/users")
    public List<UserDto> users() {
        return userRepository.findAll().stream()
                .map(UserDto::from)
                .collect(Collectors.toList());
    }
}
