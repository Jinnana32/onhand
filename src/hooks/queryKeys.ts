export const queryKeys = {
  profile: (userId: string) => ['profile', userId] as const,
  liabilities: (userId: string) => ['liabilities', userId] as const,
  incomeSources: (userId: string) => ['incomeSources', userId] as const,
  expenses: (userId: string) => ['expenses', userId] as const,
  budgets: (userId: string) => ['budgets', userId] as const,
  financialSummary: (userId: string) => ['financialSummary', userId] as const,
}

