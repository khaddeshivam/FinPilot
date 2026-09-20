package com.finpilot.finpilotbackend.planning.controller;

import com.finpilot.finpilotbackend.identity.entity.User;
import com.finpilot.finpilotbackend.planning.dto.BudgetDtos.BudgetResponse;
import com.finpilot.finpilotbackend.planning.dto.BudgetDtos.SetBudgetRequest;
import com.finpilot.finpilotbackend.planning.service.BudgetService;
import jakarta.validation.Valid;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/v1/budgets")
public class BudgetController {

    private final BudgetService budgetService;

    public BudgetController(BudgetService budgetService) {
        this.budgetService = budgetService;
    }

    // POST because this is "create-or-update" (upsert) - a budget for the
    // same category/month is replaced, not duplicated. See BudgetService.
    @PostMapping
    public ResponseEntity<BudgetResponse> setBudget(
            @AuthenticationPrincipal User user,
            @Valid @RequestBody SetBudgetRequest request
    ) {
        return ResponseEntity.ok(budgetService.setBudget(user, request));
    }

    // ?month=2026-08-01 (or any date within the target month) - defaults to
    // the current month if omitted.
    @GetMapping
    public List<BudgetResponse> list(
            @AuthenticationPrincipal User user,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate month
    ) {
        LocalDate target = (month != null) ? month : LocalDate.now();
        return budgetService.listForMonth(user, target);
    }
}
