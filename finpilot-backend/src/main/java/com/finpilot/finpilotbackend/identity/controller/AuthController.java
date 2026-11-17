package com.finpilot.finpilotbackend.identity.controller;

import com.finpilot.finpilotbackend.identity.dto.*;
import com.finpilot.finpilotbackend.identity.service.AuthService;
import com.finpilot.finpilotbackend.identity.service.UserService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import jakarta.servlet.http.HttpServletRequest;
import com.finpilot.finpilotbackend.identity.service.RecoveryRateLimiter;
import com.finpilot.finpilotbackend.identity.exception.RateLimitExceededException;

@RestController
@RequestMapping("/api/v1/auth")
public class AuthController {

    private final UserService userService;
    private final AuthService authService;
    private final AccountActionService accountActionService;
    private final RecoveryRateLimiter recoveryRateLimiter;

    public AuthController(UserService userService, AuthService authService, AccountActionService accountActionService, RecoveryRateLimiter recoveryRateLimiter) {
        this.userService = userService;
        this.authService = authService;
        this.accountActionService = accountActionService;
        this.recoveryRateLimiter = recoveryRateLimiter;
    }

    @PostMapping("/register")
    public ResponseEntity<UserResponse> register(@Valid @RequestBody RegisterRequest request) {
        UserResponse response = userService.register(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @PostMapping("/login")
    public ResponseEntity<AuthResponse> login(@Valid @RequestBody LoginRequest request) {
        AuthResponse response = authService.login(request);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/refresh")
    public ResponseEntity<AuthResponse> refresh(@Valid @RequestBody RefreshRequest request) {
        AuthResponse response = authService.refresh(request.getRefreshToken());
        return ResponseEntity.ok(response);
    }

    // Revokes the refresh token server-side so it can never be replayed.
    // Returns 204 No Content regardless of whether the token was found -
    // the caller's goal (end the session) is achieved either way.
    @PostMapping("/logout")
    public ResponseEntity<Void> logout(@Valid @RequestBody LogoutRequest request) {
        authService.logout(request.getRefreshToken());
        return ResponseEntity.noContent().build();
    }

    // Same response regardless of account existence prevents email enumeration.
    @PostMapping("/password-reset/request")
    public ResponseEntity<Void> requestPasswordReset(@Valid @RequestBody PasswordResetRequest request, HttpServletRequest httpRequest) {
        rateLimit(httpRequest, request.getEmail());
        accountActionService.requestPasswordReset(request.getEmail());
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/password-reset/confirm")
    public ResponseEntity<Void> confirmPasswordReset(@Valid @RequestBody PasswordResetConfirmRequest request) {
        accountActionService.resetPassword(request.getToken(), request.getPassword());
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/email-verification/confirm")
    public ResponseEntity<Void> confirmEmailVerification(@Valid @RequestBody TokenRequest request) {
        accountActionService.verifyEmail(request.getToken());
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/email-verification/resend")
    public ResponseEntity<Void> resendEmailVerification(@Valid @RequestBody PasswordResetRequest request, HttpServletRequest httpRequest) {
        rateLimit(httpRequest, request.getEmail());
        accountActionService.resendVerification(request.getEmail());
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/oauth/exchange")
    public ResponseEntity<AuthResponse> exchangeOAuthCode(@Valid @RequestBody TokenRequest request) {
        return ResponseEntity.ok(authService.issueSession(accountActionService.consumeOauthExchange(request.getToken())));
    }

    private void rateLimit(HttpServletRequest request, String email) {
        if (!recoveryRateLimiter.tryAcquire(request.getRemoteAddr() + ":" + email.trim().toLowerCase())) throw new RateLimitExceededException();
    }
}
