import { useState, useMemo } from 'react'
import { useExpenses, useLiabilities } from '../hooks'
import { Expense } from '../types/database.types'
import { formatCurrency, formatDate } from '../lib/utils'
import { Modal } from '../components/Modal'

const expenseCategories = [
  'Food',
  'Transport',
  'Shopping',
  'Bills',
  'Entertainment',
  'Healthcare',
  'Education',
  'Other',
]

export function Expenses() {
  const {
    expenses,
    isLoading: isLoadingExpenses,
    createExpense,
    updateExpense,
    deleteExpense,
    isCreating,
    isUpdating,
  } = useExpenses()
  const { liabilities, isLoading: isLoadingLiabilities } = useLiabilities()
  const isLoading = isLoadingExpenses || isLoadingLiabilities

  // Create a map of liability_id to liability name for quick lookup
  const liabilityMap = useMemo(() => {
    const map = new Map<string, string>()
    if (liabilities) {
      liabilities.forEach((liability) => {
        map.set(liability.id, liability.name)
      })
    }
    return map
  }, [liabilities])

  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const [formData, setFormData] = useState({
    description: '',
    amount: '',
    category: '',
    expense_date: new Date().toISOString().split('T')[0],
    frequency: 'one_time' as Expense['frequency'],
    due_date: '',
    start_date: new Date().toISOString().split('T')[0],
    is_active: true,
  })

  const handleOpenModal = (expense?: Expense) => {
    if (expense) {
      setEditingExpense(expense)
      setFormData({
        description: expense.description,
        amount: expense.amount.toString(),
        category: expense.category || '',
        expense_date: expense.expense_date,
        frequency: expense.frequency || 'one_time',
        due_date: expense.due_date?.toString() || '',
        start_date: expense.start_date || new Date().toISOString().split('T')[0],
        is_active: expense.is_active !== undefined ? expense.is_active : true,
      })
    } else {
      setEditingExpense(null)
      setFormData({
        description: '',
        amount: '',
        category: '',
        expense_date: new Date().toISOString().split('T')[0],
        frequency: 'one_time',
        due_date: '',
        start_date: new Date().toISOString().split('T')[0],
        is_active: true,
      })
    }
    setIsModalOpen(true)
  }

  const handleCloseModal = () => {
    setIsModalOpen(false)
    setEditingExpense(null)
    setFormData({
      description: '',
      amount: '',
      category: '',
      expense_date: new Date().toISOString().split('T')[0],
      frequency: 'one_time',
      due_date: '',
      start_date: new Date().toISOString().split('T')[0],
      is_active: true,
    })
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const amount = parseFloat(formData.amount)

    if (isNaN(amount) || amount <= 0) {
      alert('Please enter a valid amount')
      return
    }

    const dueDate = formData.due_date ? parseInt(formData.due_date) : null
    if (formData.frequency !== 'one_time' && (!dueDate || dueDate < 1 || dueDate > 31)) {
      alert('Please enter a valid due date (1-31) for recurring expenses')
      return
    }

    const input = {
      description: formData.description,
      amount,
      category: formData.category || null,
      expense_date: formData.frequency === 'one_time' ? formData.expense_date : formData.start_date,
      frequency: formData.frequency,
      due_date: formData.frequency !== 'one_time' ? dueDate : null,
      start_date: formData.frequency !== 'one_time' ? formData.start_date : null,
      is_active: formData.is_active,
    }

    if (editingExpense) {
      updateExpense(
        {
          id: editingExpense.id,
          updates: input,
        },
        {
          onSuccess: () => {
            handleCloseModal()
          },
          onError: (error: Error) => {
            alert('Error updating expense: ' + (error instanceof Error ? error.message : 'Unknown error'))
          },
        }
      )
    } else {
      createExpense(input, {
        onSuccess: () => {
          handleCloseModal()
        },
        onError: (error: Error) => {
          alert('Error creating expense: ' + (error instanceof Error ? error.message : 'Unknown error'))
        },
      })
    }
  }

  const handleDelete = (id: string) => {
    if (window.confirm('Are you sure you want to delete this expense?')) {
      setDeletingId(id)
      deleteExpense(id, {
        onSuccess: () => {
          setDeletingId(null)
        },
        onError: (error: Error) => {
          alert('Error deleting expense: ' + (error instanceof Error ? error.message : 'Unknown error'))
          setDeletingId(null)
        },
      })
    }
  }

  if (isLoading) {
    return (
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Expenses</h2>
        <div className="animate-pulse">Loading...</div>
      </div>
    )
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Expenses</h2>
        <button
          onClick={() => handleOpenModal()}
          className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
        >
          + Log Expense
        </button>
      </div>

      {expenses.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <p className="text-gray-500 mb-4">No expenses logged yet.</p>
          <button
            onClick={() => handleOpenModal()}
            className="text-indigo-600 hover:text-indigo-700 font-medium"
          >
            Log your first expense
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Description
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Linked To
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Category
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Amount
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {expenses.map((expense) => (
                <tr key={expense.id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {expense.frequency === 'one_time' ? (
                      <div className="text-sm text-gray-900">{formatDate(expense.expense_date)}</div>
                    ) : (
                      <div className="text-sm text-gray-900">
                        <div>Due: Day {expense.due_date}</div>
                        {expense.start_date && (
                          <div className="text-xs text-gray-500">Started: {formatDate(expense.start_date)}</div>
                        )}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm font-medium text-gray-900">{expense.description}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {expense.liability_id && liabilityMap.has(expense.liability_id) ? (
                      <span className="px-2 py-1 text-xs font-medium bg-purple-100 text-purple-800 rounded">
                        {liabilityMap.get(expense.liability_id)}
                      </span>
                    ) : (
                      <span className="text-sm text-gray-400">—</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {expense.category ? (
                      <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded">
                        {expense.category}
                      </span>
                    ) : (
                      <span className="text-sm text-gray-400">—</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {expense.frequency === 'one_time' ? (
                      <span className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-800 rounded">
                        One Time
                      </span>
                    ) : (
                      <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded">
                        {expense.frequency === 'monthly' ? 'Monthly' : 'Weekly'} Recurring
                      </span>
                    )}
                    {expense.frequency !== 'one_time' && !expense.is_active && (
                      <span className="ml-2 px-2 py-1 text-xs font-medium bg-gray-100 text-gray-600 rounded">
                        Inactive
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    <div className="text-sm font-semibold text-gray-900">
                      {formatCurrency(expense.amount)}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button
                      onClick={() => handleOpenModal(expense)}
                      className="text-indigo-600 hover:text-indigo-900 mr-4"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(expense.id)}
                      disabled={deletingId === expense.id}
                      className="text-red-600 hover:text-red-900 disabled:opacity-50"
                    >
                      {deletingId === expense.id ? 'Deleting...' : 'Delete'}
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
        title={editingExpense ? 'Edit Expense' : 'Log Expense'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700">
              Description
            </label>
            <input
              type="text"
              id="description"
              required
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="e.g., Groceries, Coffee, Uber ride"
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
              Category (Optional)
            </label>
            <select
              id="category"
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value="">Select a category</option>
              {expenseCategories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="frequency" className="block text-sm font-medium text-gray-700">
              Frequency
            </label>
            <select
              id="frequency"
              value={formData.frequency}
              onChange={(e) => setFormData({ ...formData, frequency: e.target.value as Expense['frequency'] })}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value="one_time">One Time</option>
              <option value="monthly">Monthly (Recurring)</option>
              <option value="weekly">Weekly (Recurring)</option>
            </select>
            <p className="mt-1 text-xs text-gray-500">
              Select "Monthly" or "Weekly" for recurring bills like utilities
            </p>
          </div>

          {formData.frequency === 'one_time' && (
            <div>
              <label htmlFor="expense_date" className="block text-sm font-medium text-gray-700">
                Date
              </label>
              <input
                type="date"
                id="expense_date"
                required
                value={formData.expense_date}
                onChange={(e) => setFormData({ ...formData, expense_date: e.target.value })}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              />
              <p className="mt-1 text-xs text-gray-500">
                When did this expense occur?
              </p>
            </div>
          )}

          {formData.frequency !== 'one_time' && (
            <>
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
                  When does this recurring expense start?
                </p>
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
                <p className="mt-1 text-xs text-gray-500">
                  What day of the month is this bill due?
                </p>
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="is_active"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                />
                <label htmlFor="is_active" className="ml-2 block text-sm text-gray-700">
                  Active
                </label>
              </div>
            </>
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
                : editingExpense
                ? 'Update'
                : 'Log Expense'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
