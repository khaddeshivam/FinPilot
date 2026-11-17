package com.finpilot.finpilotbackend.identity.exception;
public class RateLimitExceededException extends RuntimeException { public RateLimitExceededException(){super("Too many requests. Please wait before trying again.");} }
