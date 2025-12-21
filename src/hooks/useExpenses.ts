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
  is_paid?: boolean // Whether the expense has been paid
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
      
      const isPaid = input.is_paid !== undefined ? input.is_paid : false
      const frequency = input.frequency || 'one_time'
      
      const { data, error } = await supabase
        .from('expenses')
        .insert({
          user_id: userId,
          description: input.description,
          amount: input.amount,
          category: input.category || null,
          expense_date: input.expense_date || new Date().toISOString().split('T')[0],
          frequency: frequency,
          due_date: input.due_date || null,
          start_date: input.start_date || (frequency !== 'one_time' ? new Date().toISOString().split('T')[0] : null),
          liability_id: input.liability_id || null,
          is_active: input.is_active !== undefined ? input.is_active : true,
          is_paid: isPaid,
        })
        .select()
        .single()

      if (error) throw error

      // Only subtract expense amount from current_cash if it's paid
      if (data.is_paid) {
        await updateCurrentCash(-input.amount)
      }

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
      // Get the existing expense to check previous amount and paid status
      const { data: existing, error: fetchError } = await supabase
        .from('expenses')
        .select('amount, is_paid')
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

      // Handle cash updates based on paid status changes
      const wasPaid = existing.is_paid
      const isNowPaid = updates.is_paid !== undefined ? updates.is_paid : wasPaid
      const amountChanged = updates.amount !== undefined && updates.amount !== existing.amount

      if (wasPaid !== isNowPaid) {
        // Paid status changed
        if (isNowPaid && !wasPaid) {
          // Marked as paid: deduct from cash
          await updateCurrentCash(-(updates.amount || existing.amount))
        } else if (!isNowPaid && wasPaid) {
          // Marked as unpaid: add back to cash
          await updateCurrentCash(existing.amount)
        }
      } else if (amountChanged && isNowPaid) {
        // Amount changed and expense is paid: adjust cash by the difference
        const difference = existing.amount - (updates.amount || existing.amount) // Old - New (positive if expense decreased)
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
      // Get the expense before deleting to get the amount and paid status
      const { data: existing, error: fetchError } = await supabase
        .from('expenses')
        .select('amount, is_paid')
        .eq('id', id)
        .single()

      if (fetchError) throw fetchError

      const { error } = await supabase
        .from('expenses')
        .delete()
        .eq('id', id)

      if (error) throw error

      // Only add expense amount back to current_cash if it was paid (undo the deduction)
      if (existing.is_paid) {
        await updateCurrentCash(existing.amount)
      }
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

