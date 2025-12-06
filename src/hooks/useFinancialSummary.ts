import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { queryKeys } from './queryKeys'
import { Profile, Liability, IncomeSource, Expense, CreditCard } from '../types/database.types'

export interface FinancialSummary {
  availableCash: number
  totalLiabilities: number
  totalCreditLimit: number
  availableCreditLimit: number
  creditUtilization: number
  upcomingBillsCount: number
  upcomingBillsTotal: number
  monthlyIncome: number
  monthlyExpenses: number
  netCashFlow: number
}

export function useFinancialSummary() {
  const { data: summary, isLoading, error } = useQuery({
    queryKey: queryKeys.financialSummary('current'),
    queryFn: async (): Promise<FinancialSummary> => {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('No user found')

      // Fetch all data in parallel
      const [profileResult, liabilitiesResult, incomeResult, expensesResult, creditCardsResult] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', user.id).single(),
        supabase.from('liabilities').select('*').eq('user_id', user.id),
        supabase.from('income_sources').select('*').eq('user_id', user.id),
        supabase.from('expenses').select('*').eq('user_id', user.id),
        supabase.from('credit_cards').select('*').eq('user_id', user.id),
      ])

      if (profileResult.error) throw profileResult.error
      if (liabilitiesResult.error) throw liabilitiesResult.error
      if (incomeResult.error) throw incomeResult.error
      if (expensesResult.error) throw expensesResult.error
      if (creditCardsResult.error) throw creditCardsResult.error

      const profile = profileResult.data as Profile
      const liabilities = (liabilitiesResult.data || []) as Liability[]
      const incomeSources = (incomeResult.data || []) as IncomeSource[]
      const expenses = (expensesResult.data || []) as Expense[]
      const creditCards = (creditCardsResult.data || []) as CreditCard[]

      const currentDate = new Date()
      const currentDay = currentDate.getDate()
      const currentMonth = currentDate.getMonth()
      const currentYear = currentDate.getFullYear()

      // Calculate available cash
      const availableCash = profile?.current_cash ?? 0

      // Calculate total liabilities (only active ones)
      const activeLiabilities = liabilities.filter((l) => l.is_active)
      const totalLiabilities = activeLiabilities.reduce(
        (sum, liability) => sum + liability.current_balance,
        0
      )

      // Calculate credit utilization from credit_cards table
      const activeCreditCards = creditCards.filter((card) => card.is_active)
      const totalCreditLimit = activeCreditCards.reduce(
        (sum, card) => sum + (card.credit_limit ?? 0),
        0
      )
      const totalCreditBalance = activeCreditCards.reduce(
        (sum, card) => sum + (card.current_balance ?? 0),
        0
      )
      const availableCreditLimit = totalCreditLimit - totalCreditBalance
      const creditUtilization =
        totalCreditLimit > 0 ? (totalCreditBalance / totalCreditLimit) * 100 : 0

      // Calculate upcoming bills (due in current month, from today onwards)
      const upcomingBills = activeLiabilities.filter((liability) => {
        const dueDay = liability.due_date
        // If due date has passed this month, check next month
        if (dueDay < currentDay) {
          return false // Already passed this month
        }
        return true // Still upcoming this month
      })

      const upcomingBillsCount = upcomingBills.length
      const upcomingBillsTotal = upcomingBills.reduce(
        (sum, bill) => sum + bill.amount,
        0
      )

      // Calculate monthly income (sum of monthly income sources)
      const activeIncomeSources = incomeSources.filter((i) => i.is_active)
      const monthlyIncome = activeIncomeSources.reduce((sum, income) => {
        if (income.frequency === 'monthly') {
          return sum + income.amount
        } else if (income.frequency === 'weekly') {
          return sum + income.amount * 4.33 // Approximate weeks per month
        } else if (income.frequency === 'one_time') {
          // Only count if payment date is in current month
          if (income.payment_date) {
            const paymentDate = new Date(income.payment_date)
            if (
              paymentDate.getMonth() === currentMonth &&
              paymentDate.getFullYear() === currentYear
            ) {
              return sum + income.amount
            }
          }
        }
        return sum
      }, 0)

      // Calculate monthly expenses (current month)
      const currentMonthExpenses = expenses.filter((expense) => {
        const expenseDate = new Date(expense.expense_date)
        return (
          expenseDate.getMonth() === currentMonth &&
          expenseDate.getFullYear() === currentYear
        )
      })

      const monthlyExpenses = currentMonthExpenses.reduce(
        (sum, expense) => sum + expense.amount,
        0
      )

      // Calculate net cash flow
      const netCashFlow = monthlyIncome - monthlyExpenses - upcomingBillsTotal

      return {
        availableCash,
        totalLiabilities,
        totalCreditLimit,
        availableCreditLimit: Math.max(0, availableCreditLimit),
        creditUtilization: Math.round(creditUtilization * 100) / 100,
        upcomingBillsCount,
        upcomingBillsTotal,
        monthlyIncome,
        monthlyExpenses,
        netCashFlow,
      }
    },
  })

  return {
    summary,
    isLoading,
    error,
  }
}

