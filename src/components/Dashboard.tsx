import { FinancialSnapshotCards } from './FinancialSnapshotCards'
import { CanIAffordCalculator } from './CanIAffordCalculator'
import { RecentExpenses } from './RecentExpenses'
import { UpcomingBills } from './UpcomingBills'

export function Dashboard() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Dashboard</h2>
        <FinancialSnapshotCards />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <CanIAffordCalculator />
        <UpcomingBills />
      </div>

      <RecentExpenses />
    </div>
  )
}

