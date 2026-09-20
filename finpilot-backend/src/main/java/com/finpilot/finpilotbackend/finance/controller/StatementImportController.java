package com.finpilot.finpilotbackend.finance.controller;

import com.finpilot.finpilotbackend.finance.dto.ImportDtos.ImportSummaryResponse;
import com.finpilot.finpilotbackend.finance.service.StatementImportService;
import com.finpilot.finpilotbackend.identity.entity.User;
import org.springframework.http.MediaType;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/v1/transactions")
public class StatementImportController {

    private final StatementImportService statementImportService;

    public StatementImportController(StatementImportService statementImportService) {
        this.statementImportService = statementImportService;
    }

    // Expects a CSV with header row: Date,Description,Amount
    // Date: YYYY-MM-DD. Amount: positive = income, negative = expense.
    // Every row that fails to parse or fails validation is skipped and
    // reported individually in the response - one bad row never aborts
    // the whole import.
    @PostMapping(value = "/import", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ImportSummaryResponse importStatement(
            @AuthenticationPrincipal User user,
            @RequestParam Long accountId,
            @RequestParam MultipartFile file
    ) {
        return statementImportService.importCsv(user, accountId, file);
    }
}
