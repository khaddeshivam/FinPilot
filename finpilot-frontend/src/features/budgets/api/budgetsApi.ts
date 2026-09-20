import { apiClient } from '../../../lib/apiClient';

// Mirrors planning/dto/BudgetDtos.java exactly.

export type BudgetStatus = 'ON_TRACK' | 'WARNING' | 'EXCEEDED';

export interface SetBudgetRequest {
  categoryId: number;
  periodMonth: string; // any date within the target month, e.g. "2026-08-01"
  amount: number;
}

export interface BudgetResponse {
  id: number;
  categoryId: number;
  categoryName: string;
  periodMonth: string;
  budgetedAmount: number;
  spentAmount: number;
  remainingAmount: number;
  percentUsed: number;
  status: BudgetStatus;
}

export async function listBudgets(month?: string): Promise<BudgetResponse[]> {
  const response = await apiClient.get<BudgetResponse[]>('/budgets', {
    params: month ? { month } : undefined,
  });
  return response.data;
}

// POST is an upsert on the backend - setting a budget for a category/month
// that already has one updates it in place rather than duplicating.
export async function setBudget(data: SetBudgetRequest): Promise<BudgetResponse> {
  const response = await apiClient.post<BudgetResponse>('/budgets', data);
  return response.data;
}
