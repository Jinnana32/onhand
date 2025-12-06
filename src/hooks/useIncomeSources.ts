import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { ensureProfileExists } from '../lib/profile'
import { IncomeSource } from '../types/database.types'
import { queryKeys } from './queryKeys'

interface CreateIncomeSourceInput {
  name: string
  amount: number
  frequency: IncomeSource['frequency']
  category: IncomeSource['category']
  next_payment_date?: string | null
  payment_date?: string | null
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
      return data as IncomeSource
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.incomeSources('current') })
      queryClient.invalidateQueries({ queryKey: queryKeys.financialSummary('current') })
    },
  })

  // Update income source
  const updateMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: UpdateIncomeSourceInput }) => {
      const { data, error } = await supabase
        .from('income_sources')
        .update(updates)
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      return data as IncomeSource
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.incomeSources('current') })
      queryClient.invalidateQueries({ queryKey: queryKeys.financialSummary('current') })
    },
  })

  // Delete income source
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('income_sources')
        .delete()
        .eq('id', id)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.incomeSources('current') })
      queryClient.invalidateQueries({ queryKey: queryKeys.financialSummary('current') })
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

