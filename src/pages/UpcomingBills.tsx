import { useState, useMemo } from 'react'
import { useLiabilities } from '../hooks'
import { formatCurrency } from '../lib/utils'
import { Liability } from '../types/database.types'

export function UpcomingBills() {
  const { liabilities, isLoading } = useLiabilities()
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth())
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())

  // Get month name
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ]

  // Filter active liabilities and calculate which ones are due in the selected month
  const billsForMonth = useMemo(() => {
    if (!liabilities) return []

    const activeLiabilities = liabilities.filter((l) => l.is_active)
    const bills: Array<{ liability: Liability; dueDate: Date }> = []
    const selectedMonthDate = new Date(selectedYear, selectedMonth, 1)
    const selectedMonthEndDate = new Date(selectedYear, selectedMonth + 1, 0)

    activeLiabilities.forEach((liability) => {
      // Check if liability is within payment period
      const startDate = liability.start_date ? new Date(liability.start_date) : new Date(liability.created_at)
      startDate.setHours(0, 0, 0, 0)
      
      let endDate: Date | null = null
      if (liability.months_to_pay !== null && liability.months_to_pay > 0) {
        endDate = new Date(startDate)
        endDate.setMonth(endDate.getMonth() + liability.months_to_pay)
        endDate.setHours(23, 59, 59, 999)
      }

      // Check if selected month is within payment period
      if (endDate && selectedMonthDate > endDate) {
        return // Payment period has ended
      }
      if (selectedMonthEndDate < startDate) {
        return // Payment period hasn't started yet
      }

      const dueDay = liability.due_date
      
      // Create date for the selected month and year with the due day
      const dueDate = new Date(selectedYear, selectedMonth, dueDay)
      
      // Only include if the date is valid (handles cases like Feb 30)
      if (dueDate.getDate() === dueDay && dueDate.getMonth() === selectedMonth) {
        // Check if this specific due date is within the payment period
        if (!endDate || dueDate <= endDate) {
          bills.push({ liability, dueDate })
        }
      }
    })

    // Sort by due date
    return bills.sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime())
  }, [liabilities, selectedMonth, selectedYear])

  // Calculate totals
  const totalAmount = useMemo(() => {
    return billsForMonth.reduce((sum, bill) => sum + bill.liability.amount, 0)
  }, [billsForMonth])

  // Group bills by due date
  const billsByDate = useMemo(() => {
    const grouped: Record<number, Array<{ liability: Liability; dueDate: Date }>> = {}
    
    billsForMonth.forEach((bill) => {
      const day = bill.dueDate.getDate()
      if (!grouped[day]) {
        grouped[day] = []
      }
      grouped[day].push(bill)
    })
    
    return grouped
  }, [billsForMonth])

  // Navigation functions
  const goToPreviousMonth = () => {
    if (selectedMonth === 0) {
      setSelectedMonth(11)
      setSelectedYear(selectedYear - 1)
    } else {
      setSelectedMonth(selectedMonth - 1)
    }
  }

  const goToNextMonth = () => {
    if (selectedMonth === 11) {
      setSelectedMonth(0)
      setSelectedYear(selectedYear + 1)
    } else {
      setSelectedMonth(selectedMonth + 1)
    }
  }

  const goToCurrentMonth = () => {
    const now = new Date()
    setSelectedMonth(now.getMonth())
    setSelectedYear(now.getFullYear())
  }

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'credit_card':
        return 'bg-blue-100 text-blue-800'
      case 'loan':
        return 'bg-purple-100 text-purple-800'
      case 'installment':
        return 'bg-orange-100 text-orange-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getCategoryLabel = (category: string) => {
    switch (category) {
      case 'credit_card':
        return 'Credit Card'
      case 'loan':
        return 'Loan'
      case 'installment':
        return 'Installment'
      default:
        return 'Other'
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-900">Upcoming Bills</h2>
        </div>
        <div className="bg-white p-6 rounded-lg shadow animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Upcoming Bills</h2>
      </div>

      {/* Month Selector */}
      <div className="bg-white p-4 rounded-lg shadow">
        <div className="flex items-center justify-between">
          <button
            onClick={goToPreviousMonth}
            className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          
          <div className="flex items-center gap-4">
            <h3 className="text-lg font-semibold text-gray-900">
              {monthNames[selectedMonth]} {selectedYear}
            </h3>
            <button
              onClick={goToCurrentMonth}
              className="px-3 py-1 text-sm text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 rounded-md"
            >
              Today
            </button>
          </div>

          <button
            onClick={goToNextMonth}
            className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>

      {/* Summary Card */}
      <div className="bg-white p-6 rounded-lg shadow">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600">Total Bills for {monthNames[selectedMonth]}</p>
            <p className="text-3xl font-bold text-gray-900 mt-1">
              {formatCurrency(totalAmount)}
            </p>
            <p className="text-sm text-gray-500 mt-1">
              {billsForMonth.length} {billsForMonth.length === 1 ? 'bill' : 'bills'}
            </p>
          </div>
        </div>
      </div>

      {/* Bills List */}
      {billsForMonth.length === 0 ? (
        <div className="bg-white p-12 rounded-lg shadow text-center">
          <p className="text-gray-500 text-lg">No bills due in {monthNames[selectedMonth]} {selectedYear}</p>
        </div>
      ) : (
        <div className="space-y-4">
          {Object.keys(billsByDate)
            .sort((a, b) => parseInt(a) - parseInt(b))
            .map((day) => {
              const dayBills = billsByDate[parseInt(day)]
              const dayTotal = dayBills.reduce((sum, bill) => sum + bill.liability.amount, 0)
              const isPast = new Date(selectedYear, selectedMonth, parseInt(day)) < new Date(new Date().setHours(0, 0, 0, 0))

              return (
                <div key={day} className="bg-white rounded-lg shadow">
                  <div className={`px-6 py-3 border-l-4 ${
                    isPast ? 'bg-red-50 border-red-500' : 'bg-blue-50 border-blue-500'
                  }`}>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600">
                          {new Date(selectedYear, selectedMonth, parseInt(day)).toLocaleDateString('en-US', {
                            weekday: 'long',
                          })}
                        </p>
                        <p className="text-xl font-bold text-gray-900">
                          {parseInt(day)} {monthNames[selectedMonth]}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium text-gray-600">Total</p>
                        <p className={`text-xl font-bold ${isPast ? 'text-red-600' : 'text-blue-600'}`}>
                          {formatCurrency(dayTotal)}
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="px-6 py-4 space-y-3">
                    {dayBills.map((bill) => (
                      <div
                        key={bill.liability.id}
                        className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0"
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-medium text-gray-900">{bill.liability.name}</h4>
                            <span className={`px-2 py-1 text-xs font-medium rounded ${getCategoryColor(bill.liability.category)}`}>
                              {getCategoryLabel(bill.liability.category)}
                            </span>
                          </div>
                          {bill.liability.source && (
                            <p className="text-sm text-gray-500">{bill.liability.source}</p>
                          )}
                          {bill.liability.credit_card_id && (
                            <p className="text-sm text-gray-500">Credit Card Payment</p>
                          )}
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-semibold text-gray-900">
                            {formatCurrency(bill.liability.amount)}
                          </p>
                          {bill.liability.current_balance > 0 && (
                            <p className="text-xs text-gray-500">
                              Balance: {formatCurrency(bill.liability.current_balance)}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
        </div>
      )}
    </div>
  )
}

