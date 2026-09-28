package com.finpilot.finpilotbackend.identity.service;

import com.finpilot.finpilotbackend.identity.dto.RegisterRequest;
import com.finpilot.finpilotbackend.identity.entity.User;
import com.finpilot.finpilotbackend.identity.exception.EmailAlreadyExistsException;
import com.finpilot.finpilotbackend.identity.repository.UserRepository;
import org.hibernate.exception.ConstraintViolationException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.sql.SQLException;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.when;

// Verifies the two key invariants of UserService.register:
//
// 1. A duplicate-email constraint violation (TOCTOU race) is translated to
//    EmailAlreadyExistsException (409 Conflict).
// 2. An unrelated constraint violation (e.g. full_name too long) is NOT
//    swallowed and misreported as an email conflict — it re-throws as
//    DataIntegrityViolationException so the caller gets a correct 500 / 400.
//
// Validation-layer rejections (@Size etc.) are enforced before the service is
// called in the real request path, but these unit tests drive the service
// directly to cover the catch block logic independently.
@ExtendWith(MockitoExtension.class)
// LENIENT: passwordEncoder.encode is stubbed in setUp for tests that reach the
// save() call, but existingEmailCheckReturnsEmailAlreadyExistsBeforeInsert throws
// before encoding. LENIENT avoids an UnnecessaryStubbingException in that test
// without duplicating the stub in each method.
@MockitoSettings(strictness = Strictness.LENIENT)
class UserServiceTest {

    @Mock
    private UserRepository userRepository;
    @Mock
    private PasswordEncoder passwordEncoder;

    private UserService userService;

    @BeforeEach
    void setUp() {
        userService = new UserService(userRepository, passwordEncoder);
        // Stubbed LENIENT because the "email already exists" test throws before
        // reaching passwordEncoder.encode — see @MockitoSettings above.
        when(passwordEncoder.encode(anyString())).thenReturn("hashed");
    }

    @Test
    void duplicateEmailConstraintViolationMapsToEmailAlreadyExistsException() {
        // Simulate two concurrent registrations: the first existsByEmail check
        // passes (returns false), but the insert hits the unique index.
        when(userRepository.existsByEmail(anyString())).thenReturn(false);
        DataIntegrityViolationException dive = emailConstraintViolation();
        when(userRepository.save(any(User.class))).thenThrow(dive);

        assertThatThrownBy(() -> userService.register(validRequest()))
                .isInstanceOf(EmailAlreadyExistsException.class);
    }

    @Test
    void unrelatedConstraintViolationIsNotMisreportedAsEmailConflict() {
        // Simulate a constraint unrelated to email (e.g. full_name column length
        // exceeded at the DB level). This must NOT be converted to a 409 email
        // conflict — it should re-throw so the caller receives the real error.
        when(userRepository.existsByEmail(anyString())).thenReturn(false);
        DataIntegrityViolationException dive = nonEmailConstraintViolation();
        when(userRepository.save(any(User.class))).thenThrow(dive);

        assertThatThrownBy(() -> userService.register(validRequest()))
                .isInstanceOf(DataIntegrityViolationException.class)
                .isNotInstanceOf(EmailAlreadyExistsException.class);
    }

    @Test
    void existingEmailCheckReturnsEmailAlreadyExistsBeforeInsert() {
        // The common (non-race) path: email is already in the DB, detected
        // before the insert attempt.
        when(userRepository.existsByEmail(anyString())).thenReturn(true);

        assertThatThrownBy(() -> userService.register(validRequest()))
                .isInstanceOf(EmailAlreadyExistsException.class);
    }

    // Builds a valid RegisterRequest — field values are only minimal-correct
    // (8-char password, non-empty name) since validation annotations are not
    // enforced in a plain unit test (no Spring context).
    private static RegisterRequest validRequest() {
        RegisterRequest req = new RegisterRequest();
        req.setEmail("user@example.com");
        req.setPassword("password1");
        req.setFullName("Test User");
        return req;
    }

    private static DataIntegrityViolationException emailConstraintViolation() {
        ConstraintViolationException cve = new ConstraintViolationException(
                "duplicate key", new SQLException(), "uq_users_email_lower");
        return new DataIntegrityViolationException("duplicate", cve);
    }

    private static DataIntegrityViolationException nonEmailConstraintViolation() {
        ConstraintViolationException cve = new ConstraintViolationException(
                "value too long", new SQLException(), "users_full_name_length");
        return new DataIntegrityViolationException("length", cve);
    }
}
