import { create } from 'zustand';

export type QuickAddKind = 'transaction' | 'account' | 'budget';

interface UiState {
  commandOpen: boolean;
  quickAddOpen: boolean;
  quickAddKind: QuickAddKind;
  selectedTransactionId: number | null;
  searchQuery: string;
  setCommandOpen: (open: boolean) => void;
  setQuickAdd: (open: boolean, kind?: QuickAddKind) => void;
  setSelectedTransactionId: (id: number | null) => void;
  setSearchQuery: (query: string) => void;
}

export const useUiStore = create<UiState>((set) => ({
  commandOpen: false,
  quickAddOpen: false,
  quickAddKind: 'transaction',
  selectedTransactionId: null,
  searchQuery: '',
  setCommandOpen: (commandOpen) => set({ commandOpen }),
  setQuickAdd: (quickAddOpen, kind) =>
    set({
      quickAddOpen,
      quickAddKind: kind ?? 'transaction',
    }),
  setSelectedTransactionId: (selectedTransactionId) => set({ selectedTransactionId }),
  setSearchQuery: (searchQuery) => set({ searchQuery }),
}));
