import { supabase } from './supabase'

/**
 * Ensures a profile exists for the current user.
 * Creates one if it doesn't exist.
 */
export async function ensureProfileExists(): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('No user found')

  // Check if profile exists
  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('id', user.id)
    .single()

  // Create profile if it doesn't exist
  if (!profile) {
    const { error } = await supabase.from('profiles').insert({
      id: user.id,
      email: user.email,
      current_cash: 0,
      currency: 'PHP',
    })

    if (error) {
      // If error is due to profile already existing (race condition), ignore it
      if (error.code !== '23505') {
        throw error
      }
    }
  }
}

