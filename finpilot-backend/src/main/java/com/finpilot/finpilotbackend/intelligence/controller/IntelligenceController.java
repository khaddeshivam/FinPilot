package com.finpilot.finpilotbackend.intelligence.controller;

import com.finpilot.finpilotbackend.identity.entity.User;
import com.finpilot.finpilotbackend.intelligence.dto.AskDtos.AskRequest;
import com.finpilot.finpilotbackend.intelligence.dto.AskDtos.AskResponse;
import com.finpilot.finpilotbackend.intelligence.dto.HealthScoreResponse;
import com.finpilot.finpilotbackend.intelligence.dto.InsightResponse;
import com.finpilot.finpilotbackend.intelligence.dto.NarrativeResponse;
import com.finpilot.finpilotbackend.intelligence.service.FinanceRagService;
import com.finpilot.finpilotbackend.intelligence.service.HealthScoreService;
import com.finpilot.finpilotbackend.intelligence.service.InsightService;
import com.finpilot.finpilotbackend.intelligence.service.NarrativeService;
import jakarta.validation.Valid;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/v1/intelligence")
public class IntelligenceController {

    private final InsightService insightService;
    private final HealthScoreService healthScoreService;
    private final NarrativeService narrativeService;
    private final FinanceRagService financeRagService;

    public IntelligenceController(
            InsightService insightService,
            HealthScoreService healthScoreService,
            NarrativeService narrativeService,
            FinanceRagService financeRagService
    ) {
        this.insightService = insightService;
        this.healthScoreService = healthScoreService;
        this.narrativeService = narrativeService;
        this.financeRagService = financeRagService;
    }

    // ?month=2026-08-01 (any date within the target month) - same convention
    // as /budgets and /dashboard. Defaults to the current month.
    @GetMapping("/insights")
    public List<InsightResponse> getInsights(
            @AuthenticationPrincipal User user,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate month
    ) {
        return insightService.generateInsights(user, resolveMonth(month));
    }

    @GetMapping("/health-score")
    public HealthScoreResponse getHealthScore(
            @AuthenticationPrincipal User user,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate month
    ) {
        return healthScoreService.calculate(user, resolveMonth(month));
    }

    // Returns 503 (see GlobalExceptionHandler) if OPENAI_API_KEY isn't set -
    // this is an optional layer on top of the always-available insights/
    // health-score endpoints above, not a replacement for them.
    @GetMapping("/narrative")
    public NarrativeResponse getNarrative(
            @AuthenticationPrincipal User user,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate month
    ) {
        return narrativeService.generate(user, resolveMonth(month));
    }

    // The RAG endpoint - retrieves relevant transactions via embedding
    // similarity search, then generates an answer grounded in that
    // retrieved context. Distinct from /narrative: this answers an
    // arbitrary question, not a fixed monthly summary, and cites the
    // specific transactions used.
    @PostMapping("/ask")
    public AskResponse ask(
            @AuthenticationPrincipal User user,
            @Valid @RequestBody AskRequest request
    ) {
        return financeRagService.answer(user, request.getQuestion());
    }

    private LocalDate resolveMonth(LocalDate month) {
        return (month != null) ? month : LocalDate.now();
    }
}
