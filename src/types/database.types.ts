export interface Profile {
  id: string
  email: string | null
  current_cash: number
  currency: string
  created_at: string
  updated_at: string
}

export interface CreditCard {
  id: string
  user_id: string
  name: string // e.g., "BPI Gold", "RCBC Visa"
  bank: string // e.g., "BPI", "RCBC", "BDO"
  credit_limit: number
  current_balance: number
  due_date: number // Day of month (1-31)
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface Liability {
  id: string
  user_id: string
  name: string
  amount: number
  due_date: number // Day of month (1-31)
  category: 'credit_card' | 'loan' | 'installment' | 'other'
  source: string | null // e.g., "Atome", "Home Credit" (for non-credit-card liabilities)
  credit_card_id: string | null // Reference to credit_cards table
  credit_limit: number | null // For backward compatibility, can be derived from credit_card
  current_balance: number
  months_to_pay: number | null // Number of months to pay (null = recurring forever)
  start_date: string | null // Date when payment period starts
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface IncomeSource {
  id: string
  user_id: string
  name: string
  amount: number
  frequency: 'monthly' | 'weekly' | 'one_time'
  category: 'salary' | 'project' | 'other'
  next_payment_date: string | null
  payment_date: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface Expense {
  id: string
  user_id: string
  description: string
  amount: number
  category: string | null
  expense_date: string
  created_at: string
  updated_at: string
}

