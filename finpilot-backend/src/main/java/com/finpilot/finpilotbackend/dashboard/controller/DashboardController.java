package com.finpilot.finpilotbackend.dashboard.controller;

import com.finpilot.finpilotbackend.dashboard.dto.DashboardResponse;
import com.finpilot.finpilotbackend.dashboard.dto.MonthlyTrendResponse;
import com.finpilot.finpilotbackend.dashboard.service.DashboardService;
import com.finpilot.finpilotbackend.identity.entity.User;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/v1/dashboard")
public class DashboardController {

    private final DashboardService dashboardService;

    public DashboardController(DashboardService dashboardService) {
        this.dashboardService = dashboardService;
    }

    // ?month=2026-08-01 (any date within the target month) - defaults to the
    // current month if omitted, same convention as /api/v1/budgets.
    @GetMapping
    public DashboardResponse getSummary(
            @AuthenticationPrincipal User user,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate month
    ) {
        LocalDate target = (month != null) ? month : LocalDate.now();
        return dashboardService.getSummary(user, target);
    }

    // ?months=6 - defaults to 6, capped to a sane range so a client can't
    // accidentally request an expensive 500-month series.
    @GetMapping("/trends")
    public List<MonthlyTrendResponse> getTrends(
            @AuthenticationPrincipal User user,
            @RequestParam(required = false) Integer months
    ) {
        int requested = (months != null) ? months : 6;
        int clamped = Math.max(1, Math.min(requested, 12));
        return dashboardService.getTrends(user, clamped);
    }
}
