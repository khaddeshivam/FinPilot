import { apiClient } from '../../../lib/apiClient';
import type { CategoryType } from '../../accounts/api/categoriesApi';

// Mirrors finance/dto/TransactionDtos.java exactly.

export interface CreateTransactionRequest {
  accountId: number;
  categoryId: number;
  transactionType: CategoryType;
  amount: number;
  description?: string;
  transactionDate: string; // ISO date, e.g. "2026-08-16"
}

export interface TransactionResponse {
  id: number;
  accountId: number;
  categoryId: number;
  categoryName: string;
  transactionType: CategoryType;
  amount: number;
  description: string | null;
  transactionDate: string;
  createdAt: string;
}

// Mirrors finance/dto/CategoryPredictionResponse.java.
export interface CategoryPrediction {
  categoryId: number;
  categoryName: string;
  confidence: number;
}

// Mirrors finance/dto/ImportDtos.java exactly.
export interface ImportRowResult {
  rowNumber: number;
  imported: boolean;
  description: string | null;
  categoryName: string | null;
  reason: string | null;
}

export interface ImportSummaryResponse {
  totalRows: number;
  importedCount: number;
  skippedCount: number;
  rows: ImportRowResult[];
}

export async function listTransactions(): Promise<TransactionResponse[]> {
  const response = await apiClient.get<TransactionResponse[]>('/transactions');
  return response.data;
}

export async function createTransaction(data: CreateTransactionRequest): Promise<TransactionResponse> {
  const response = await apiClient.post<TransactionResponse>('/transactions', data);
  return response.data;
}

// The backend expects CSV rows as Date,Description,Amount (positive =
// income, negative = expense) and matches TransactionService's own
// validation/balance-update path per row - see StatementImportService.
// Content-Type is deliberately NOT set manually: axios derives the correct
// multipart boundary from the FormData object itself, and overriding it
// breaks the upload.
export async function importStatement(accountId: number, file: File): Promise<ImportSummaryResponse> {
  const formData = new FormData();
  formData.append('file', file);
  const response = await apiClient.post<ImportSummaryResponse>('/transactions/import', formData, {
    params: { accountId },
  });
  return response.data;
}

// The backend returns 204 No Content (not an error) when there isn't enough
// history yet to predict confidently - that's a normal, expected outcome,
// so this resolves to null rather than throwing in that case.
export async function suggestCategory(description: string, type: CategoryType): Promise<CategoryPrediction | null> {
  const response = await apiClient.get<CategoryPrediction>('/transactions/suggest-category', {
    params: { description, type },
  });
  return response.status === 204 ? null : response.data;
}
