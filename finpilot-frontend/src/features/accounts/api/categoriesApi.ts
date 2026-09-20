import { apiClient } from '../../../lib/apiClient';

// Mirrors finance/dto/CategoryResponse.java exactly.

export type CategoryType = 'INCOME' | 'EXPENSE';

export interface CategoryResponse {
  id: number;
  name: string;
  categoryType: CategoryType;
  isDefault: boolean;
}

export async function listCategories(): Promise<CategoryResponse[]> {
  const response = await apiClient.get<CategoryResponse[]>('/categories');
  return response.data;
}
