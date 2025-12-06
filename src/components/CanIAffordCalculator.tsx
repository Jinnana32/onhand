import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useFinancialSummary } from '../hooks'
import { formatCurrency } from '../lib/utils'

export function CanIAffordCalculator() {
  const [amount, setAmount] = useState('')
  const { summary } = useFinancialSummary()

  const purchaseAmount = parseFloat(amount) || 0
  const canAfford =
    summary && purchaseAmount > 0
      ? summary.availableCash + summary.netCashFlow >= purchaseAmount
      : null

  return (
    <div className="bg-white p-6 rounded-lg shadow">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Can I Afford This?</h3>
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <label htmlFor="amount" className="block text-sm font-medium text-gray-700 mb-2">
            Purchase Amount (₱)
          </label>
          <div className="flex gap-2">
            <input
              id="amount"
              type="number"
              step="0.01"
              min="0"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              className="flex-1 px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
        </div>
        {purchaseAmount > 0 && summary && (
          <div className="flex items-center">
            <div
              className={`px-4 py-3 rounded-md ${
                canAfford
                  ? 'bg-green-50 border border-green-200'
                  : 'bg-red-50 border border-red-200'
              }`}
            >
              <div className="text-sm font-medium text-gray-700">Available Budget:</div>
              <div
                className={`text-xl font-bold ${
                  canAfford ? 'text-green-700' : 'text-red-700'
                }`}
              >
                {formatCurrency(summary.availableCash + summary.netCashFlow)}
              </div>
              <div className="text-xs text-gray-600 mt-1">
                {canAfford ? (
                  <span className="text-green-700">✓ You can afford this!</span>
                ) : (
                  <span className="text-red-700">
                    ✗ Short by {formatCurrency(purchaseAmount - (summary.availableCash + summary.netCashFlow))}
                  </span>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
      {summary && (
        <div className="mt-4 flex justify-between items-center">
          <p className="text-xs text-gray-500">
            Available Cash: {formatCurrency(summary.availableCash)} | Net Cash Flow:{' '}
            {formatCurrency(summary.netCashFlow)}
          </p>
          <Link
            to="/calculator"
            className="text-xs text-indigo-600 hover:text-indigo-700 font-medium"
          >
            View Detailed Calculator →
          </Link>
        </div>
      )}
    </div>
  )
}

