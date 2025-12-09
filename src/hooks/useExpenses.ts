import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { ensureProfileExists } from '../lib/profile'
import { Expense } from '../types/database.types'
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

interface CreateExpenseInput {
  description: string
  amount: number
  category?: string | null
  expense_date?: string
  frequency?: 'one_time' | 'monthly' | 'weekly'
  due_date?: number | null
  start_date?: string | null
  liability_id?: string | null // Link to liability when marking as paid
  is_active?: boolean
}

interface UpdateExpenseInput extends Partial<CreateExpenseInput> {}

export function useExpenses() {
  const queryClient = useQueryClient()

  const getCurrentUserId = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('No user found')
    return user.id
  }

  // Get all expenses
  const { data: expenses = [], isLoading, error } = useQuery({
    queryKey: queryKeys.expenses('current'),
    queryFn: async () => {
      const userId = await getCurrentUserId()
      const { data, error } = await supabase
        .from('expenses')
        .select('*')
        .eq('user_id', userId)
        .order('expense_date', { ascending: false })

      if (error) throw error
      return data as Expense[]
    },
  })

  // Create expense
  const createMutation = useMutation({
    mutationFn: async (input: CreateExpenseInput) => {
      const userId = await getCurrentUserId()
      
      // Ensure profile exists
      await ensureProfileExists()
      
      const { data, error } = await supabase
        .from('expenses')
        .insert({
          user_id: userId,
          expense_date: input.expense_date || new Date().toISOString().split('T')[0],
          frequency: input.frequency || 'one_time',
          is_active: input.is_active !== undefined ? input.is_active : true,
          start_date: input.start_date || (input.frequency !== 'one_time' ? new Date().toISOString().split('T')[0] : null),
          ...input,
        })
        .select()
        .single()

      if (error) throw error

      // Subtract expense amount from current_cash
      await updateCurrentCash(-input.amount)

      return data as Expense
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.expenses('current') })
      queryClient.invalidateQueries({ queryKey: queryKeys.financialSummary('current') })
      queryClient.invalidateQueries({ queryKey: queryKeys.profile('current') })
    },
  })

  // Update expense
  const updateMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: UpdateExpenseInput }) => {
      // Get the existing expense to check previous amount
      const { data: existing, error: fetchError } = await supabase
        .from('expenses')
        .select('amount')
        .eq('id', id)
        .single()

      if (fetchError) throw fetchError

      const { data, error } = await supabase
        .from('expenses')
        .update(updates)
        .eq('id', id)
        .select()
        .single()

      if (error) throw error

      // If amount changed, adjust current_cash by the difference
      if (updates.amount !== undefined && updates.amount !== existing.amount) {
        const difference = existing.amount - updates.amount // Old - New (positive if expense decreased)
        await updateCurrentCash(difference)
      }

      return data as Expense
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.expenses('current') })
      queryClient.invalidateQueries({ queryKey: queryKeys.financialSummary('current') })
      queryClient.invalidateQueries({ queryKey: queryKeys.profile('current') })
    },
  })

  // Delete expense
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      // Get the expense before deleting to get the amount
      const { data: existing, error: fetchError } = await supabase
        .from('expenses')
        .select('amount')
        .eq('id', id)
        .single()

      if (fetchError) throw fetchError

      const { error } = await supabase
        .from('expenses')
        .delete()
        .eq('id', id)

      if (error) throw error

      // Add expense amount back to current_cash (undo the deduction)
      await updateCurrentCash(existing.amount)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.expenses('current') })
      queryClient.invalidateQueries({ queryKey: queryKeys.financialSummary('current') })
      queryClient.invalidateQueries({ queryKey: queryKeys.profile('current') })
    },
  })

  return {
    expenses,
    isLoading,
    error,
    createExpense: createMutation.mutate,
    createExpenseAsync: createMutation.mutateAsync,
    updateExpense: updateMutation.mutate,
    updateExpenseAsync: updateMutation.mutateAsync,
    deleteExpense: deleteMutation.mutate,
    deleteExpenseAsync: deleteMutation.mutateAsync,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
  }
}

