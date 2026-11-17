package com.finpilot.finpilotbackend.identity.service;

import org.springframework.stereotype.Service;
import java.time.Duration; import java.util.ArrayDeque; import java.util.concurrent.ConcurrentHashMap;

// Deliberately small, dependency-free protection for recovery endpoints. For a
// multi-instance deployment, replace this boundary with a shared store (e.g.
// Redis) without touching controller or action-token logic.
@Service
public class RecoveryRateLimiter {
    private static final int MAX_ATTEMPTS = 3; private static final long WINDOW_MS = Duration.ofMinutes(15).toMillis();
    private final ConcurrentHashMap<String, ArrayDeque<Long>> attempts = new ConcurrentHashMap<>();
    public boolean tryAcquire(String key) { long now=System.currentTimeMillis(); ArrayDeque<Long> bucket=attempts.computeIfAbsent(key, ignored -> new ArrayDeque<>()); synchronized(bucket) { while(!bucket.isEmpty() && now-bucket.peekFirst() > WINDOW_MS) bucket.removeFirst(); if(bucket.size()>=MAX_ATTEMPTS) return false; bucket.addLast(now); return true; } }
}
