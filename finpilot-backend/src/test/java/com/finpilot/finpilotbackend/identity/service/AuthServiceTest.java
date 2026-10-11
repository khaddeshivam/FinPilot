package com.finpilot.finpilotbackend.identity.service;

import com.finpilot.finpilotbackend.identity.dto.AuthResponse;
import com.finpilot.finpilotbackend.identity.entity.RefreshToken;
import com.finpilot.finpilotbackend.identity.entity.User;
import com.finpilot.finpilotbackend.identity.exception.InvalidRefreshTokenException;
import com.finpilot.finpilotbackend.identity.repository.RefreshTokenRepository;
import com.finpilot.finpilotbackend.identity.repository.UserRepository;
import com.finpilot.finpilotbackend.identity.security.JwtService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

// Pins down the refresh-token family behaviour (issue #3): rotation keeps the
// family, logout and reuse detection revoke it. The transactional rollback
// semantics (noRollbackFor) need a real Spring context and are not covered here.
@ExtendWith(MockitoExtension.class)
class AuthServiceTest {

    @Mock
    private UserRepository userRepository;
    @Mock
    private RefreshTokenRepository refreshTokenRepository;
    @Mock
    private PasswordEncoder passwordEncoder;
    @Mock
    private JwtService jwtService;

    private AuthService authService;
    private User user;

    @BeforeEach
    void setUp() {
        authService = new AuthService(userRepository, refreshTokenRepository, passwordEncoder, jwtService, 604_800_000L);
        user = new User("user@example.com", "hashed", "Test User");
    }

    @Test
    void refreshRotatesTokenAndKeepsTheSameFamily() {
        RefreshToken existing = activeToken("old-token");
        when(refreshTokenRepository.findByTokenForUpdate("old-token")).thenReturn(Optional.of(existing));
        when(refreshTokenRepository.save(any(RefreshToken.class))).thenAnswer(inv -> inv.getArgument(0));
        when(jwtService.generateAccessToken(any())).thenReturn("new-access");

        AuthResponse response = authService.refresh("old-token");

        ArgumentCaptor<RefreshToken> saved = ArgumentCaptor.forClass(RefreshToken.class);
        verify(refreshTokenRepository, times(2)).save(saved.capture());
        RefreshToken successor = saved.getAllValues().get(1);

        assertThat(existing.isRevoked()).isTrue();
        assertThat(successor.isRevoked()).isFalse();
        assertThat(successor.getFamilyId()).isEqualTo(existing.getFamilyId());
        assertThat(successor.getToken()).isNotEqualTo("old-token");
        assertThat(response.getRefreshToken()).isEqualTo(successor.getToken());
        verify(refreshTokenRepository, never()).revokeFamily(any());
    }

    @Test
    void reusingARevokedTokenRevokesTheWholeFamilyAndIssuesNothing() {
        RefreshToken stale = activeToken("stale-token");
        stale.setRevoked(true);
        when(refreshTokenRepository.findByTokenForUpdate("stale-token")).thenReturn(Optional.of(stale));

        assertThatThrownBy(() -> authService.refresh("stale-token"))
                .isInstanceOf(InvalidRefreshTokenException.class)
                .hasMessageContaining("revoked");

        verify(refreshTokenRepository).revokeFamily(stale.getFamilyId());
        verify(refreshTokenRepository, never()).save(any());
    }

    @Test
    void expiredTokenIsRejectedWithoutTriggeringFamilyRevocation() {
        RefreshToken expired = new RefreshToken(user, "expired-token", LocalDateTime.now().minusMinutes(1));
        when(refreshTokenRepository.findByTokenForUpdate("expired-token")).thenReturn(Optional.of(expired));

        assertThatThrownBy(() -> authService.refresh("expired-token"))
                .isInstanceOf(InvalidRefreshTokenException.class)
                .hasMessageContaining("expired");

        verify(refreshTokenRepository, never()).revokeFamily(any());
        verify(refreshTokenRepository, never()).save(any());
    }

    @Test
    void unknownTokenIsRejected() {
        when(refreshTokenRepository.findByTokenForUpdate("nope")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> authService.refresh("nope"))
                .isInstanceOf(InvalidRefreshTokenException.class);

        verify(refreshTokenRepository, never()).revokeFamily(any());
    }

    @Test
    void logoutRevokesTheEntireFamilyNotJustThePresentedToken() {
        RefreshToken current = activeToken("current-token");
        when(refreshTokenRepository.findByToken("current-token")).thenReturn(Optional.of(current));

        authService.logout("current-token");

        verify(refreshTokenRepository).revokeFamily(current.getFamilyId());
    }

    @Test
    void logoutWithUnknownTokenSucceedsSilently() {
        when(refreshTokenRepository.findByToken("nope")).thenReturn(Optional.empty());

        authService.logout("nope");

        verify(refreshTokenRepository, never()).revokeFamily(any());
    }

    @Test
    void separateLoginsGetSeparateFamilies() {
        // Logging out one session must not kill another device's session.
        RefreshToken a = activeToken("token-a");
        RefreshToken b = activeToken("token-b");

        assertThat(List.of(a.getFamilyId(), b.getFamilyId())).doesNotHaveDuplicates();
        assertThat(a.getFamilyId()).isNotEqualTo(UUID.fromString("00000000-0000-0000-0000-000000000000"));
    }

    private RefreshToken activeToken(String value) {
        return new RefreshToken(user, value, LocalDateTime.now().plusDays(7));
    }
}
