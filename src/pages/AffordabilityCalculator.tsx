import { useState } from 'react'
import { useProfile, useLiabilities, useIncomeSources, useExpenses, useCreditCards } from '../hooks'
import { calculateAffordability, AffordabilityCalculation } from '../lib/affordability'
import { formatCurrency } from '../lib/utils'

export function AffordabilityCalculator() {
  const { profile } = useProfile()
  const { liabilities } = useLiabilities()
  const { incomeSources } = useIncomeSources()
  const { expenses } = useExpenses()
  const { creditCards } = useCreditCards()

  const [purchaseAmount, setPurchaseAmount] = useState('')
  const [calculation, setCalculation] = useState<AffordabilityCalculation | null>(null)

  const handleCalculate = () => {
    const amount = parseFloat(purchaseAmount)
    if (isNaN(amount) || amount <= 0) {
      alert('Please enter a valid amount')
      return
    }

    if (!profile) {
      alert('Profile not loaded yet')
      return
    }

    const result = calculateAffordability(
      amount,
      profile.current_cash,
      liabilities,
      incomeSources,
      expenses,
      creditCards
    )

    setCalculation(result)
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'affordable':
        return 'text-green-700 bg-green-50 border-green-200'
      case 'tight':
        return 'text-yellow-700 bg-yellow-50 border-yellow-200'
      case 'unaffordable':
        return 'text-red-700 bg-red-50 border-red-200'
      default:
        return 'text-gray-700 bg-gray-50 border-gray-200'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'affordable':
        return '✓'
      case 'tight':
        return '⚠'
      case 'unaffordable':
        return '✗'
      default:
        return ''
    }
  }

  const getStatusMessage = (status: string, paymentMethod?: string) => {
    switch (status) {
      case 'affordable':
        if (paymentMethod === 'cash') {
          return 'You can afford this purchase with cash!'
        } else if (paymentMethod === 'credit') {
          return 'You can afford this purchase using credit card (no cash on hand)'
        } else if (paymentMethod === 'both') {
          return 'You can afford this purchase with cash and credit'
        }
        return 'You can afford this purchase!'
      case 'tight':
        return 'You can afford this, but it requires future income that hasn\'t been received yet.'
      case 'unaffordable':
        return "You can't afford this purchase right now."
      default:
        return ''
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Affordability Calculator</h2>
        <p className="text-gray-600">
          Calculate if you can afford a purchase based on your current financial situation.
        </p>
      </div>

      <div className="bg-white p-6 rounded-lg shadow">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <label htmlFor="purchase-amount" className="block text-sm font-medium text-gray-700 mb-2">
              How much do you want to spend? (₱)
            </label>
            <input
              id="purchase-amount"
              type="number"
              step="0.01"
              min="0"
              value={purchaseAmount}
              onChange={(e) => setPurchaseAmount(e.target.value)}
              placeholder="0.00"
              className="block w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
          <div className="flex items-end">
            <button
              onClick={handleCalculate}
              className="w-full sm:w-auto px-6 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              Calculate
            </button>
          </div>
        </div>
      </div>

      {calculation && (
        <>
          {/* Result Card */}
          {(() => {
            const isOverboard = calculation.afterPurchase.overboardAmount > 10000
            const statusColor = isOverboard && calculation.status === 'tight' 
              ? 'text-red-700 bg-red-50 border-red-200' 
              : getStatusColor(calculation.status)
            const statusIcon = isOverboard && calculation.status === 'tight'
              ? '🚩'
              : getStatusIcon(calculation.status)
            const statusMessage = isOverboard && calculation.status === 'tight'
              ? 'Warning: This purchase requires a significant amount from future income that hasn\'t been received yet.'
              : getStatusMessage(calculation.status, calculation.paymentMethod)
            
            return (
              <div className={`bg-white p-6 rounded-lg shadow border-2 ${statusColor}`}>
                <div className="flex items-center gap-3 mb-4">
                  <span className="text-3xl">{statusIcon}</span>
                  <div>
                    <h3 className="text-xl font-bold">{statusMessage}</h3>
                    <p className="text-sm opacity-75">
                      Purchase Amount: {formatCurrency(calculation.purchaseAmount)}
                    </p>
                    {isOverboard && calculation.status === 'tight' && (
                      <p className="text-xs mt-1 opacity-75">
                        You're overboard by <strong>{formatCurrency(calculation.afterPurchase.overboardAmount)}</strong> - This is a substantial amount that requires a reliable source of future income.
                      </p>
                    )}
                    {calculation.paymentMethod === 'credit' && !isOverboard && (
                      <p className="text-xs mt-1 opacity-75">
                        ⚠️ This purchase will use your credit card since you don't have cash on hand
                      </p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
              <div>
                <p className="text-sm font-medium mb-1">Available NOW</p>
                <p className="text-2xl font-bold text-blue-600">
                  {formatCurrency(calculation.availableNow)}
                </p>
                <p className="text-xs text-gray-500 mt-1">Cash + Credit (no future income)</p>
              </div>
              <div>
                <p className="text-sm font-medium mb-1">With Future Income</p>
                <p className="text-2xl font-bold text-green-600">
                  {formatCurrency(calculation.availableBudget)}
                </p>
                <p className="text-xs text-gray-500 mt-1">Includes income in next 30 days</p>
              </div>
              {calculation.creditCardAvailable > 0 && (
                <div>
                  <p className="text-sm font-medium mb-1">Available Credit</p>
                  <p className="text-2xl font-bold">{formatCurrency(calculation.creditCardAvailable)}</p>
                </div>
              )}
                </div>
              </div>
            )
          })()}

          {/* Breakdown Card */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Calculation Breakdown</h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center py-2 border-b border-gray-100">
                <span className="text-gray-700">Starting Cash</span>
                <span className="font-medium">{formatCurrency(calculation.breakdown.startingCash)}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-gray-100">
                <span className="text-gray-700">+ Upcoming Income (next 30 days)</span>
                <span className="font-medium text-green-600">
                  +{formatCurrency(calculation.breakdown.incomeAdded)}
                </span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-gray-100">
                <span className="text-gray-700">- Upcoming Liabilities (next 30 days)</span>
                <span className="font-medium text-red-600">
                  -{formatCurrency(calculation.breakdown.liabilitiesDeducted)}
                </span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-gray-100">
                <span className="text-gray-700">- Recent Expenses (last 30 days)</span>
                <span className="font-medium text-red-600">
                  -{formatCurrency(calculation.breakdown.expensesDeducted)}
                </span>
              </div>
              {calculation.breakdown.creditAvailable > 0 && (
                <div className="flex justify-between items-center py-2 border-b border-gray-100">
                  <span className="text-gray-700">+ Available Credit Card Limit</span>
                  <span className="font-medium text-blue-600">
                    +{formatCurrency(calculation.breakdown.creditAvailable)}
                  </span>
                </div>
              )}
              <div className="flex justify-between items-center py-2 border-b border-gray-100">
                <span className="text-gray-700">= Available NOW (Cash + Credit)</span>
                <span className="font-medium text-blue-600">
                  {formatCurrency(calculation.breakdown.availableNow)}
                </span>
              </div>
              <div className="flex justify-between items-center py-3 border-t-2 border-gray-300 mt-2">
                <span className="font-semibold text-gray-900">Available with Future Income</span>
                <span className="text-xl font-bold text-gray-900">
                  {formatCurrency(calculation.breakdown.finalBudget)}
                </span>
              </div>
            </div>
          </div>

          {/* After Purchase Impact */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">If You Make This Purchase</h3>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-600 mb-1">Remaining Cash</p>
                  <p className="text-xl font-bold text-gray-900">
                    {formatCurrency(calculation.afterPurchase.remainingCash)}
                  </p>
                </div>
                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-600 mb-1">Remaining Credit</p>
                  <p className="text-xl font-bold text-gray-900">
                    {formatCurrency(calculation.afterPurchase.remainingCredit)}
                  </p>
                </div>
                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-600 mb-1">Credit Utilization</p>
                  <p className="text-xl font-bold text-gray-900">
                    {calculation.afterPurchase.creditUtilization.toFixed(1)}%
                  </p>
                </div>
                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-600 mb-1">New Available Budget</p>
                  <p className="text-xl font-bold text-gray-900">
                    {formatCurrency(calculation.afterPurchase.newAvailableBudget)}
                  </p>
                </div>
                <div className={`p-4 rounded-lg ${
                  calculation.afterPurchase.overboardAmount > 0 
                    ? 'bg-red-50 border border-red-200' 
                    : 'bg-gray-50'
                }`}>
                  <p className="text-sm text-gray-600 mb-1">Overboard Amount</p>
                  <p className={`text-xl font-bold ${
                    calculation.afterPurchase.overboardAmount > 0 
                      ? 'text-red-600' 
                      : 'text-gray-900'
                  }`}>
                    {formatCurrency(calculation.afterPurchase.overboardAmount)}
                  </p>
                </div>
              </div>

              {calculation.status === 'tight' && (
                <div className={`mt-4 p-4 rounded-lg border ${
                  calculation.afterPurchase.overboardAmount > 10000
                    ? 'bg-red-50 border-red-300'
                    : 'bg-yellow-50 border-yellow-200'
                }`}>
                  <p className={`text-sm ${
                    calculation.afterPurchase.overboardAmount > 10000
                      ? 'text-red-800'
                      : 'text-yellow-800'
                  }`}>
                    {calculation.afterPurchase.overboardAmount > 10000 ? (
                      <>
                        <strong>🚩 Warning:</strong> This purchase requires a significant amount from future income that hasn't been received yet.
                        <br />
                        <strong>Available NOW:</strong> {formatCurrency(calculation.availableNow)} (Cash + Credit)
                        <br />
                        You're overboard by <strong>{formatCurrency(calculation.afterPurchase.overboardAmount)}</strong>, which will need to be covered by future income. This is a substantial amount - make sure you have a reliable source of income coming in and can pay this off before interest accrues.
                      </>
                    ) : (
                      <>
                        <strong>⚠️ Note:</strong> You can afford this, but it requires future income that hasn't been received yet.
                        <br />
                        <strong>Available NOW:</strong> {formatCurrency(calculation.availableNow)} (Cash + Credit)
                        <br />
                        You're short by {formatCurrency(
                          Math.max(0, calculation.purchaseAmount - calculation.availableNow)
                        )}{' '}
                        which will be covered by future income. Make sure you can pay this off before interest accrues.
                      </>
                    )}
                  </p>
                </div>
              )}

              {calculation.status === 'unaffordable' && (
                <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm text-red-800">
                    <strong>Warning:</strong> You don't have enough funds or credit to make this purchase.
                    You're short by{' '}
                    {formatCurrency(
                      calculation.purchaseAmount -
                        (calculation.availableBudget + calculation.creditCardAvailable)
                    )}
                    .
                  </p>
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {!calculation && (
        <div className="bg-white p-12 rounded-lg shadow text-center">
          <p className="text-gray-500">Enter an amount above to calculate affordability</p>
        </div>
      )}
    </div>
  )
}

