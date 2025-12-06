import { useState } from 'react'
import { useCreditCards } from '../hooks/useCreditCards'
import { CreditCard } from '../types/database.types'
import { formatCurrency } from '../lib/utils'
import { Modal } from '../components/Modal'

export function CreditCards() {
  const {
    creditCards,
    isLoading,
    createCreditCard,
    updateCreditCard,
    deleteCreditCard,
    isCreating,
    isUpdating,
  } = useCreditCards()

  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingCard, setEditingCard] = useState<CreditCard | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const [formData, setFormData] = useState({
    name: '',
    bank: '',
    credit_limit: '',
    current_balance: '',
    due_date: '',
  })

  const handleOpenModal = (card?: CreditCard) => {
    if (card) {
      setEditingCard(card)
      setFormData({
        name: card.name,
        bank: card.bank,
        credit_limit: card.credit_limit.toString(),
        current_balance: card.current_balance.toString(),
        due_date: card.due_date.toString(),
      })
    } else {
      setEditingCard(null)
      setFormData({
        name: '',
        bank: '',
        credit_limit: '',
        current_balance: '',
        due_date: '',
      })
    }
    setIsModalOpen(true)
  }

  const handleCloseModal = () => {
    setIsModalOpen(false)
    setEditingCard(null)
    setFormData({
      name: '',
      bank: '',
      credit_limit: '',
      current_balance: '',
      due_date: '',
    })
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const creditLimit = parseFloat(formData.credit_limit)
    const currentBalance = parseFloat(formData.current_balance) || 0
    const dueDate = parseInt(formData.due_date)

    if (isNaN(creditLimit) || creditLimit <= 0) {
      alert('Please enter a valid credit limit')
      return
    }

    if (isNaN(dueDate) || dueDate < 1 || dueDate > 31) {
      alert('Please enter a valid due date (1-31)')
      return
    }

    const input = {
      name: formData.name,
      bank: formData.bank,
      credit_limit: creditLimit,
      current_balance: currentBalance,
      due_date: dueDate,
    }

    if (editingCard) {
      updateCreditCard(
        {
          id: editingCard.id,
          updates: input,
        },
        {
          onSuccess: () => {
            handleCloseModal()
          },
          onError: (error: Error) => {
            alert('Error updating credit card: ' + (error instanceof Error ? error.message : 'Unknown error'))
          },
        }
      )
    } else {
      createCreditCard(input, {
        onSuccess: () => {
          handleCloseModal()
        },
        onError: (error: Error) => {
          alert('Error creating credit card: ' + (error instanceof Error ? error.message : 'Unknown error'))
        },
      })
    }
  }

  const handleDelete = (id: string) => {
    if (window.confirm('Are you sure you want to delete this credit card? This will also unlink any liabilities associated with it.')) {
      setDeletingId(id)
      deleteCreditCard(id, {
        onSuccess: () => {
          setDeletingId(null)
        },
        onError: (error: Error) => {
          alert('Error deleting credit card: ' + (error instanceof Error ? error.message : 'Unknown error'))
          setDeletingId(null)
        },
      })
    }
  }

  const handleToggleActive = (card: CreditCard) => {
    updateCreditCard(
      {
        id: card.id,
        updates: { is_active: !card.is_active },
      },
      {
        onError: (error: Error) => {
          alert('Error updating credit card: ' + (error instanceof Error ? error.message : 'Unknown error'))
        },
      }
    )
  }

  if (isLoading) {
    return (
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Credit Cards</h2>
        <div className="animate-pulse">Loading...</div>
      </div>
    )
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Credit Cards</h2>
          <p className="text-sm text-gray-600 mt-1">
            Manage your credit card accounts. Link them to liabilities to track monthly bills.
          </p>
        </div>
        <button
          onClick={() => handleOpenModal()}
          className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
        >
          + Add Credit Card
        </button>
      </div>

      {creditCards.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <p className="text-gray-500 mb-4">No credit cards registered yet.</p>
          <button
            onClick={() => handleOpenModal()}
            className="text-indigo-600 hover:text-indigo-700 font-medium"
          >
            Add your first credit card
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Card Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Bank
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Credit Limit
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Current Balance
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Available Credit
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Utilization
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Due Date
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
              {creditCards.map((card) => {
                const availableCredit = card.credit_limit - card.current_balance
                const utilization = (card.current_balance / card.credit_limit) * 100
                return (
                  <tr key={card.id} className={!card.is_active ? 'opacity-50' : ''}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{card.name}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2 py-1 text-xs font-medium bg-indigo-100 text-indigo-800 rounded">
                        {card.bank}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{formatCurrency(card.credit_limit)}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{formatCurrency(card.current_balance)}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className={`text-sm font-medium ${
                        availableCredit < card.credit_limit * 0.1 
                          ? 'text-red-600' 
                          : availableCredit < card.credit_limit * 0.3
                          ? 'text-orange-600'
                          : 'text-green-600'
                      }`}>
                        {formatCurrency(availableCredit)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="w-16 bg-gray-200 rounded-full h-2 mr-2">
                          <div
                            className={`h-2 rounded-full ${
                              utilization > 80
                                ? 'bg-red-600'
                                : utilization > 50
                                ? 'bg-orange-600'
                                : 'bg-green-600'
                            }`}
                            style={{ width: `${Math.min(utilization, 100)}%` }}
                          ></div>
                        </div>
                        <span className="text-sm text-gray-600">{utilization.toFixed(1)}%</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">Day {card.due_date}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <button
                        onClick={() => handleToggleActive(card)}
                        className={`px-2 py-1 text-xs font-medium rounded ${
                          card.is_active
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {card.is_active ? 'Active' : 'Inactive'}
                      </button>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => handleOpenModal(card)}
                        className="text-indigo-600 hover:text-indigo-900 mr-4"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(card.id)}
                        disabled={deletingId === card.id}
                        className="text-red-600 hover:text-red-900 disabled:opacity-50"
                      >
                        {deletingId === card.id ? 'Deleting...' : 'Delete'}
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      <Modal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        title={editingCard ? 'Edit Credit Card' : 'Add Credit Card'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700">
              Card Name
            </label>
            <input
              type="text"
              id="name"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="e.g., BPI Gold, RCBC Visa"
            />
          </div>

          <div>
            <label htmlFor="bank" className="block text-sm font-medium text-gray-700">
              Bank
            </label>
            <input
              type="text"
              id="bank"
              required
              value={formData.bank}
              onChange={(e) => setFormData({ ...formData, bank: e.target.value })}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="e.g., BPI, RCBC, BDO"
            />
          </div>

          <div>
            <label htmlFor="credit_limit" className="block text-sm font-medium text-gray-700">
              Credit Limit (₱)
            </label>
            <input
              type="number"
              id="credit_limit"
              required
              step="0.01"
              min="0"
              value={formData.credit_limit}
              onChange={(e) => setFormData({ ...formData, credit_limit: e.target.value })}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="0.00"
            />
          </div>

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
                : editingCard
                ? 'Update'
                : 'Create'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}

