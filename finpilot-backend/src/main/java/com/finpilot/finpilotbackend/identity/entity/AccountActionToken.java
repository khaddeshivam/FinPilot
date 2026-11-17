package com.finpilot.finpilotbackend.identity.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "account_action_tokens")
public class AccountActionToken {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "user_id", nullable = false) private User user;
    @Column(name = "token_hash", nullable = false, unique = true, length = 64) private String tokenHash;
    @Enumerated(EnumType.STRING) @Column(name = "action_type", nullable = false, length = 32) private AccountActionType actionType;
    @Column(name = "expires_at", nullable = false) private LocalDateTime expiresAt;
    @Column(name = "used_at") private LocalDateTime usedAt;
    @Column(name = "created_at", nullable = false, updatable = false) private LocalDateTime createdAt;
    protected AccountActionToken() { }
    public AccountActionToken(User user, String tokenHash, AccountActionType actionType, LocalDateTime expiresAt) { this.user = user; this.tokenHash = tokenHash; this.actionType = actionType; this.expiresAt = expiresAt; }
    @PrePersist void onCreate() { createdAt = LocalDateTime.now(); }
    public User getUser() { return user; }
    public String getTokenHash() { return tokenHash; }
    public AccountActionType getActionType() { return actionType; }
    public boolean isUsable() { return usedAt == null && LocalDateTime.now().isBefore(expiresAt); }
    public void markUsed() { usedAt = LocalDateTime.now(); }
}
