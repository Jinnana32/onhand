import { useState } from 'react'
import { useLiabilities, useCreditCards } from '../hooks'
import { Liability } from '../types/database.types'
import { formatCurrency } from '../lib/utils'
import { Modal } from '../components/Modal'

export function Liabilities() {
  const {
    liabilities,
    isLoading,
    createLiability,
    updateLiability,
    deleteLiability,
    isCreating,
    isUpdating,
    isDeleting,
  } = useLiabilities()
  
  const { creditCards } = useCreditCards()

  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingLiability, setEditingLiability] = useState<Liability | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const [formData, setFormData] = useState({
    name: '',
    amount: '',
    due_date: '',
    category: 'credit_card' as Liability['category'],
    source: '',
    credit_card_id: '',
    credit_limit: '',
    current_balance: '',
    months_to_pay: '',
    start_date: new Date().toISOString().split('T')[0],
  })

  const handleOpenModal = (liability?: Liability) => {
    if (liability) {
      setEditingLiability(liability)
      setFormData({
        name: liability.name,
        amount: liability.amount.toString(),
        due_date: liability.due_date.toString(),
        category: liability.category,
        source: liability.source || '',
        credit_card_id: liability.credit_card_id || '',
        credit_limit: liability.credit_limit?.toString() || '',
        current_balance: liability.current_balance.toString(),
        months_to_pay: liability.months_to_pay?.toString() || '',
        start_date: liability.start_date || new Date().toISOString().split('T')[0],
      })
    } else {
      setEditingLiability(null)
      setFormData({
        name: '',
        amount: '',
        due_date: '',
        category: 'credit_card',
        source: '',
        credit_card_id: '',
        credit_limit: '',
        current_balance: '',
        months_to_pay: '',
        start_date: new Date().toISOString().split('T')[0],
      })
    }
    setIsModalOpen(true)
  }

  const handleCloseModal = () => {
    setIsModalOpen(false)
    setEditingLiability(null)
    setFormData({
      name: '',
      amount: '',
      due_date: '',
      category: 'credit_card',
      source: '',
      credit_card_id: '',
      credit_limit: '',
      current_balance: '',
      months_to_pay: '',
      start_date: new Date().toISOString().split('T')[0],
    })
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const amount = parseFloat(formData.amount)
    const dueDate = parseInt(formData.due_date)
    const currentBalance = parseFloat(formData.current_balance) || 0
    const creditLimit = formData.credit_limit ? parseFloat(formData.credit_limit) : null

    if (isNaN(amount) || amount <= 0) {
      alert('Please enter a valid amount')
      return
    }

    if (isNaN(dueDate) || dueDate < 1 || dueDate > 31) {
      alert('Please enter a valid due date (1-31)')
      return
    }

    const monthsToPay = formData.months_to_pay ? parseInt(formData.months_to_pay) : null
    if (formData.months_to_pay && (isNaN(monthsToPay!) || monthsToPay! < 1)) {
      alert('Please enter a valid number of months (1 or more), or leave empty for recurring forever')
      return
    }

    const input = {
      name: formData.name,
      amount,
      due_date: dueDate,
      category: formData.category,
      source: formData.source || null,
      credit_card_id: formData.credit_card_id || null,
      credit_limit: creditLimit,
      current_balance: currentBalance,
      months_to_pay: monthsToPay,
      start_date: formData.start_date || null,
    }

    if (editingLiability) {
      updateLiability(
        {
          id: editingLiability.id,
          updates: input,
        },
        {
          onSuccess: () => {
            handleCloseModal()
          },
          onError: (error: Error) => {
            alert('Error updating liability: ' + (error instanceof Error ? error.message : 'Unknown error'))
          },
        }
      )
    } else {
      createLiability(input, {
        onSuccess: () => {
          handleCloseModal()
        },
        onError: (error: Error) => {
          alert('Error creating liability: ' + (error instanceof Error ? error.message : 'Unknown error'))
        },
      })
    }
  }

  const handleDelete = (id: string) => {
    if (window.confirm('Are you sure you want to delete this liability?')) {
      setDeletingId(id)
      deleteLiability(id, {
        onSuccess: () => {
          setDeletingId(null)
        },
        onError: (error: Error) => {
          alert('Error deleting liability: ' + (error instanceof Error ? error.message : 'Unknown error'))
          setDeletingId(null)
        },
      })
    }
  }

  const handleToggleActive = (liability: Liability) => {
    updateLiability(
      {
        id: liability.id,
        updates: { is_active: !liability.is_active },
      },
      {
        onError: (error: Error) => {
          alert('Error updating liability: ' + (error instanceof Error ? error.message : 'Unknown error'))
        },
      }
    )
  }

  if (isLoading) {
    return (
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Liabilities</h2>
        <div className="animate-pulse">Loading...</div>
      </div>
    )
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Liabilities</h2>
        <button
          onClick={() => handleOpenModal()}
          className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
        >
          + Add Liability
        </button>
      </div>

      {liabilities.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <p className="text-gray-500 mb-4">No liabilities yet.</p>
          <button
            onClick={() => handleOpenModal()}
            className="text-indigo-600 hover:text-indigo-700 font-medium"
          >
            Add your first liability
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Source
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Amount
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Due Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Category
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Balance / Limit
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {liabilities.map((liability) => (
                <tr key={liability.id} className={!liability.is_active ? 'opacity-50' : ''}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{liability.name}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {liability.source ? (
                      <span className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-800 rounded">
                        {liability.source}
                      </span>
                    ) : (
                      <span className="text-sm text-gray-400">—</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{formatCurrency(liability.amount)}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">Day {liability.due_date}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="px-2 py-1 text-xs font-medium bg-purple-100 text-purple-800 rounded">
                      {liability.category.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {formatCurrency(liability.current_balance)}
                      {liability.credit_limit && (
                        <span className="text-gray-500">
                          {' '}
                          / {formatCurrency(liability.credit_limit)}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <button
                      onClick={() => handleToggleActive(liability)}
                      className={`px-2 py-1 text-xs font-medium rounded ${
                        liability.is_active
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {liability.is_active ? 'Active' : 'Inactive'}
                    </button>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button
                      onClick={() => handleOpenModal(liability)}
                      className="text-indigo-600 hover:text-indigo-900 mr-4"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(liability.id)}
                      disabled={deletingId === liability.id}
                      className="text-red-600 hover:text-red-900 disabled:opacity-50"
                    >
                      {deletingId === liability.id ? 'Deleting...' : 'Delete'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        title={editingLiability ? 'Edit Liability' : 'Add Liability'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700">
              Name
            </label>
            <input
              type="text"
              id="name"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="e.g., BPI Credit Card, Atome Loan"
            />
          </div>

          <div>
            <label htmlFor="amount" className="block text-sm font-medium text-gray-700">
              Monthly Amount (₱)
            </label>
            <input
              type="number"
              id="amount"
              required
              step="0.01"
              min="0"
              value={formData.amount}
              onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="0.00"
            />
          </div>

          <div>
            <label htmlFor="due_date" className="block text-sm font-medium text-gray-700">
              Due Date (Day of Month, 1-31)
            </label>
            <input
              type="number"
              id="due_date"
              required
              min="1"
              max="31"
              value={formData.due_date}
              onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="15"
            />
          </div>

          <div>
            <label htmlFor="category" className="block text-sm font-medium text-gray-700">
              Category
            </label>
            <select
              id="category"
              required
              value={formData.category}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  category: e.target.value as Liability['category'],
                })
              }
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value="credit_card">Credit Card</option>
              <option value="loan">Loan</option>
              <option value="installment">Installment</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div>
            <label htmlFor="source" className="block text-sm font-medium text-gray-700">
              Source / Account (Optional)
            </label>
            <input
              type="text"
              id="source"
              value={formData.source}
              onChange={(e) => setFormData({ ...formData, source: e.target.value })}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="e.g., BPI, RCBC, Atome, Home Credit"
            />
            <p className="mt-1 text-xs text-gray-500">
              For credit cards: enter the bank name (BPI, RCBC, etc.). For loans: enter the provider name.
            </p>
          </div>

          {formData.category === 'credit_card' && (
            <>
              {creditCards.length > 0 && (
                <div>
                  <label htmlFor="credit_card_id" className="block text-sm font-medium text-gray-700">
                    Link to Credit Card (Optional)
                  </label>
                  <select
                    id="credit_card_id"
                    value={formData.credit_card_id}
                    onChange={(e) => {
                      const selectedCard = creditCards.find(c => c.id === e.target.value)
                      setFormData({
                        ...formData,
                        credit_card_id: e.target.value,
                        credit_limit: selectedCard ? selectedCard.credit_limit.toString() : formData.credit_limit,
                        current_balance: selectedCard ? selectedCard.current_balance.toString() : formData.current_balance,
                      })
                    }}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  >
                    <option value="">Select a credit card...</option>
                    {creditCards.filter(c => c.is_active).map((card) => (
                      <option key={card.id} value={card.id}>
                        {card.bank} - {card.name} (Limit: {formatCurrency(card.credit_limit)})
                      </option>
                    ))}
                  </select>
                  <p className="mt-1 text-xs text-gray-500">
                    Select a registered credit card to link this liability. Credit limit and balance will be auto-filled.
                  </p>
                </div>
              )}
              <div>
                <label htmlFor="credit_limit" className="block text-sm font-medium text-gray-700">
                  Credit Limit (₱)
                </label>
                <input
                  type="number"
                  id="credit_limit"
                  step="0.01"
                  min="0"
                  value={formData.credit_limit}
                  onChange={(e) => setFormData({ ...formData, credit_limit: e.target.value })}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="0.00"
                />
              </div>
            </>
          )}

          <div>
            <label htmlFor="current_balance" className="block text-sm font-medium text-gray-700">
              Current Balance (₱)
            </label>
            <input
              type="number"
              id="current_balance"
              step="0.01"
              min="0"
              value={formData.current_balance}
              onChange={(e) => setFormData({ ...formData, current_balance: e.target.value })}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="0.00"
            />
          </div>

          <div>
            <label htmlFor="start_date" className="block text-sm font-medium text-gray-700">
              Start Date
            </label>
            <input
              type="date"
              id="start_date"
              required
              value={formData.start_date}
              onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            />
            <p className="mt-1 text-xs text-gray-500">
              When does this payment period start?
            </p>
          </div>

          <div>
            <label htmlFor="months_to_pay" className="block text-sm font-medium text-gray-700">
              Months to Pay
            </label>
            <input
              type="number"
              id="months_to_pay"
              min="1"
              value={formData.months_to_pay}
              onChange={(e) => setFormData({ ...formData, months_to_pay: e.target.value })}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="Leave empty for recurring forever"
            />
            <p className="mt-1 text-xs text-gray-500">
              Number of months to pay this liability. Leave empty if it's recurring forever (e.g., credit card bills).
            </p>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={handleCloseModal}
              className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isCreating || isUpdating}
              className="px-4 py-2 bg-indigo-600 text-white rounded-md text-sm font-medium hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
            >
              {isCreating || isUpdating
                ? 'Saving...'
                : editingLiability
                ? 'Update'
                : 'Create'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
