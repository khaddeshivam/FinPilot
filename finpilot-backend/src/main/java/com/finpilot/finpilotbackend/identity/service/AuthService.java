package com.finpilot.finpilotbackend.identity.service;

import com.finpilot.finpilotbackend.identity.dto.AuthResponse;
import com.finpilot.finpilotbackend.identity.dto.LoginRequest;
import com.finpilot.finpilotbackend.identity.entity.RefreshToken;
import com.finpilot.finpilotbackend.identity.entity.User;
import com.finpilot.finpilotbackend.identity.exception.InvalidCredentialsException;
import com.finpilot.finpilotbackend.identity.exception.InvalidRefreshTokenException;
import com.finpilot.finpilotbackend.identity.repository.RefreshTokenRepository;
import com.finpilot.finpilotbackend.identity.repository.UserRepository;
import com.finpilot.finpilotbackend.identity.security.JwtService;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.Base64;
import java.util.Locale;
import java.util.UUID;

@Service
public class AuthService {

    private final UserRepository userRepository;
    private final RefreshTokenRepository refreshTokenRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final long refreshTokenExpirationMs;
    private final SecureRandom secureRandom = new SecureRandom();

    public AuthService(
            UserRepository userRepository,
            RefreshTokenRepository refreshTokenRepository,
            PasswordEncoder passwordEncoder,
            JwtService jwtService,
            @Value("${app.jwt.refresh-token-expiration-ms}") long refreshTokenExpirationMs
    ) {
        this.userRepository = userRepository;
        this.refreshTokenRepository = refreshTokenRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
        this.refreshTokenExpirationMs = refreshTokenExpirationMs;
    }

    @Transactional
    public AuthResponse login(LoginRequest request) {
        // Normalise email on login to match the normalised value stored at
        // registration - so "User@example.com" finds the same account as "user@example.com".
        // Locale.ROOT prevents the Turkish-locale dotless-i problem (same fix
        // as UserService.register) so login always finds the normalised address.
        String email = request.getEmail().trim().toLowerCase(Locale.ROOT);
        User user = userRepository.findByEmail(email)
                .orElseThrow(InvalidCredentialsException::new);

        if (!passwordEncoder.matches(request.getPassword(), user.getPassword())) {
            throw new InvalidCredentialsException();
        }

        String accessToken = jwtService.generateAccessToken(user);
        // A login starts a new token family; every rotation of this session's
        // refresh token will inherit it.
        RefreshToken refreshToken = issueRefreshToken(user, UUID.randomUUID());

        return new AuthResponse(accessToken, refreshToken.getToken());
    }

    // Revokes the WHOLE family of the supplied token, not just the token itself.
    // Rotation means the presented token is usually the newest one, but older
    // ones in the chain (or a copy an attacker rotated first) must die too.
    // Best-effort: an unknown token still succeeds silently - the client-side
    // session is gone either way.
    @Transactional
    public void logout(String rawRefreshToken) {
        refreshTokenRepository.findByToken(rawRefreshToken)
                .ifPresent(token -> refreshTokenRepository.revokeFamily(token.getFamilyId()));
    }

    // noRollbackFor is load-bearing: on reuse detection we revoke the family and
    // THEN throw. Without it, Spring would roll the transaction back on the
    // exception and silently undo the revocation we just made.
    @Transactional(noRollbackFor = InvalidRefreshTokenException.class)
    public AuthResponse refresh(String rawRefreshToken) {
        // Row lock: concurrent refreshes of the same token are serialised.
        RefreshToken existing = refreshTokenRepository.findByTokenForUpdate(rawRefreshToken)
                .orElseThrow(() -> new InvalidRefreshTokenException("Refresh token not found"));

        if (existing.isRevoked()) {
            // A rotated-out (or logged-out) token is being presented again.
            // Either the legitimate client or an attacker holds a stale copy and
            // we cannot tell which, so kill the whole session. The legitimate
            // user simply logs in again; an attacker loses access.
            refreshTokenRepository.revokeFamily(existing.getFamilyId());
            throw new InvalidRefreshTokenException("Refresh token has been revoked");
        }
        if (existing.isExpired()) {
            throw new InvalidRefreshTokenException("Refresh token has expired");
        }

        // Rotate: revoke the used token, issue a successor in the same family.
        existing.setRevoked(true);
        refreshTokenRepository.save(existing);

        User user = existing.getUser();
        String newAccessToken = jwtService.generateAccessToken(user);
        RefreshToken newRefreshToken = issueRefreshToken(user, existing.getFamilyId());

        return new AuthResponse(newAccessToken, newRefreshToken.getToken());
    }

    private RefreshToken issueRefreshToken(User user, UUID familyId) {
        byte[] randomBytes = new byte[64];
        secureRandom.nextBytes(randomBytes);
        String token = Base64.getUrlEncoder().withoutPadding().encodeToString(randomBytes);

        LocalDateTime expiresAt = LocalDateTime.now().plusSeconds(refreshTokenExpirationMs / 1000);
        RefreshToken refreshToken = new RefreshToken(user, token, expiresAt, familyId);
        return refreshTokenRepository.save(refreshToken);
    }
}
