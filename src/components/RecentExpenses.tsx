import { useExpenses } from '../hooks'
import { formatCurrency, formatDate } from '../lib/utils'

export function RecentExpenses() {
  const { expenses, isLoading } = useExpenses()

  const recentExpenses = expenses.slice(0, 5)

  if (isLoading) {
    return (
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Expenses</h3>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
              <div className="h-3 bg-gray-200 rounded w-1/2"></div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Recent Expenses</h3>
        {expenses.length > 5 && (
          <button className="text-sm text-indigo-600 hover:text-indigo-700">
            View All ({expenses.length})
          </button>
        )}
      </div>
      {recentExpenses.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <p>No expenses logged yet.</p>
          <p className="text-sm mt-2">Start tracking your purchases!</p>
        </div>
      ) : (
        <div className="space-y-3">
          {recentExpenses.map((expense) => (
            <div
              key={expense.id}
              className="flex justify-between items-start py-3 border-b border-gray-100 last:border-0"
            >
              <div className="flex-1">
                <p className="font-medium text-gray-900">{expense.description}</p>
                <div className="flex items-center gap-2 mt-1">
                  <p className="text-sm text-gray-500">{formatDate(expense.expense_date)}</p>
                  {expense.category && (
                    <>
                      <span className="text-gray-300">•</span>
                      <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded">
                        {expense.category}
                      </span>
                    </>
                  )}
                </div>
              </div>
              <p className="text-lg font-semibold text-gray-900 ml-4">
                {formatCurrency(expense.amount)}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

