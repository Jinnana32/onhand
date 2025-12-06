import { useState } from 'react'
import { useIncomeSources } from '../hooks'
import { IncomeSource } from '../types/database.types'
import { formatCurrency, formatDate } from '../lib/utils'
import { Modal } from '../components/Modal'

export function Income() {
  const {
    incomeSources,
    isLoading,
    createIncomeSource,
    updateIncomeSource,
    deleteIncomeSource,
    isCreating,
    isUpdating,
  } = useIncomeSources()

  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingIncome, setEditingIncome] = useState<IncomeSource | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const [formData, setFormData] = useState({
    name: '',
    amount: '',
    frequency: 'monthly' as IncomeSource['frequency'],
    category: 'salary' as IncomeSource['category'],
    next_payment_date: '',
    payment_date: '',
  })

  const handleOpenModal = (income?: IncomeSource) => {
    if (income) {
      setEditingIncome(income)
      setFormData({
        name: income.name,
        amount: income.amount.toString(),
        frequency: income.frequency,
        category: income.category,
        next_payment_date: income.next_payment_date || '',
        payment_date: income.payment_date || '',
      })
    } else {
      setEditingIncome(null)
      setFormData({
        name: '',
        amount: '',
        frequency: 'monthly',
        category: 'salary',
        next_payment_date: '',
        payment_date: '',
      })
    }
    setIsModalOpen(true)
  }

  const handleCloseModal = () => {
    setIsModalOpen(false)
    setEditingIncome(null)
    setFormData({
      name: '',
      amount: '',
      frequency: 'monthly',
      category: 'salary',
      next_payment_date: '',
      payment_date: '',
    })
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const amount = parseFloat(formData.amount)
    if (isNaN(amount) || amount <= 0) {
      alert('Please enter a valid amount')
      return
    }

    const input = {
      name: formData.name,
      amount,
      frequency: formData.frequency,
      category: formData.category,
      next_payment_date: formData.next_payment_date || null,
      payment_date: formData.payment_date || null,
    }

    if (editingIncome) {
      updateIncomeSource(
        {
          id: editingIncome.id,
          updates: input,
        },
        {
          onSuccess: () => {
            handleCloseModal()
          },
          onError: (error: Error) => {
            alert('Error updating income source: ' + (error instanceof Error ? error.message : 'Unknown error'))
          },
        }
      )
    } else {
      createIncomeSource(input, {
        onSuccess: () => {
          handleCloseModal()
        },
        onError: (error: Error) => {
          alert('Error creating income source: ' + (error instanceof Error ? error.message : 'Unknown error'))
        },
      })
    }
  }

  const handleDelete = (id: string) => {
    if (window.confirm('Are you sure you want to delete this income source?')) {
      deleteIncomeSource(id, {
        onSuccess: () => {
          setDeletingId(null)
        },
        onError: (error: Error) => {
          alert('Error deleting income source: ' + (error instanceof Error ? error.message : 'Unknown error'))
          setDeletingId(null)
        },
      })
    }
  }

  const handleToggleActive = (income: IncomeSource) => {
    updateIncomeSource(
      {
        id: income.id,
        updates: { is_active: !income.is_active },
      },
      {
        onError: (error: Error) => {
          alert('Error updating income source: ' + (error instanceof Error ? error.message : 'Unknown error'))
        },
      }
    )
  }

  if (isLoading) {
    return (
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Income Sources</h2>
        <div className="animate-pulse">Loading...</div>
      </div>
    )
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Income Sources</h2>
        <button
          onClick={() => handleOpenModal()}
          className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
        >
          + Add Income Source
        </button>
      </div>

      {incomeSources.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <p className="text-gray-500 mb-4">No income sources yet.</p>
          <button
            onClick={() => handleOpenModal()}
            className="text-indigo-600 hover:text-indigo-700 font-medium"
          >
            Add your first income source
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
                  Amount
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Category
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Frequency
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Next Payment
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
              {incomeSources.map((income) => (
                <tr key={income.id} className={!income.is_active ? 'opacity-50' : ''}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{income.name}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{formatCurrency(income.amount)}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="px-2 py-1 text-xs font-medium bg-indigo-100 text-indigo-800 rounded">
                      {income.category}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded">
                      {income.frequency}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {income.next_payment_date
                      ? formatDate(income.next_payment_date)
                      : income.payment_date
                      ? formatDate(income.payment_date)
                      : 'N/A'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <button
                      onClick={() => handleToggleActive(income)}
                      className={`px-2 py-1 text-xs font-medium rounded ${
                        income.is_active
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {income.is_active ? 'Active' : 'Inactive'}
                    </button>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button
                      onClick={() => handleOpenModal(income)}
                      className="text-indigo-600 hover:text-indigo-900 mr-4"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(income.id)}
                      disabled={deletingId === income.id}
                      className="text-red-600 hover:text-red-900 disabled:opacity-50"
                    >
                      {deletingId === income.id ? 'Deleting...' : 'Delete'}
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
        title={editingIncome ? 'Edit Income Source' : 'Add Income Source'}
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
              placeholder="e.g., Salary, Freelance Project"
            />
          </div>

          <div>
            <label htmlFor="amount" className="block text-sm font-medium text-gray-700">
              Amount (₱)
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
                  category: e.target.value as IncomeSource['category'],
                })
              }
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value="salary">Salary</option>
              <option value="project">Project</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div>
            <label htmlFor="frequency" className="block text-sm font-medium text-gray-700">
              Frequency
            </label>
            <select
              id="frequency"
              required
              value={formData.frequency}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  frequency: e.target.value as IncomeSource['frequency'],
                })
              }
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value="monthly">Monthly</option>
              <option value="weekly">Weekly</option>
              <option value="one_time">One Time</option>
            </select>
          </div>

          {formData.frequency !== 'one_time' && (
            <div>
              <label htmlFor="next_payment_date" className="block text-sm font-medium text-gray-700">
                Next Payment Date
              </label>
              <input
                type="date"
                id="next_payment_date"
                value={formData.next_payment_date}
                onChange={(e) => setFormData({ ...formData, next_payment_date: e.target.value })}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
          )}

          {formData.frequency === 'one_time' && (
            <div>
              <label htmlFor="payment_date" className="block text-sm font-medium text-gray-700">
                Payment Date
              </label>
              <input
                type="date"
                id="payment_date"
                value={formData.payment_date}
                onChange={(e) => setFormData({ ...formData, payment_date: e.target.value })}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
          )}

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
                : editingIncome
                ? 'Update'
                : 'Create'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
