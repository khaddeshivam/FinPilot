package com.finpilot.finpilotbackend.identity.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "refresh_tokens")
public class RefreshToken {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(nullable = false, unique = true, length = 500)
    private String token;

    // All tokens descended from one login share a family. Rotation copies the
    // parent's familyId; a new login generates a new one. Revoking by family
    // kills every token in the session, including ones already rotated out.
    @Column(name = "family_id", nullable = false, updatable = false)
    private UUID familyId;

    @Column(name = "expires_at", nullable = false)
    private LocalDateTime expiresAt;

    @Column(nullable = false)
    private boolean revoked = false;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
    }

    public RefreshToken() {
    }

    // Starts a brand-new family (used on login).
    public RefreshToken(User user, String token, LocalDateTime expiresAt) {
        this(user, token, expiresAt, UUID.randomUUID());
    }

    // Joins an existing family (used on rotation).
    public RefreshToken(User user, String token, LocalDateTime expiresAt, UUID familyId) {
        this.user = user;
        this.token = token;
        this.expiresAt = expiresAt;
        this.familyId = familyId;
    }

    public Long getId() {
        return id;
    }

    public User getUser() {
        return user;
    }

    public String getToken() {
        return token;
    }

    public UUID getFamilyId() {
        return familyId;
    }

    public LocalDateTime getExpiresAt() {
        return expiresAt;
    }

    public boolean isRevoked() {
        return revoked;
    }

    public void setRevoked(boolean revoked) {
        this.revoked = revoked;
    }

    public boolean isExpired() {
        return LocalDateTime.now().isAfter(expiresAt);
    }
}
