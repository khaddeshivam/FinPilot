import { apiClient } from '../../../lib/apiClient';

// Mirrors intelligence/dto/InsightResponse.java and HealthScoreResponse.java exactly.

export type InsightType =
  | 'CATEGORY_SPENDING_INCREASE'
  | 'BUDGET_WARNING'
  | 'BUDGET_EXCEEDED'
  | 'OVERSPENDING'
  | 'POSITIVE_SAVINGS'
  | 'NO_ACTIVITY';

export type Severity = 'INFO' | 'WARNING' | 'CRITICAL';

export interface InsightResponse {
  type: InsightType;
  severity: Severity;
  message: string;
}

export type HealthLabel = 'EXCELLENT' | 'GOOD' | 'FAIR' | 'NEEDS_ATTENTION';

export interface HealthScoreResponse {
  score: number;
  label: HealthLabel;
  savingsRate: number;
  budgetAdherence: number | null;
}

export interface NarrativeResponse {
  narrative: string;
}

// Mirrors intelligence/dto/AskDtos.java exactly - the real RAG endpoint.
export interface CitedTransaction {
  id: number;
  description: string | null;
  amount: number;
  categoryName: string;
  transactionDate: string;
}

export interface AskResponse {
  answer: string;
  citedTransactions: CitedTransaction[];
}

export async function getInsights(month?: string): Promise<InsightResponse[]> {
  const response = await apiClient.get<InsightResponse[]>('/intelligence/insights', {
    params: month ? { month } : undefined,
  });
  return response.data;
}

export async function getHealthScore(month?: string): Promise<HealthScoreResponse> {
  const response = await apiClient.get<HealthScoreResponse>('/intelligence/health-score', {
    params: month ? { month } : undefined,
  });
  return response.data;
}

// Optional - the backend returns 503 if OPENAI_API_KEY isn't configured on
// the server. That's an expected, normal response for this endpoint, not
// a real error - the caller decides how to display it.
export async function getNarrative(month?: string): Promise<NarrativeResponse> {
  const response = await apiClient.get<NarrativeResponse>('/intelligence/narrative', {
    params: month ? { month } : undefined,
  });
  return response.data;
}

// Retrieval-augmented Q&A - embeds the question, retrieves the most
// relevant transactions from the user's own history via cosine similarity,
// and answers grounded in that retrieved context plus current insights.
// Same 503-if-not-configured convention as getNarrative.
export async function askFinPilot(question: string): Promise<AskResponse> {
  const response = await apiClient.post<AskResponse>('/intelligence/ask', { question });
  return response.data;
}
