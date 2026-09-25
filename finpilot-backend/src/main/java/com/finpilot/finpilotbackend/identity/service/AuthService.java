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
        String email = request.getEmail().trim().toLowerCase();
        User user = userRepository.findByEmail(email)
                .orElseThrow(InvalidCredentialsException::new);

        if (!passwordEncoder.matches(request.getPassword(), user.getPassword())) {
            throw new InvalidCredentialsException();
        }

        String accessToken = jwtService.generateAccessToken(user);
        RefreshToken refreshToken = issueRefreshToken(user);

        return new AuthResponse(accessToken, refreshToken.getToken());
    }

    // Revoke the supplied refresh token so it can never be replayed.
    // Best-effort: if the token doesn't exist we still succeed silently -
    // the client-side session is gone either way.
    @Transactional
    public void logout(String rawRefreshToken) {
        refreshTokenRepository.findByToken(rawRefreshToken).ifPresent(token -> {
            token.setRevoked(true);
            refreshTokenRepository.save(token);
        });
    }

    @Transactional
    public AuthResponse refresh(String rawRefreshToken) {
        RefreshToken existing = refreshTokenRepository.findByToken(rawRefreshToken)
                .orElseThrow(() -> new InvalidRefreshTokenException("Refresh token not found"));

        if (existing.isRevoked()) {
            throw new InvalidRefreshTokenException("Refresh token has been revoked");
        }
        if (existing.isExpired()) {
            throw new InvalidRefreshTokenException("Refresh token has expired");
        }

        // Rotate: revoke the used token, issue a new one.
        // This means a stolen-and-reused refresh token gets invalidated on the
        // legitimate user's next real refresh - a stronger posture than letting
        // the same refresh token be reused indefinitely.
        existing.setRevoked(true);
        refreshTokenRepository.save(existing);

        User user = existing.getUser();
        String newAccessToken = jwtService.generateAccessToken(user);
        RefreshToken newRefreshToken = issueRefreshToken(user);

        return new AuthResponse(newAccessToken, newRefreshToken.getToken());
    }

    private RefreshToken issueRefreshToken(User user) {
        byte[] randomBytes = new byte[64];
        secureRandom.nextBytes(randomBytes);
        String token = Base64.getUrlEncoder().withoutPadding().encodeToString(randomBytes);

        LocalDateTime expiresAt = LocalDateTime.now().plusSeconds(refreshTokenExpirationMs / 1000);
        RefreshToken refreshToken = new RefreshToken(user, token, expiresAt);
        return refreshTokenRepository.save(refreshToken);
    }
}
