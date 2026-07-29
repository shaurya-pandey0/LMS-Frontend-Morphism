package com.lifetrack.controller;

import com.lifetrack.dto.InsightDtos.InsightsResponse;
import com.lifetrack.security.SecurityUtils;
import com.lifetrack.service.InsightService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/insights")
public class InsightController {

    private final InsightService insightService;

    public InsightController(InsightService insightService) {
        this.insightService = insightService;
    }

    @GetMapping
    public InsightsResponse insights() {
        return insightService.generate(SecurityUtils.currentUserId());
    }
}
