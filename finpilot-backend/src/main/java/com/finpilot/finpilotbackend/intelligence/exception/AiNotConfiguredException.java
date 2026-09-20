package com.finpilot.finpilotbackend.intelligence.exception;

// Thrown when OPENAI_API_KEY isn't set - a missing optional feature should
// return a clear, honest message, not a 500 stack trace or a silent failure.
public class AiNotConfiguredException extends RuntimeException {
    public AiNotConfiguredException(String message) {
        super(message);
    }
}
