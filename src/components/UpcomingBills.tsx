import { useLiabilities } from '../hooks'
import { formatCurrency, getDaysUntilDue } from '../lib/utils'

export function UpcomingBills() {
  const { liabilities, isLoading } = useLiabilities()

  const currentDate = new Date()
  const currentDay = currentDate.getDate()

  // Get upcoming bills in the next 7 days
  const upcomingBills = liabilities
    .filter((liability) => {
      if (!liability.is_active) return false
      const daysUntil = getDaysUntilDue(liability.due_date)
      return daysUntil >= 0 && daysUntil <= 7
    })
    .sort((a, b) => getDaysUntilDue(a.due_date) - getDaysUntilDue(b.due_date))
    .slice(0, 5)

  if (isLoading) {
    return (
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Upcoming Bills (Next 7 Days)</h3>
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
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Upcoming Bills (Next 7 Days)</h3>
      {upcomingBills.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <p>No bills due in the next 7 days.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {upcomingBills.map((bill) => {
            const daysUntil = getDaysUntilDue(bill.due_date)
            return (
              <div
                key={bill.id}
                className="flex justify-between items-start py-3 border-b border-gray-100 last:border-0"
              >
                <div className="flex-1">
                  <p className="font-medium text-gray-900">{bill.name}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span
                      className={`text-xs px-2 py-0.5 rounded ${
                        daysUntil === 0
                          ? 'bg-red-100 text-red-700'
                          : daysUntil <= 2
                          ? 'bg-orange-100 text-orange-700'
                          : 'bg-blue-100 text-blue-700'
                      }`}
                    >
                      {daysUntil === 0
                        ? 'Due Today'
                        : daysUntil === 1
                        ? 'Due Tomorrow'
                        : `Due in ${daysUntil} days`}
                    </span>
                    <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded">
                      {bill.category}
                    </span>
                  </div>
                </div>
                <p className="text-lg font-semibold text-gray-900 ml-4">
                  {formatCurrency(bill.amount)}
                </p>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

