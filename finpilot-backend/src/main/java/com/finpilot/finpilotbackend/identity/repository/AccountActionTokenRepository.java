package com.finpilot.finpilotbackend.identity.repository;

import com.finpilot.finpilotbackend.identity.entity.AccountActionToken;
import com.finpilot.finpilotbackend.identity.entity.AccountActionType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.Optional;

public interface AccountActionTokenRepository extends JpaRepository<AccountActionToken, Long> {
    Optional<AccountActionToken> findByTokenHashAndActionType(String tokenHash, AccountActionType actionType);
    @Modifying(flushAutomatically = true)
    @Query("UPDATE AccountActionToken t SET t.usedAt = CURRENT_TIMESTAMP WHERE t.user.id = :userId AND t.actionType = :type AND t.usedAt IS NULL")
    int invalidateActiveForUser(@Param("userId") Long userId, @Param("type") AccountActionType type);
}
