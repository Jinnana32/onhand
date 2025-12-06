import { Liability, IncomeSource, Expense, CreditCard } from '../types/database.types'

export interface AffordabilityCalculation {
  purchaseAmount: number
  currentCash: number
  upcomingIncome30Days: number
  upcomingLiabilities30Days: number
  recentExpenses30Days: number
  creditCardAvailable: number
  availableBudget: number
  availableNow: number // Cash + Credit only (no future income)
  canAfford: boolean
  status: 'affordable' | 'tight' | 'unaffordable'
  paymentMethod: 'cash' | 'credit' | 'both' | 'future_income'
  breakdown: {
    startingCash: number
    incomeAdded: number
    liabilitiesDeducted: number
    expensesDeducted: number
    creditAvailable: number
    finalBudget: number
    availableNow: number
  }
  afterPurchase: {
    remainingCash: number
    remainingCredit: number
    creditUtilization: number
    newAvailableBudget: number
    overboardAmount: number
  }
}

export function calculateAffordability(
  purchaseAmount: number,
  currentCash: number,
  liabilities: Liability[],
  incomeSources: IncomeSource[],
  expenses: Expense[],
  creditCards: CreditCard[]
): AffordabilityCalculation {
  // Ensure all numeric inputs are valid numbers
  const purchaseAmountNum = typeof purchaseAmount === 'number' && !isNaN(purchaseAmount) ? purchaseAmount : 0
  const currentCashNum = typeof currentCash === 'number' && !isNaN(currentCash) ? currentCash : 0
  
  const today = new Date()
  const thirtyDaysFromNow = new Date(today)
  thirtyDaysFromNow.setDate(today.getDate() + 30)

  // Calculate upcoming income in next 30 days
  const activeIncome = incomeSources.filter((i) => i.is_active)
  let upcomingIncome30Days = 0

  activeIncome.forEach((income) => {
    if (income.frequency === 'monthly') {
      // Count monthly payments in next 30 days
      if (income.next_payment_date) {
        const nextPayment = new Date(income.next_payment_date)
        // Set to start of day for accurate comparison
        nextPayment.setHours(0, 0, 0, 0)
        const todayStart = new Date(today)
        todayStart.setHours(0, 0, 0, 0)
        
        if (nextPayment >= todayStart && nextPayment <= thirtyDaysFromNow) {
          upcomingIncome30Days += income.amount
          // Check if there's another monthly payment within 30 days
          const nextCycle = new Date(nextPayment)
          nextCycle.setMonth(nextCycle.getMonth() + 1)
          if (nextCycle <= thirtyDaysFromNow) {
            upcomingIncome30Days += income.amount
          }
        }
      }
    } else if (income.frequency === 'weekly') {
      // Count weekly payments in next 30 days
      if (income.next_payment_date) {
        const nextPayment = new Date(income.next_payment_date)
        nextPayment.setHours(0, 0, 0, 0)
        const todayStart = new Date(today)
        todayStart.setHours(0, 0, 0, 0)
        
        if (nextPayment >= todayStart && nextPayment <= thirtyDaysFromNow) {
          const daysUntilNext = Math.ceil(
            (nextPayment.getTime() - todayStart.getTime()) / (1000 * 60 * 60 * 24)
          )
          // Count how many weekly payments fit in remaining days
          const remainingDays = 30 - daysUntilNext
          const additionalPayments = Math.floor(remainingDays / 7)
          upcomingIncome30Days += income.amount * (1 + additionalPayments)
        }
      }
    } else if (income.frequency === 'one_time') {
      // One-time income in next 30 days
      if (income.payment_date) {
        const paymentDate = new Date(income.payment_date)
        paymentDate.setHours(0, 0, 0, 0)
        const todayStart = new Date(today)
        todayStart.setHours(0, 0, 0, 0)
        
        if (paymentDate >= todayStart && paymentDate <= thirtyDaysFromNow) {
          upcomingIncome30Days += income.amount
        }
      }
    }
  })

  // Calculate upcoming liabilities in next 30 days
  const activeLiabilities = liabilities.filter((l) => l.is_active)
  let upcomingLiabilities30Days = 0

  activeLiabilities.forEach((liability) => {
    const dueDay = liability.due_date
    const currentDay = today.getDate()
    const currentMonth = today.getMonth()
    const currentYear = today.getFullYear()

    // Calculate next due date
    let nextDueDate: Date
    if (dueDay >= currentDay) {
      // Due this month
      nextDueDate = new Date(currentYear, currentMonth, dueDay)
    } else {
      // Due next month
      nextDueDate = new Date(currentYear, currentMonth + 1, dueDay)
    }

    // Check if due within 30 days
    if (nextDueDate <= thirtyDaysFromNow) {
      upcomingLiabilities30Days += liability.amount
    }
  })

  // Calculate recent expenses in last 30 days
  const thirtyDaysAgo = new Date(today)
  thirtyDaysAgo.setDate(today.getDate() - 30)

  const recentExpenses30Days = expenses
    .filter((expense) => {
      const expenseDate = new Date(expense.expense_date)
      return expenseDate >= thirtyDaysAgo && expenseDate <= today
    })
    .reduce((sum, expense) => sum + expense.amount, 0)

  // Calculate available credit card limits
  const creditCardAvailable = (creditCards || [])
    .filter((card) => card && card.is_active)
    .reduce((sum, card) => {
      const limit = typeof card.credit_limit === 'number' ? card.credit_limit : 0
      const balance = typeof card.current_balance === 'number' ? card.current_balance : 0
      const available = (limit || 0) - (balance || 0)
      return sum + Math.max(0, available)
    }, 0)

  // Calculate available budget (includes future income)
  const availableBudget =
    currentCashNum + upcomingIncome30Days - upcomingLiabilities30Days - recentExpenses30Days

  // Calculate available NOW (cash + credit only, no future income)
  const creditCardAvailableNum = typeof creditCardAvailable === 'number' && !isNaN(creditCardAvailable) ? creditCardAvailable : 0
  const availableNow = currentCashNum + creditCardAvailableNum

  // Determine status based on available NOW (more conservative)
  let status: 'affordable' | 'tight' | 'unaffordable'
  let canAfford = false
  let paymentMethod: 'cash' | 'credit' | 'both' | 'future_income' = 'cash'

  // Total available with future income (budget already includes cash, so add credit)
  const totalWithFutureIncome = availableBudget + creditCardAvailable

  if (currentCashNum >= purchaseAmountNum) {
    // Can afford with cash only
    status = 'affordable'
    canAfford = true
    paymentMethod = 'cash'
  } else if (availableNow >= purchaseAmountNum) {
    // Can afford with cash + credit right now (but needs credit)
    status = 'affordable'
    canAfford = true
    paymentMethod = currentCashNum > 0 ? 'both' : 'credit'
  } else if (totalWithFutureIncome >= purchaseAmountNum) {
    // Can afford if we include future income (but not available right now)
    status = 'tight'
    canAfford = true
    paymentMethod = 'future_income'
  } else {
    status = 'unaffordable'
    canAfford = false
  }

  // Calculate after purchase impact
  // If purchase can be covered by cash, use cash first
  const cashUsed = Math.min(purchaseAmountNum, currentCashNum)
  const remainingCash = currentCashNum - cashUsed
  
  // Calculate how much credit would be used
  // Only use credit that's actually available NOW (don't exceed available credit)
  const creditUsed = Math.min(creditCardAvailableNum, Math.max(0, purchaseAmountNum - cashUsed))
  
  const activeCreditCards = (creditCards || []).filter((card) => card && card.is_active)
  const currentTotalCreditUsed = activeCreditCards.reduce((sum, card) => {
    const balance = typeof card.current_balance === 'number' ? card.current_balance : 0
    return sum + (balance || 0)
  }, 0)
  const totalCreditUsed = currentTotalCreditUsed + (creditUsed || 0)
  const totalCreditLimit = activeCreditCards.reduce((sum, card) => {
    const limit = typeof card.credit_limit === 'number' ? card.credit_limit : 0
    return sum + (limit || 0)
  }, 0)
  const creditUtilization = totalCreditLimit > 0 && totalCreditUsed >= 0 ? (totalCreditUsed / totalCreditLimit) * 100 : 0
  // Remaining credit = available credit before purchase - credit used for purchase
  const remainingCredit = Math.max(0, (creditCardAvailable || 0) - (creditUsed || 0))
  const newAvailableBudget = remainingCash + upcomingIncome30Days - upcomingLiabilities30Days
  // Calculate overboard amount (how much exceeds available NOW)
  const overboardAmount = Math.max(0, purchaseAmountNum - availableNow)

  return {
    purchaseAmount: purchaseAmountNum,
    currentCash: currentCashNum,
    upcomingIncome30Days,
    upcomingLiabilities30Days,
    recentExpenses30Days,
    creditCardAvailable,
    availableBudget,
    availableNow,
    canAfford,
    status,
    paymentMethod,
    breakdown: {
      startingCash: currentCash,
      incomeAdded: upcomingIncome30Days,
      liabilitiesDeducted: upcomingLiabilities30Days,
      expensesDeducted: recentExpenses30Days,
      creditAvailable: creditCardAvailable,
      finalBudget: availableBudget,
      availableNow: availableNow,
    },
    afterPurchase: {
      remainingCash,
      remainingCredit,
      creditUtilization: Math.round(creditUtilization * 100) / 100,
      newAvailableBudget,
      overboardAmount,
    },
  }
}

