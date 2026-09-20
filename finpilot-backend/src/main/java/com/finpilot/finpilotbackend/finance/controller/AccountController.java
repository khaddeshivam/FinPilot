package com.finpilot.finpilotbackend.finance.controller;

import com.finpilot.finpilotbackend.finance.dto.AccountDtos.AccountResponse;
import com.finpilot.finpilotbackend.finance.dto.AccountDtos.CreateAccountRequest;
import com.finpilot.finpilotbackend.finance.service.AccountService;
import com.finpilot.finpilotbackend.identity.entity.User;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/accounts")
public class AccountController {

    private final AccountService accountService;

    public AccountController(AccountService accountService) {
        this.accountService = accountService;
    }

    @PostMapping
    public ResponseEntity<AccountResponse> create(
            @AuthenticationPrincipal User user,
            @Valid @RequestBody CreateAccountRequest request
    ) {
        return ResponseEntity.status(HttpStatus.CREATED).body(accountService.create(user, request));
    }

    @GetMapping
    public List<AccountResponse> list(@AuthenticationPrincipal User user) {
        return accountService.listForUser(user);
    }

    @GetMapping("/{id}")
    public AccountResponse getOne(@AuthenticationPrincipal User user, @PathVariable Long id) {
        return accountService.getOne(user, id);
    }
}
