import { useFinancialSummary } from '../hooks'
import { formatCurrency } from '../lib/utils'

export function FinancialSnapshotCards() {
  const { summary, isLoading } = useFinancialSummary()

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-white p-6 rounded-lg shadow animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-24 mb-4"></div>
            <div className="h-8 bg-gray-200 rounded w-32"></div>
          </div>
        ))}
      </div>
    )
  }

  if (!summary) {
    return null
  }

  const cards = [
    {
      title: 'Available Cash',
      value: formatCurrency(summary.availableCash),
      color: 'text-green-600',
      bgColor: 'bg-green-50',
    },
    {
      title: 'Total Liabilities',
      value: formatCurrency(summary.totalLiabilities),
      color: 'text-red-600',
      bgColor: 'bg-red-50',
    },
    {
      title: 'Upcoming Bills',
      value: `${summary.upcomingBillsCount} (${formatCurrency(summary.upcomingBillsTotal)})`,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
    },
  ]

  // Only show credit cards info if user has credit cards
  if (summary.totalCreditLimit > 0) {
    cards.push({
      title: 'Available Credit',
      value: formatCurrency(summary.availableCreditLimit),
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
    })
    cards.push({
      title: 'Credit Utilization',
      value: `${summary.creditUtilization.toFixed(1)}%`,
      color:
        summary.creditUtilization > 80
          ? 'text-red-600'
          : summary.creditUtilization > 50
          ? 'text-orange-600'
          : 'text-green-600',
      bgColor:
        summary.creditUtilization > 80
          ? 'bg-red-50'
          : summary.creditUtilization > 50
          ? 'bg-orange-50'
          : 'bg-green-50',
    })
  }

  return (
    <div className={`grid grid-cols-1 md:grid-cols-2 ${cards.length > 4 ? 'lg:grid-cols-5' : 'lg:grid-cols-4'} gap-4`}>
      {cards.map((card, index) => (
        <div
          key={index}
          className={`bg-white p-6 rounded-lg shadow ${card.bgColor} border-l-4 ${
            card.color.includes('green')
              ? 'border-green-500'
              : card.color.includes('red')
              ? 'border-red-500'
              : 'border-orange-500'
          }`}
        >
          <h3 className="text-sm font-medium text-gray-600">{card.title}</h3>
          <p className={`text-2xl font-bold mt-2 ${card.color}`}>{card.value}</p>
        </div>
      ))}
    </div>
  )
}

