import { apiClient } from '../../../lib/apiClient';

// Mirrors finance/dto/AccountDtos.java exactly.

export type AccountType = 'BANK' | 'CASH' | 'CREDIT_CARD' | 'WALLET';

export interface CreateAccountRequest {
  name: string;
  accountType: AccountType;
  openingBalance?: number;
}

export interface AccountResponse {
  id: number;
  name: string;
  accountType: AccountType;
  balance: number;
  currency: string;
  createdAt: string;
}

export async function listAccounts(): Promise<AccountResponse[]> {
  const response = await apiClient.get<AccountResponse[]>('/accounts');
  return response.data;
}

export async function createAccount(data: CreateAccountRequest): Promise<AccountResponse> {
  const response = await apiClient.post<AccountResponse>('/accounts', data);
  return response.data;
}
