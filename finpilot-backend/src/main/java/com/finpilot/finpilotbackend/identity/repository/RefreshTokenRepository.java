package com.finpilot.finpilotbackend.identity.repository;

import com.finpilot.finpilotbackend.identity.entity.RefreshToken;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;
import java.util.UUID;

public interface RefreshTokenRepository extends JpaRepository<RefreshToken, Long> {

    Optional<RefreshToken> findByToken(String token);

    // SELECT ... FOR UPDATE. Used by rotation so two concurrent refreshes with
    // the same token are serialised: the loser blocks until the winner commits,
    // then sees revoked = true instead of both passing the check and each
    // minting a fresh token.
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT t FROM RefreshToken t WHERE t.token = :token")
    Optional<RefreshToken> findByTokenForUpdate(@Param("token") String token);

    // Revokes every still-active token in the family in one statement.
    // clearAutomatically: the bulk UPDATE bypasses the persistence context, so
    // without clearing, already-loaded entities would keep their stale state.
    @Modifying(flushAutomatically = true, clearAutomatically = true)
    @Query("UPDATE RefreshToken t SET t.revoked = true WHERE t.familyId = :familyId AND t.revoked = false")
    int revokeFamily(@Param("familyId") UUID familyId);
}
