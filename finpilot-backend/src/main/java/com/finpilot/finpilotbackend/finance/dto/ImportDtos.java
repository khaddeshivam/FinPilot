package com.finpilot.finpilotbackend.finance.dto;

import java.util.List;

public class ImportDtos {

    public static class RowResult {
        private final int rowNumber;
        private final boolean imported;
        private final String description;
        private final String categoryName; // null if skipped
        private final String reason;       // null if imported

        private RowResult(int rowNumber, boolean imported, String description, String categoryName, String reason) {
            this.rowNumber = rowNumber;
            this.imported = imported;
            this.description = description;
            this.categoryName = categoryName;
            this.reason = reason;
        }

        public static RowResult imported(int rowNumber, String description, String categoryName) {
            return new RowResult(rowNumber, true, description, categoryName, null);
        }

        public static RowResult skipped(int rowNumber, String reason) {
            return new RowResult(rowNumber, false, null, null, reason);
        }

        public int getRowNumber() {
            return rowNumber;
        }

        public boolean isImported() {
            return imported;
        }

        public String getDescription() {
            return description;
        }

        public String getCategoryName() {
            return categoryName;
        }

        public String getReason() {
            return reason;
        }
    }

    public static class ImportSummaryResponse {
        private final int totalRows;
        private final int importedCount;
        private final int skippedCount;
        private final List<RowResult> rows;

        public ImportSummaryResponse(int totalRows, int importedCount, int skippedCount, List<RowResult> rows) {
            this.totalRows = totalRows;
            this.importedCount = importedCount;
            this.skippedCount = skippedCount;
            this.rows = rows;
        }

        public int getTotalRows() {
            return totalRows;
        }

        public int getImportedCount() {
            return importedCount;
        }

        public int getSkippedCount() {
            return skippedCount;
        }

        public List<RowResult> getRows() {
            return rows;
        }
    }
}
