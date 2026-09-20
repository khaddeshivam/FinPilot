import { apiClient } from '../../../lib/apiClient';

// Mirrors dashboard/dto/DashboardResponse.java exactly.

export interface BudgetSummary {
  id: number;
  categoryId: number;
  categoryName: string;
  periodMonth: string;
  budgetedAmount: number;
  spentAmount: number;
  remainingAmount: number;
  percentUsed: number;
  status: 'ON_TRACK' | 'WARNING' | 'EXCEEDED';
}

export interface TransactionSummary {
  id: number;
  accountId: number;
  categoryId: number;
  categoryName: string;
  transactionType: 'INCOME' | 'EXPENSE';
  amount: number;
  description: string | null;
  transactionDate: string;
  createdAt: string;
}

export interface CategoryBreakdownItem {
  categoryName: string;
  amount: number;
}

export interface DashboardResponse {
  periodMonth: string;
  totalBalance: number;
  monthlyIncome: number;
  monthlyExpense: number;
  netSavings: number;
  budgets: BudgetSummary[];
  recentTransactions: TransactionSummary[];
  expenseByCategory: CategoryBreakdownItem[];
}

export async function getDashboard(month?: string): Promise<DashboardResponse> {
  const response = await apiClient.get<DashboardResponse>('/dashboard', {
    params: month ? { month } : undefined,
  });
  return response.data;
}

// Mirrors dashboard/dto/MonthlyTrendResponse.java.
export interface MonthlyTrend {
  periodMonth: string;
  income: number;
  expense: number;
  net: number;
}

export async function getTrends(months = 6): Promise<MonthlyTrend[]> {
  const response = await apiClient.get<MonthlyTrend[]>('/dashboard/trends', {
    params: { months },
  });
  return response.data;
}
