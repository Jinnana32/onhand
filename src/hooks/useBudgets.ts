import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useMemo } from 'react'
import { supabase } from '../lib/supabase'
import { ensureProfileExists } from '../lib/profile'
import { Budget, Expense } from '../types/database.types'
import { queryKeys } from './queryKeys'

// Helper function to update profile's current_cash
const updateCurrentCash = async (amountChange: number) => {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('No user found')

  // Get current profile
  const { data: profile, error: fetchError } = await supabase
    .from('profiles')
    .select('current_cash')
    .eq('id', user.id)
    .single()

  if (fetchError) throw fetchError
  if (!profile) throw new Error('Profile not found')

  // Calculate new current_cash
  const newCurrentCash = (profile.current_cash || 0) + amountChange

  // Update profile
  const { error: updateError } = await supabase
    .from('profiles')
    .update({ current_cash: newCurrentCash })
    .eq('id', user.id)

  if (updateError) throw updateError
}

interface CreateBudgetInput {
  name: string
  amount: number
  budget_date: string
  is_active?: boolean
}

interface UpdateBudgetInput extends Partial<CreateBudgetInput> {}

export function useBudgets() {
  const queryClient = useQueryClient()

  const getCurrentUserId = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('No user found')
    return user.id
  }

  // Get all budgets
  const { data: budgets = [], isLoading, error } = useQuery({
    queryKey: queryKeys.budgets('current'),
    queryFn: async () => {
      const userId = await getCurrentUserId()
      const { data, error } = await supabase
        .from('budgets')
        .select('*')
        .eq('user_id', userId)
        .order('budget_date', { ascending: false })

      if (error) throw error
      return data as Budget[]
    },
  })

  // Get all expenses to calculate remaining budget amounts
  const { data: expenses = [] } = useQuery({
    queryKey: queryKeys.expenses('current'),
    queryFn: async () => {
      const userId = await getCurrentUserId()
      const { data, error } = await supabase
        .from('expenses')
        .select('*')
        .eq('user_id', userId)

      if (error) throw error
      return data as Expense[]
    },
  })

  // Calculate remaining amount for each budget
  const budgetsWithRemaining = useMemo(() => {
    return budgets.map((budget) => {
      // Sum all paid expenses linked to this budget
      const spentAmount = expenses
        .filter((expense) => expense.budget_id === budget.id && expense.is_paid)
        .reduce((sum, expense) => sum + expense.amount, 0)

      const remainingAmount = budget.amount - spentAmount

      return {
        ...budget,
        remainingAmount,
        spentAmount,
      }
    })
  }, [budgets, expenses])

  // Create budget
  const createMutation = useMutation({
    mutationFn: async (input: CreateBudgetInput) => {
      const userId = await getCurrentUserId()
      
      // Ensure profile exists
      await ensureProfileExists()
      
      const { data, error } = await supabase
        .from('budgets')
        .insert({
          user_id: userId,
          name: input.name,
          amount: input.amount,
          budget_date: input.budget_date,
          is_active: input.is_active !== undefined ? input.is_active : true,
        })
        .select()
        .single()

      if (error) throw error

      // Deduct budget amount from current_cash immediately
      await updateCurrentCash(-input.amount)

      return data as Budget
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.budgets('current') })
      queryClient.invalidateQueries({ queryKey: queryKeys.financialSummary('current') })
      queryClient.invalidateQueries({ queryKey: queryKeys.profile('current') })
    },
  })

  // Update budget
  const updateMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: UpdateBudgetInput }) => {
      // Get the existing budget to check previous amount
      const { data: existing, error: fetchError } = await supabase
        .from('budgets')
        .select('amount')
        .eq('id', id)
        .single()

      if (fetchError) throw fetchError

      const { data, error } = await supabase
        .from('budgets')
        .update(updates)
        .eq('id', id)
        .select()
        .single()

      if (error) throw error

      // If amount changed, adjust cash by the difference
      if (updates.amount !== undefined && updates.amount !== existing.amount) {
        const difference = existing.amount - updates.amount // Old - New (positive if budget decreased)
        await updateCurrentCash(difference)
      }

      return data as Budget
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.budgets('current') })
      queryClient.invalidateQueries({ queryKey: queryKeys.financialSummary('current') })
      queryClient.invalidateQueries({ queryKey: queryKeys.profile('current') })
    },
  })

  // Delete budget
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      // Get the budget before deleting to get the amount
      const { data: existing, error: fetchError } = await supabase
        .from('budgets')
        .select('amount')
        .eq('id', id)
        .single()

      if (fetchError) throw fetchError

      const { error } = await supabase
        .from('budgets')
        .delete()
        .eq('id', id)

      if (error) throw error

      // Add budget amount back to current_cash (undo the deduction)
      await updateCurrentCash(existing.amount)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.budgets('current') })
      queryClient.invalidateQueries({ queryKey: queryKeys.financialSummary('current') })
      queryClient.invalidateQueries({ queryKey: queryKeys.profile('current') })
    },
  })

  return {
    budgets,
    budgetsWithRemaining, // Budgets with calculated remaining amounts
    isLoading,
    error,
    createBudget: createMutation.mutate,
    createBudgetAsync: createMutation.mutateAsync,
    updateBudget: updateMutation.mutate,
    updateBudgetAsync: updateMutation.mutateAsync,
    deleteBudget: deleteMutation.mutate,
    deleteBudgetAsync: deleteMutation.mutateAsync,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
  }
}

