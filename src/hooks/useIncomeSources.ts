import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { ensureProfileExists } from '../lib/profile'
import { IncomeSource } from '../types/database.types'
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

interface CreateIncomeSourceInput {
  name: string
  amount: number
  frequency: IncomeSource['frequency']
  category: IncomeSource['category']
  next_payment_date?: string | null
  payment_date?: string | null
  is_received?: boolean
  parent_income_id?: string | null // Reference to parent recurring income
}

interface UpdateIncomeSourceInput extends Partial<CreateIncomeSourceInput> {
  is_active?: boolean
}

export function useIncomeSources() {
  const queryClient = useQueryClient()

  const getCurrentUserId = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('No user found')
    return user.id
  }

  // Get all income sources
  const { data: incomeSources = [], isLoading, error } = useQuery({
    queryKey: queryKeys.incomeSources('current'),
    queryFn: async () => {
      const userId = await getCurrentUserId()
      const { data, error } = await supabase
        .from('income_sources')
        .select('*')
        .eq('user_id', userId)
        .order('next_payment_date', { ascending: true, nullsFirst: false })

      if (error) throw error
      return data as IncomeSource[]
    },
  })

  // Create income source
  const createMutation = useMutation({
    mutationFn: async (input: CreateIncomeSourceInput) => {
      const userId = await getCurrentUserId()
      
      // Ensure profile exists
      await ensureProfileExists()
      
      const { data, error } = await supabase
        .from('income_sources')
        .insert({
          user_id: userId,
          ...input,
        })
        .select()
        .single()

      if (error) throw error

      // If income is received, add to current_cash
      if (input.is_received) {
        await updateCurrentCash(input.amount)
      }

      return data as IncomeSource
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.incomeSources('current') })
      queryClient.invalidateQueries({ queryKey: queryKeys.financialSummary('current') })
      queryClient.invalidateQueries({ queryKey: queryKeys.profile('current') })
    },
  })

  // Update income source
  const updateMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: UpdateIncomeSourceInput }) => {
      // Get the existing income source to check previous state
      const { data: existing, error: fetchError } = await supabase
        .from('income_sources')
        .select('amount, is_received')
        .eq('id', id)
        .single()

      if (fetchError) throw fetchError

      const { data, error } = await supabase
        .from('income_sources')
        .update(updates)
        .eq('id', id)
        .select()
        .single()

      if (error) throw error

      // Handle current_cash updates based on is_received changes
      const wasReceived = existing.is_received
      const willBeReceived = updates.is_received ?? wasReceived
      const amount = updates.amount ?? existing.amount

      if (wasReceived && !willBeReceived) {
        // Changed from received to not received: subtract amount
        await updateCurrentCash(-amount)
      } else if (!wasReceived && willBeReceived) {
        // Changed from not received to received: add amount
        await updateCurrentCash(amount)
      } else if (wasReceived && willBeReceived && updates.amount !== undefined && updates.amount !== existing.amount) {
        // Amount changed while still received: adjust by difference
        await updateCurrentCash(updates.amount - existing.amount)
      }

      return data as IncomeSource
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.incomeSources('current') })
      queryClient.invalidateQueries({ queryKey: queryKeys.financialSummary('current') })
      queryClient.invalidateQueries({ queryKey: queryKeys.profile('current') })
    },
  })

  // Delete income source
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      // Get the income source before deleting to check if it was received
      const { data: existing, error: fetchError } = await supabase
        .from('income_sources')
        .select('amount, is_received')
        .eq('id', id)
        .single()

      if (fetchError) throw fetchError

      const { error } = await supabase
        .from('income_sources')
        .delete()
        .eq('id', id)

      if (error) throw error

      // If income was received, subtract from current_cash
      if (existing.is_received) {
        await updateCurrentCash(-existing.amount)
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.incomeSources('current') })
      queryClient.invalidateQueries({ queryKey: queryKeys.financialSummary('current') })
      queryClient.invalidateQueries({ queryKey: queryKeys.profile('current') })
    },
  })

  return {
    incomeSources,
    isLoading,
    error,
    createIncomeSource: createMutation.mutate,
    createIncomeSourceAsync: createMutation.mutateAsync,
    updateIncomeSource: updateMutation.mutate,
    updateIncomeSourceAsync: updateMutation.mutateAsync,
    deleteIncomeSource: deleteMutation.mutate,
    deleteIncomeSourceAsync: deleteMutation.mutateAsync,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
  }
}

