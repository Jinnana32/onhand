import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { ensureProfileExists } from '../lib/profile'
import { Liability } from '../types/database.types'
import { queryKeys } from './queryKeys'

interface CreateLiabilityInput {
  name: string
  amount: number
  due_date: number
  category: Liability['category']
  source?: string | null
  credit_card_id?: string | null
  credit_limit?: number | null
  current_balance?: number | null
  months_to_pay?: number | null
  start_date?: string | null
}

interface UpdateLiabilityInput extends Partial<CreateLiabilityInput> {
  is_active?: boolean
}

export function useLiabilities() {
  const queryClient = useQueryClient()

  const getCurrentUserId = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('No user found')
    return user.id
  }

  // Get all liabilities
  const { data: liabilities = [], isLoading, error } = useQuery({
    queryKey: queryKeys.liabilities('current'),
    queryFn: async () => {
      const userId = await getCurrentUserId()
      const { data, error } = await supabase
        .from('liabilities')
        .select('*')
        .eq('user_id', userId)
        .order('due_date', { ascending: true })

      if (error) throw error
      return data as Liability[]
    },
  })

  // Create liability
  const createMutation = useMutation({
    mutationFn: async (input: CreateLiabilityInput) => {
      const userId = await getCurrentUserId()
      
      // Ensure profile exists
      await ensureProfileExists()
      
      const { data, error } = await supabase
        .from('liabilities')
        .insert({
          user_id: userId,
          // Only set current_balance if provided (for credit cards, loans, installments)
          current_balance: input.current_balance ?? null,
          start_date: input.start_date || new Date().toISOString().split('T')[0],
          ...input,
        })
        .select()
        .single()

      if (error) throw error
      return data as Liability
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.liabilities('current') })
      queryClient.invalidateQueries({ queryKey: queryKeys.financialSummary('current') })
    },
  })

  // Update liability
  const updateMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: UpdateLiabilityInput }) => {
      const { data, error } = await supabase
        .from('liabilities')
        .update(updates)
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      return data as Liability
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.liabilities('current') })
      queryClient.invalidateQueries({ queryKey: queryKeys.financialSummary('current') })
    },
  })

  // Delete liability
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('liabilities')
        .delete()
        .eq('id', id)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.liabilities('current') })
      queryClient.invalidateQueries({ queryKey: queryKeys.financialSummary('current') })
    },
  })

  return {
    liabilities,
    isLoading,
    error,
    createLiability: createMutation.mutate,
    createLiabilityAsync: createMutation.mutateAsync,
    updateLiability: updateMutation.mutate,
    updateLiabilityAsync: updateMutation.mutateAsync,
    deleteLiability: deleteMutation.mutate,
    deleteLiabilityAsync: deleteMutation.mutateAsync,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
  }
}

