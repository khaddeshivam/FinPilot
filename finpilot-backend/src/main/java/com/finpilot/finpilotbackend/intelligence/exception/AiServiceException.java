package com.finpilot.finpilotbackend.intelligence.exception;

// Thrown when the OpenAI API call itself fails (network issue, rate limit,
// OpenAI outage) - the rule-based insights and health score underneath this
// still work fine even if this fails, so this is deliberately a narrow
// failure that shouldn't take down anything else.
public class AiServiceException extends RuntimeException {
    public AiServiceException(String message, Throwable cause) {
        super(message, cause);
    }
}
