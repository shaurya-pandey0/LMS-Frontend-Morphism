package com.lifetrack.controller;

import com.lifetrack.dto.AiContextDtos.AiContextResponse;
import com.lifetrack.security.SecurityUtils;
import com.lifetrack.service.AiContextService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * The Spring <-> AI-service seam (Phase 4).
 *
 * <p>Call this with the user's own JWT (server-to-server from the Python
 * service, forwarding the token, or directly from the frontend today).
 * Because the user id comes from {@link SecurityUtils#currentUserId()} and
 * never from a client-supplied parameter, nobody can request another user's
 * context by passing a different id/key — unlike the previous approach where
 * the browser sent a raw {@code user_key} directly to the AI service.
 */
@RestController
@RequestMapping("/api/ai-context")
public class AiContextController {

    private final AiContextService aiContextService;

    public AiContextController(AiContextService aiContextService) {
        this.aiContextService = aiContextService;
    }

    @GetMapping
    public AiContextResponse context(@RequestParam(required = false) Integer days) {
        return aiContextService.buildContext(SecurityUtils.currentUserId(), days);
    }
}
