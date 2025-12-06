import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { ensureProfileExists } from '../lib/profile'
import { CreditCard } from '../types/database.types'
import { queryKeys } from './queryKeys'

interface CreateCreditCardInput {
  name: string
  bank: string
  credit_limit: number
  current_balance?: number
  due_date: number
}

interface UpdateCreditCardInput extends Partial<CreateCreditCardInput> {
  is_active?: boolean
}

export function useCreditCards() {
  const queryClient = useQueryClient()

  const getCurrentUserId = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('No user found')
    return user.id
  }

  // Get all credit cards
  const { data: creditCards = [], isLoading, error } = useQuery({
    queryKey: ['creditCards', 'current'],
    queryFn: async () => {
      const userId = await getCurrentUserId()
      const { data, error } = await supabase
        .from('credit_cards')
        .select('*')
        .eq('user_id', userId)
        .order('bank', { ascending: true })

      if (error) throw error
      return data as CreditCard[]
    },
  })

  // Create credit card
  const createMutation = useMutation({
    mutationFn: async (input: CreateCreditCardInput) => {
      const userId = await getCurrentUserId()
      
      // Ensure profile exists
      await ensureProfileExists()
      
      const { data, error } = await supabase
        .from('credit_cards')
        .insert({
          user_id: userId,
          current_balance: input.current_balance ?? 0,
          ...input,
        })
        .select()
        .single()

      if (error) throw error
      return data as CreditCard
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['creditCards', 'current'] })
      queryClient.invalidateQueries({ queryKey: queryKeys.liabilities('current') })
      queryClient.invalidateQueries({ queryKey: queryKeys.financialSummary('current') })
    },
  })

  // Update credit card
  const updateMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: UpdateCreditCardInput }) => {
      const { data, error } = await supabase
        .from('credit_cards')
        .update(updates)
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      return data as CreditCard
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['creditCards', 'current'] })
      queryClient.invalidateQueries({ queryKey: queryKeys.liabilities('current') })
      queryClient.invalidateQueries({ queryKey: queryKeys.financialSummary('current') })
    },
  })

  // Delete credit card
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('credit_cards')
        .delete()
        .eq('id', id)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['creditCards', 'current'] })
      queryClient.invalidateQueries({ queryKey: queryKeys.liabilities('current') })
      queryClient.invalidateQueries({ queryKey: queryKeys.financialSummary('current') })
    },
  })

  return {
    creditCards,
    isLoading,
    error,
    createCreditCard: createMutation.mutate,
    createCreditCardAsync: createMutation.mutateAsync,
    updateCreditCard: updateMutation.mutate,
    updateCreditCardAsync: updateMutation.mutateAsync,
    deleteCreditCard: deleteMutation.mutate,
    deleteCreditCardAsync: deleteMutation.mutateAsync,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
  }
}

