import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { ensureProfileExists } from '../lib/profile'
import { Expense } from '../types/database.types'
import { queryKeys } from './queryKeys'

interface CreateExpenseInput {
  description: string
  amount: number
  category?: string | null
  expense_date?: string
  frequency?: 'one_time' | 'monthly' | 'weekly'
  due_date?: number | null
  start_date?: string | null
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
      return data as Expense
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.expenses('current') })
      queryClient.invalidateQueries({ queryKey: queryKeys.financialSummary('current') })
    },
  })

  // Update expense
  const updateMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: UpdateExpenseInput }) => {
      const { data, error } = await supabase
        .from('expenses')
        .update(updates)
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      return data as Expense
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.expenses('current') })
      queryClient.invalidateQueries({ queryKey: queryKeys.financialSummary('current') })
    },
  })

  // Delete expense
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('expenses')
        .delete()
        .eq('id', id)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.expenses('current') })
      queryClient.invalidateQueries({ queryKey: queryKeys.financialSummary('current') })
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

