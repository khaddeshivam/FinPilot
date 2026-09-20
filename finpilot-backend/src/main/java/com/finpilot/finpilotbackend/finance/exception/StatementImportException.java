package com.finpilot.finpilotbackend.finance.exception;

// Thrown when the uploaded file itself can't be read as CSV at all - a
// separate, coarser failure from a single bad row (which is handled
// per-row inside StatementImportService and reported in the summary,
// not thrown).
public class StatementImportException extends RuntimeException {
    public StatementImportException(String message) {
        super(message);
    }
}
