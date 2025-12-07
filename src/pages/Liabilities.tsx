import { useState, useMemo, useEffect } from 'react';
import { useLiabilities, useCreditCards } from '../hooks';
import { Liability } from '../types/database.types';
import { formatCurrency } from '../lib/utils';
import { Modal } from '../components/Modal';

export function Liabilities() {
  const {
    liabilities,
    isLoading,
    createLiability,
    updateLiability,
    deleteLiability,
    isCreating,
    isUpdating,
  } = useLiabilities();

  const { creditCards } = useCreditCards();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingLiability, setEditingLiability] = useState<Liability | null>(
    null
  );
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Search and filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<
    Liability['category'] | 'all'
  >('all');
  const [statusFilter, setStatusFilter] = useState<
    'all' | 'active' | 'inactive'
  >('all');

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

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
  });

  const handleOpenModal = (liability?: Liability) => {
    if (liability) {
      setEditingLiability(liability);
      setFormData({
        name: liability.name,
        amount: liability.amount.toString(),
        due_date: liability.due_date.toString(),
        category: liability.category,
        source: liability.source || '',
        credit_card_id: liability.credit_card_id || '',
        credit_limit: liability.credit_limit?.toString() || '',
        current_balance: liability.current_balance?.toString() || '',
        months_to_pay: liability.months_to_pay?.toString() || '',
        start_date:
          liability.start_date || new Date().toISOString().split('T')[0],
      });
    } else {
      setEditingLiability(null);
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
      });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingLiability(null);
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
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseFloat(formData.amount);
    const dueDate = parseInt(formData.due_date);
    // Only set current_balance for credit cards, loans, and installments
    const needsCurrentBalance =
      formData.category === 'credit_card' ||
      formData.category === 'loan' ||
      formData.category === 'installment';
    const currentBalance =
      needsCurrentBalance && formData.current_balance
        ? parseFloat(formData.current_balance)
        : null;
    const creditLimit = formData.credit_limit
      ? parseFloat(formData.credit_limit)
      : null;

    if (isNaN(amount) || amount <= 0) {
      alert('Please enter a valid amount');
      return;
    }

    if (isNaN(dueDate) || dueDate < 1 || dueDate > 31) {
      alert('Please enter a valid due date (1-31)');
      return;
    }

    const monthsToPay = formData.months_to_pay
      ? parseInt(formData.months_to_pay)
      : null;
    if (formData.months_to_pay && (isNaN(monthsToPay!) || monthsToPay! < 1)) {
      alert(
        'Please enter a valid number of months (1 or more), or leave empty for recurring forever'
      );
      return;
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
    };

    if (editingLiability) {
      updateLiability(
        {
          id: editingLiability.id,
          updates: input,
        },
        {
          onSuccess: () => {
            handleCloseModal();
          },
          onError: (error: Error) => {
            alert(
              'Error updating liability: ' +
                (error instanceof Error ? error.message : 'Unknown error')
            );
          },
        }
      );
    } else {
      createLiability(input, {
        onSuccess: () => {
          handleCloseModal();
        },
        onError: (error: Error) => {
          alert(
            'Error creating liability: ' +
              (error instanceof Error ? error.message : 'Unknown error')
          );
        },
      });
    }
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Are you sure you want to delete this liability?')) {
      setDeletingId(id);
      deleteLiability(id, {
        onSuccess: () => {
          setDeletingId(null);
        },
        onError: (error: Error) => {
          alert(
            'Error deleting liability: ' +
              (error instanceof Error ? error.message : 'Unknown error')
          );
          setDeletingId(null);
        },
      });
    }
  };

  const handleToggleActive = (liability: Liability) => {
    updateLiability(
      {
        id: liability.id,
        updates: { is_active: !liability.is_active },
      },
      {
        onError: (error: Error) => {
          alert(
            'Error updating liability: ' +
              (error instanceof Error ? error.message : 'Unknown error')
          );
        },
      }
    );
  };

  // Filter liabilities based on search and filters
  const filteredLiabilities = useMemo(() => {
    if (!liabilities) return [];

    return liabilities.filter((liability) => {
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesSearch =
          liability.name.toLowerCase().includes(query) ||
          (liability.source &&
            liability.source.toLowerCase().includes(query)) ||
          liability.category.toLowerCase().includes(query);
        if (!matchesSearch) return false;
      }

      // Category filter
      if (
        selectedCategory !== 'all' &&
        liability.category !== selectedCategory
      ) {
        return false;
      }

      // Status filter
      if (statusFilter === 'active' && !liability.is_active) {
        return false;
      }
      if (statusFilter === 'inactive' && liability.is_active) {
        return false;
      }

      return true;
    });
  }, [liabilities, searchQuery, selectedCategory, statusFilter]);

  // Pagination calculations
  const totalPages = Math.ceil(filteredLiabilities.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedLiabilities = filteredLiabilities.slice(startIndex, endIndex);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedCategory, statusFilter]);

  if (isLoading) {
    return (
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Liabilities</h2>
        <div className="animate-pulse">Loading...</div>
      </div>
    );
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

      {/* Search and Filters */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Search */}
          <div>
            <label
              htmlFor="search"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Search
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg
                  className="h-5 w-5 text-gray-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
              </div>
              <input
                type="text"
                id="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                placeholder="Search by name, source, or category..."
              />
            </div>
          </div>

          {/* Category Filter */}
          <div>
            <label
              htmlFor="category-filter"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Category
            </label>
            <select
              id="category-filter"
              value={selectedCategory}
              onChange={(e) =>
                setSelectedCategory(
                  e.target.value as Liability['category'] | 'all'
                )
              }
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            >
              <option value="all">All Categories</option>
              <option value="credit_card">Credit Card</option>
              <option value="loan">Loan</option>
              <option value="installment">Installment</option>
              <option value="recurring_bill">Recurring Bill</option>
              <option value="other">Other</option>
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <label
              htmlFor="status-filter"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Status
            </label>
            <select
              id="status-filter"
              value={statusFilter}
              onChange={(e) =>
                setStatusFilter(e.target.value as 'all' | 'active' | 'inactive')
              }
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
        </div>

        {/* Clear Filters */}
        {(searchQuery ||
          selectedCategory !== 'all' ||
          statusFilter !== 'all') && (
          <div className="mt-4 flex items-center justify-between">
            <p className="text-sm text-gray-600">
              Showing {filteredLiabilities.length} of {liabilities.length}{' '}
              liabilities
            </p>
            <button
              onClick={() => {
                setSearchQuery('');
                setSelectedCategory('all');
                setStatusFilter('all');
              }}
              className="text-sm text-indigo-600 hover:text-indigo-700 font-medium"
            >
              Clear all filters
            </button>
          </div>
        )}
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
      ) : filteredLiabilities.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <p className="text-gray-500 mb-4">
            No liabilities match your filters.
          </p>
          <button
            onClick={() => {
              setSearchQuery('');
              setSelectedCategory('all');
              setStatusFilter('all');
            }}
            className="text-indigo-600 hover:text-indigo-700 font-medium"
          >
            Clear filters
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
              {paginatedLiabilities.map((liability) => (
                <tr
                  key={liability.id}
                  className={!liability.is_active ? 'opacity-50' : ''}
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {liability.name}
                    </div>
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
                    <div className="text-sm text-gray-900">
                      {formatCurrency(liability.amount)}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      Day {liability.due_date}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="px-2 py-1 text-xs font-medium bg-purple-100 text-purple-800 rounded">
                      {liability.category.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {liability.current_balance !== null ? (
                        <>
                          {formatCurrency(liability.current_balance)}
                          {liability.credit_limit && (
                            <span className="text-gray-500">
                              {' '}
                              / {formatCurrency(liability.credit_limit)}
                            </span>
                          )}
                        </>
                      ) : (
                        <span className="text-gray-400">—</span>
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

      {/* Pagination Controls */}
      {filteredLiabilities.length > 0 && totalPages > 1 && (
        <div className="bg-white rounded-lg shadow px-4 py-3 mt-6">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <label
                  htmlFor="items-per-page"
                  className="text-sm text-gray-700"
                >
                  Items per page:
                </label>
                <select
                  id="items-per-page"
                  value={itemsPerPage}
                  onChange={(e) => {
                    setItemsPerPage(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="px-2 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value="5">5</option>
                  <option value="10">10</option>
                  <option value="25">25</option>
                  <option value="50">50</option>
                  <option value="100">100</option>
                </select>
              </div>
              <p className="text-sm text-gray-600">
                Showing {startIndex + 1} to{' '}
                {Math.min(endIndex, filteredLiabilities.length)} of{' '}
                {filteredLiabilities.length} liabilities
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                Previous
              </button>

              <div className="flex items-center gap-1">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum: number;
                  if (totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (currentPage <= 3) {
                    pageNum = i + 1;
                  } else if (currentPage >= totalPages - 2) {
                    pageNum = totalPages - 4 + i;
                  } else {
                    pageNum = currentPage - 2 + i;
                  }

                  return (
                    <button
                      key={pageNum}
                      onClick={() => setCurrentPage(pageNum)}
                      className={`px-3 py-2 text-sm font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 ${
                        currentPage === pageNum
                          ? 'bg-indigo-600 text-white'
                          : 'text-gray-700 bg-white border border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
              </div>

              <button
                onClick={() =>
                  setCurrentPage((prev) => Math.min(totalPages, prev + 1))
                }
                disabled={currentPage === totalPages}
                className="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      )}

      <Modal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        title={editingLiability ? 'Edit Liability' : 'Add Liability'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="name"
              className="block text-sm font-medium text-gray-700"
            >
              Name
            </label>
            <input
              type="text"
              id="name"
              required
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="e.g., BPI Credit Card, Atome Loan"
            />
          </div>

          <div>
            <label
              htmlFor="amount"
              className="block text-sm font-medium text-gray-700"
            >
              Monthly Amount (₱)
            </label>
            <input
              type="number"
              id="amount"
              required
              step="0.01"
              min="0"
              value={formData.amount}
              onChange={(e) =>
                setFormData({ ...formData, amount: e.target.value })
              }
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="0.00"
            />
          </div>

          <div>
            <label
              htmlFor="due_date"
              className="block text-sm font-medium text-gray-700"
            >
              Due Date (Day of Month, 1-31)
            </label>
            <input
              type="number"
              id="due_date"
              required
              min="1"
              max="31"
              value={formData.due_date}
              onChange={(e) =>
                setFormData({ ...formData, due_date: e.target.value })
              }
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="15"
            />
          </div>

          <div>
            <label
              htmlFor="category"
              className="block text-sm font-medium text-gray-700"
            >
              Category
            </label>
            <select
              id="category"
              required
              value={formData.category}
              onChange={(e) => {
                const newCategory = e.target.value as Liability['category'];
                setFormData({
                  ...formData,
                  category: newCategory,
                  // Clear current_balance and months_to_pay for recurring bills
                  current_balance:
                    newCategory === 'recurring_bill' || newCategory === 'other'
                      ? ''
                      : formData.current_balance,
                  months_to_pay:
                    newCategory === 'recurring_bill' ||
                    newCategory === 'other' ||
                    newCategory === 'credit_card'
                      ? ''
                      : formData.months_to_pay,
                });
              }}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value="credit_card">Credit Card</option>
              <option value="loan">Loan</option>
              <option value="installment">Installment</option>
              <option value="recurring_bill">Recurring Bill</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div>
            <label
              htmlFor="source"
              className="block text-sm font-medium text-gray-700"
            >
              Source / Provider (Optional)
            </label>
            <input
              type="text"
              id="source"
              value={formData.source}
              onChange={(e) =>
                setFormData({ ...formData, source: e.target.value })
              }
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              placeholder={
                formData.category === 'credit_card'
                  ? 'e.g., BPI, RCBC, BDO'
                  : formData.category === 'loan' ||
                    formData.category === 'installment'
                  ? 'e.g., Atome, Home Credit, BillEase'
                  : formData.category === 'recurring_bill'
                  ? 'e.g., Meralco, Maynilad, Manila Water'
                  : 'e.g., Provider name'
              }
            />
            <p className="mt-1 text-xs text-gray-500">
              {formData.category === 'credit_card' &&
                'Enter the bank name (BPI, RCBC, BDO, etc.)'}
              {formData.category === 'loan' &&
                'Enter the loan provider name (Atome, Home Credit, etc.)'}
              {formData.category === 'installment' &&
                'Enter the installment provider name (BillEase, etc.)'}
              {formData.category === 'recurring_bill' &&
                'Enter the utility company name (Meralco, Maynilad, Manila Water, etc.)'}
              {formData.category === 'other' &&
                'Enter the provider or source name'}
            </p>
          </div>

          {formData.category === 'credit_card' && (
            <>
              {creditCards.length > 0 && (
                <div>
                  <label
                    htmlFor="credit_card_id"
                    className="block text-sm font-medium text-gray-700"
                  >
                    Link to Credit Card (Optional)
                  </label>
                  <select
                    id="credit_card_id"
                    value={formData.credit_card_id}
                    onChange={(e) => {
                      const selectedCard = creditCards.find(
                        (c) => c.id === e.target.value
                      );
                      setFormData({
                        ...formData,
                        credit_card_id: e.target.value,
                        credit_limit: selectedCard
                          ? selectedCard.credit_limit.toString()
                          : formData.credit_limit,
                        current_balance: selectedCard
                          ? selectedCard.current_balance.toString()
                          : formData.current_balance,
                      });
                    }}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  >
                    <option value="">Select a credit card...</option>
                    {creditCards
                      .filter((c) => c.is_active)
                      .map((card) => (
                        <option key={card.id} value={card.id}>
                          {card.bank} - {card.name} (Limit:{' '}
                          {formatCurrency(card.credit_limit)})
                        </option>
                      ))}
                  </select>
                  <p className="mt-1 text-xs text-gray-500">
                    Select a registered credit card to link this liability.
                    Credit limit and balance will be auto-filled.
                  </p>
                </div>
              )}
              <div>
                <label
                  htmlFor="credit_limit"
                  className="block text-sm font-medium text-gray-700"
                >
                  Credit Limit (₱)
                </label>
                <input
                  type="number"
                  id="credit_limit"
                  step="0.01"
                  min="0"
                  value={formData.credit_limit}
                  onChange={(e) =>
                    setFormData({ ...formData, credit_limit: e.target.value })
                  }
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="0.00"
                />
              </div>
            </>
          )}

          {/* Current Balance - Only for credit cards, loans, installments */}
          {(formData.category === 'credit_card' ||
            formData.category === 'loan' ||
            formData.category === 'installment') && (
            <div>
              <label
                htmlFor="current_balance"
                className="block text-sm font-medium text-gray-700"
              >
                Current Balance (₱)
              </label>
              <input
                type="number"
                id="current_balance"
                step="0.01"
                min="0"
                value={formData.current_balance}
                onChange={(e) =>
                  setFormData({ ...formData, current_balance: e.target.value })
                }
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="0.00"
              />
              <p className="mt-1 text-xs text-gray-500">
                {formData.category === 'credit_card' &&
                  'Outstanding balance on this credit card'}
                {formData.category === 'loan' && 'Remaining principal amount'}
                {formData.category === 'installment' &&
                  'Remaining amount to pay'}
              </p>
            </div>
          )}

          <div>
            <label
              htmlFor="start_date"
              className="block text-sm font-medium text-gray-700"
            >
              Start Date
            </label>
            <input
              type="date"
              id="start_date"
              required
              value={formData.start_date}
              onChange={(e) =>
                setFormData({ ...formData, start_date: e.target.value })
              }
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            />
            <p className="mt-1 text-xs text-gray-500">
              When does this payment period start?
            </p>
          </div>

          {/* Months to Pay - Only for loans and installments */}
          {(formData.category === 'loan' ||
            formData.category === 'installment') && (
            <div>
              <label
                htmlFor="months_to_pay"
                className="block text-sm font-medium text-gray-700"
              >
                Months to Pay
              </label>
              <input
                type="number"
                id="months_to_pay"
                min="1"
                value={formData.months_to_pay}
                onChange={(e) =>
                  setFormData({ ...formData, months_to_pay: e.target.value })
                }
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="e.g., 12"
              />
              <p className="mt-1 text-xs text-gray-500">
                Total number of months for this{' '}
                {formData.category === 'loan' ? 'loan' : 'installment'}.
              </p>
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
                : editingLiability
                ? 'Update'
                : 'Create'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
