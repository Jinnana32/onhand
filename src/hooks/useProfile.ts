import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { Profile } from '../types/database.types'
import { queryKeys } from './queryKeys'

export function useProfile() {
  const queryClient = useQueryClient()

  // Get current user
  const getCurrentUser = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('No user found')
    return user
  }

  // Get profile
  const { data: profile, isLoading, error } = useQuery({
    queryKey: queryKeys.profile('current'),
    queryFn: async () => {
      const user = await getCurrentUser()
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      // If profile doesn't exist, create it
      if (error && error.code === 'PGRST116') {
        // PGRST116 = no rows returned
        const { data: newProfile, error: createError } = await supabase
          .from('profiles')
          .insert({
            id: user.id,
            email: user.email,
            current_cash: 0,
            currency: 'PHP',
          })
          .select()
          .single()

        if (createError) throw createError
        return newProfile as Profile
      }

      if (error) throw error
      return data as Profile
    },
  })

  // Create or update profile
  const updateProfileMutation = useMutation({
    mutationFn: async (updates: Partial<Profile>) => {
      const user = await getCurrentUser()
      
      // Check if profile exists
      const { data: existing } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', user.id)
        .single()

      if (existing) {
        // Update existing profile
        const { data, error } = await supabase
          .from('profiles')
          .update(updates)
          .eq('id', user.id)
          .select()
          .single()

        if (error) throw error
        return data as Profile
      } else {
        // Create new profile
        const { data, error } = await supabase
          .from('profiles')
          .insert({
            id: user.id,
            email: user.email,
            ...updates,
          })
          .select()
          .single()

        if (error) throw error
        return data as Profile
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.profile('current') })
      queryClient.invalidateQueries({ queryKey: queryKeys.financialSummary('current') })
    },
  })

  return {
    profile,
    isLoading,
    error,
    updateProfile: updateProfileMutation.mutate,
    updateProfileAsync: updateProfileMutation.mutateAsync,
    isUpdating: updateProfileMutation.isPending,
  }
}

