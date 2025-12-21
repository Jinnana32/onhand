import { useState, useMemo } from 'react'
import { 
  Table, 
  Button, 
  Modal, 
  Form, 
  Input, 
  InputNumber, 
  DatePicker, 
  Typography, 
  Space, 
  Popconfirm,
  message,
  Empty,
  Card,
  Skeleton,
  Select,
  Switch,
  List,
  Tag,
  Checkbox
} from 'antd'
import { PlusOutlined, EditOutlined, DeleteOutlined, SearchOutlined, ShoppingOutlined, EyeOutlined } from '@ant-design/icons'
import dayjs, { Dayjs } from 'dayjs'
import { useBudgets, useProfile, useExpenses } from '../hooks'
import { Budget, Expense } from '../types/database.types'
import { formatCurrency, formatDate } from '../lib/utils'

const { Title, Text } = Typography
const { Option } = Select

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

export function Budgets() {
  const {
    budgets,
    isLoading,
    createBudget,
    updateBudget,
    deleteBudget,
    isCreating,
    isUpdating,
  } = useBudgets()
  const { profile } = useProfile()
  const { expenses, createExpense, updateExpense, deleteExpense, isCreating: isCreatingExpense, isUpdating: isUpdatingExpense } = useExpenses()
  const [form] = Form.useForm()
  const [expenseForm] = Form.useForm()
  const [editExpenseForm] = Form.useForm()
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false)
  const [isViewExpensesModalOpen, setIsViewExpensesModalOpen] = useState(false)
  const [isEditExpenseModalOpen, setIsEditExpenseModalOpen] = useState(false)
  const [editingBudget, setEditingBudget] = useState<Budget | null>(null)
  const [selectedBudgetForExpense, setSelectedBudgetForExpense] = useState<Budget | null>(null)
  const [viewingBudget, setViewingBudget] = useState<Budget | null>(null)
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [searchText, setSearchText] = useState('')

  const handleOpenModal = (budget?: Budget) => {
    if (budget) {
      setEditingBudget(budget)
      form.setFieldsValue({
        name: budget.name,
        amount: budget.amount,
        budget_date: dayjs(budget.budget_date),
        is_active: budget.is_active,
      })
    } else {
      setEditingBudget(null)
      form.resetFields()
      form.setFieldsValue({
        budget_date: dayjs(),
        is_active: true,
      })
    }
    setIsModalOpen(true)
  }

  const handleCloseModal = () => {
    setIsModalOpen(false)
    setEditingBudget(null)
    form.resetFields()
  }

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields()
      const amount = values.amount

      if (isNaN(amount) || amount <= 0) {
        message.error('Please enter a valid amount')
        return
      }

      // Check if user has enough cash (only for new budgets)
      if (!editingBudget && profile) {
        if (amount > profile.current_cash) {
          message.error(`Insufficient funds. You only have ${formatCurrency(profile.current_cash)} available.`)
          return
        }
      }

      const input = {
        name: values.name,
        amount,
        budget_date: (values.budget_date as Dayjs).format('YYYY-MM-DD'),
        is_active: values.is_active,
      }

      if (editingBudget) {
        updateBudget(
          {
            id: editingBudget.id,
            updates: input,
          },
          {
            onSuccess: () => {
              message.success('Budget updated successfully')
              handleCloseModal()
            },
            onError: (error: Error) => {
              message.error('Error updating budget: ' + (error instanceof Error ? error.message : 'Unknown error'))
            },
          }
        )
      } else {
        createBudget(input, {
          onSuccess: () => {
            message.success('Budget created successfully')
            handleCloseModal()
          },
          onError: (error: Error) => {
            message.error('Error creating budget: ' + (error instanceof Error ? error.message : 'Unknown error'))
          },
        })
      }
    } catch (error) {
      // Form validation errors are handled by Ant Design
    }
  }

  const handleOpenExpenseModal = (budget: Budget) => {
    setSelectedBudgetForExpense(budget)
    expenseForm.resetFields()
    expenseForm.setFieldsValue({
      budget_id: budget.id,
      frequency: 'one_time',
      expense_date: dayjs(),
      is_paid: false,
    })
    setIsExpenseModalOpen(true)
  }

  const handleCloseExpenseModal = () => {
    setIsExpenseModalOpen(false)
    setSelectedBudgetForExpense(null)
    expenseForm.resetFields()
  }

  const handleSubmitExpense = async () => {
    try {
      const values = await expenseForm.validateFields()
      const amount = values.amount

      if (isNaN(amount) || amount <= 0) {
        message.error('Please enter a valid amount')
        return
      }

      const input = {
        description: values.description,
        amount,
        category: values.category || null,
        expense_date: values.frequency === 'one_time' 
          ? (values.expense_date as Dayjs).format('YYYY-MM-DD')
          : new Date().toISOString().split('T')[0],
        frequency: values.frequency,
        due_date: values.frequency !== 'one_time' ? values.due_date : null,
        start_date: values.frequency !== 'one_time' 
          ? (values.start_date as Dayjs).format('YYYY-MM-DD')
          : null,
        budget_id: values.budget_id || null,
        is_active: values.is_active !== undefined ? values.is_active : true,
        is_paid: values.is_paid ?? false,
      }

      createExpense(input, {
        onSuccess: () => {
          message.success('Expense created successfully')
          handleCloseExpenseModal()
        },
        onError: (error: Error) => {
          message.error('Error creating expense: ' + (error instanceof Error ? error.message : 'Unknown error'))
        },
      })
    } catch (error) {
      // Form validation errors are handled by Ant Design
    }
  }

  const handleDelete = (id: string) => {
    setDeletingId(id)
    deleteBudget(id, {
      onSuccess: () => {
        message.success('Budget deleted successfully')
        setDeletingId(null)
      },
      onError: (error: Error) => {
        message.error('Error deleting budget: ' + (error instanceof Error ? error.message : 'Unknown error'))
        setDeletingId(null)
      },
    })
  }

  const handleToggleExpensePaid = (expenseId: string, currentPaidStatus: boolean) => {
    updateExpense(
      {
        id: expenseId,
        updates: { is_paid: !currentPaidStatus },
      },
      {
        onSuccess: () => {
          message.success(`Expense marked as ${!currentPaidStatus ? 'paid' : 'unpaid'}`)
        },
        onError: (error: Error) => {
          message.error('Error updating expense: ' + (error instanceof Error ? error.message : 'Unknown error'))
        },
      }
    )
  }

  const handleDeleteExpense = (expenseId: string) => {
    deleteExpense(expenseId, {
      onSuccess: () => {
        message.success('Expense deleted successfully')
      },
      onError: (error: Error) => {
        message.error('Error deleting expense: ' + (error instanceof Error ? error.message : 'Unknown error'))
      },
    })
  }

  const handleOpenEditExpenseModal = (expense: Expense) => {
    if (expense.is_paid) {
      message.warning('Cannot edit paid expenses')
      return
    }
    setEditingExpense(expense)
    editExpenseForm.resetFields()
    editExpenseForm.setFieldsValue({
      description: expense.description,
      amount: expense.amount,
      category: expense.category,
      expense_date: dayjs(expense.expense_date),
    })
    setIsEditExpenseModalOpen(true)
  }

  const handleCloseEditExpenseModal = () => {
    setIsEditExpenseModalOpen(false)
    setEditingExpense(null)
    editExpenseForm.resetFields()
  }

  const handleSubmitEditExpense = async () => {
    if (!editingExpense) return

    try {
      const values = await editExpenseForm.validateFields()
      const amount = values.amount

      if (isNaN(amount) || amount <= 0) {
        message.error('Please enter a valid amount')
        return
      }

      updateExpense(
        {
          id: editingExpense.id,
          updates: {
            description: values.description,
            amount,
            category: values.category || null,
            expense_date: (values.expense_date as Dayjs).format('YYYY-MM-DD'),
          },
        },
        {
          onSuccess: () => {
            message.success('Expense updated successfully')
            handleCloseEditExpenseModal()
          },
          onError: (error: Error) => {
            message.error('Error updating expense: ' + (error instanceof Error ? error.message : 'Unknown error'))
          },
        }
      )
    } catch (error) {
      // Form validation errors are handled by Ant Design
    }
  }

  // Filter budgets based on search
  const filteredBudgets = useMemo(() => {
    return budgets.filter((budget) => {
      if (searchText) {
        const searchLower = searchText.toLowerCase()
        if (!budget.name.toLowerCase().includes(searchLower)) {
          return false
        }
      }
      return true
    })
  }, [budgets, searchText])

  // Get expenses for each budget
  const getBudgetExpenses = (budgetId: string) => {
    return expenses?.filter((expense) => expense.budget_id === budgetId && expense.is_active) || []
  }

  // Calculate remaining amount for each budget
  const getBudgetRemaining = (budget: Budget) => {
    const budgetExpenses = getBudgetExpenses(budget.id)
    const spentAmount = budgetExpenses
      .filter((expense) => expense.is_paid)
      .reduce((sum, expense) => sum + expense.amount, 0)
    return budget.amount - spentAmount
  }

  const columns = [
    {
      title: 'Date',
      key: 'date',
      render: (_: unknown, budget: Budget) => (
        <div>{formatDate(budget.budget_date)}</div>
      ),
    },
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: 'Amount',
      key: 'amount',
      align: 'right' as const,
      render: (_: unknown, budget: Budget) => (
        <div style={{ fontWeight: 600, color: '#2563eb' }}>{formatCurrency(budget.amount)}</div>
      ),
    },
    {
      title: 'Remaining',
      key: 'remaining',
      align: 'right' as const,
      render: (_: unknown, budget: Budget) => {
        const remaining = getBudgetRemaining(budget)
        return (
          <div style={{ 
            fontWeight: 600, 
            color: remaining >= 0 ? '#16a34a' : '#dc2626' 
          }}>
            {formatCurrency(remaining)}
          </div>
        )
      },
    },
    {
      title: 'Status',
      key: 'status',
      render: (_: unknown, budget: Budget) => (
        budget.is_active ? (
          <span style={{ color: '#16a34a' }}>Active</span>
        ) : (
          <span style={{ color: '#9ca3af' }}>Inactive</span>
        )
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      align: 'right' as const,
      render: (_: unknown, budget: Budget) => (
        <Space>
          <Button
            type="link"
            icon={<EyeOutlined />}
            onClick={() => {
              setViewingBudget(budget)
              setIsViewExpensesModalOpen(true)
            }}
          >
            View Expenses
          </Button>
          <Button
            type="link"
            icon={<ShoppingOutlined />}
            onClick={() => handleOpenExpenseModal(budget)}
          >
            Add Expense
          </Button>
          <Button
            type="link"
            icon={<EditOutlined />}
            onClick={() => handleOpenModal(budget)}
          >
            Edit
          </Button>
          <Popconfirm
            title="Delete budget"
            description="Are you sure you want to delete this budget? The amount will be added back to your cash on hand."
            onConfirm={() => handleDelete(budget.id)}
            okText="Yes"
            cancelText="No"
          >
            <Button
              type="link"
              danger
              icon={<DeleteOutlined />}
              loading={deletingId === budget.id}
            >
              Delete
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ]

  if (isLoading) {
    return (
      <div>
        <Title level={2} style={{ marginBottom: 24 }}>Budgets</Title>
        <Card>
          <Skeleton active />
        </Card>
      </div>
    )
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <Title level={2} style={{ margin: 0 }}>Budgets</Title>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => handleOpenModal()}
          size="large"
        >
          Create Budget
        </Button>
      </div>

      {/* Search */}
      {budgets.length > 0 && (
        <Card style={{ marginBottom: 24 }}>
          <Input
            placeholder="Search budgets by name..."
            prefix={<SearchOutlined />}
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            allowClear
            style={{ width: '100%' }}
          />
        </Card>
      )}

      {/* Available Cash Info */}
      {profile && (
        <Card style={{ marginBottom: 24, backgroundColor: '#f0fdf4', borderColor: '#22c55e' }}>
          <Space direction="vertical" size="small" style={{ width: '100%' }}>
            <div style={{ fontSize: '14px', color: '#6b7280' }}>Available Cash</div>
            <div style={{ fontSize: '24px', fontWeight: 600, color: '#16a34a' }}>
              {formatCurrency(profile.current_cash)}
            </div>
            <div style={{ fontSize: '12px', color: '#6b7280' }}>
              Creating a budget will deduct from this amount
            </div>
          </Space>
        </Card>
      )}

      {filteredBudgets.length === 0 ? (
        <Card>
          <Empty
            description={searchText ? 'No budgets found matching your search' : 'No budgets yet'}
          />
        </Card>
      ) : (
        <Table
          dataSource={filteredBudgets}
          columns={columns}
          rowKey="id"
          pagination={{ pageSize: 20 }}
        />
      )}

      <Modal
        title={editingBudget ? 'Edit Budget' : 'Create Budget'}
        open={isModalOpen}
        onCancel={handleCloseModal}
        onOk={form.submit}
        confirmLoading={isCreating || isUpdating}
        width={600}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
        >
          <Form.Item
            name="name"
            label="Budget Name"
            rules={[{ required: true, message: 'Please enter a budget name' }]}
          >
            <Input placeholder="e.g., Groceries, Entertainment, Emergency Fund" />
          </Form.Item>

          <Form.Item
            name="amount"
            label="Amount"
            rules={[
              { required: true, message: 'Please enter an amount' },
              { type: 'number', min: 0.01, message: 'Amount must be greater than 0' },
            ]}
          >
            <InputNumber
              style={{ width: '100%' }}
              prefix="₱"
              placeholder="0.00"
              step={0.01}
              min={0.01}
            />
          </Form.Item>

          <Form.Item
            name="budget_date"
            label="Budget Date"
            rules={[{ required: true, message: 'Please select a date' }]}
          >
            <DatePicker style={{ width: '100%' }} />
            <div style={{ fontSize: '12px', color: '#6b7280', marginTop: 4 }}>
              This is the date when the budget will appear in the Cash Flow calendar
            </div>
          </Form.Item>

          <Form.Item
            name="is_active"
            valuePropName="checked"
          >
            <div>
              <input type="checkbox" checked={form.getFieldValue('is_active')} readOnly style={{ marginRight: 8 }} />
              <span>Active</span>
            </div>
            <div style={{ fontSize: '12px', color: '#6b7280', marginTop: 4 }}>
              Inactive budgets won't appear in the Cash Flow calendar
            </div>
          </Form.Item>

          {!editingBudget && profile && (
            <div style={{ 
              padding: '12px', 
              backgroundColor: '#fef3c7', 
              borderRadius: '4px',
              marginTop: 16,
              fontSize: '14px'
            }}>
              <strong>Note:</strong> Creating this budget will deduct {form.getFieldValue('amount') ? formatCurrency(form.getFieldValue('amount')) : 'the amount'} from your available cash ({formatCurrency(profile.current_cash)}).
            </div>
          )}
        </Form>
      </Modal>

      {/* Expense Creation Modal */}
      <Modal
        title={`Add Expense to ${selectedBudgetForExpense?.name || 'Budget'}`}
        open={isExpenseModalOpen}
        onCancel={handleCloseExpenseModal}
        onOk={expenseForm.submit}
        confirmLoading={isCreatingExpense}
        okText="Create Expense"
        cancelText="Cancel"
        width={600}
      >
        <Form
          form={expenseForm}
          layout="vertical"
          onFinish={handleSubmitExpense}
        >
          <Form.Item
            name="description"
            label="Description"
            rules={[{ required: true, message: 'Please enter a description' }]}
          >
            <Input placeholder="e.g., Groceries, Coffee, Uber ride" />
          </Form.Item>

          <Form.Item
            name="amount"
            label="Amount (₱)"
            rules={[
              { required: true, message: 'Please enter an amount' },
              { type: 'number', min: 0.01, message: 'Amount must be greater than 0' },
            ]}
          >
            <InputNumber
              style={{ width: '100%' }}
              prefix="₱"
              step={0.01}
              min={0}
              placeholder="0.00"
            />
          </Form.Item>

          <Form.Item
            name="category"
            label="Category (Optional)"
          >
            <Select placeholder="Select a category" allowClear>
              {expenseCategories.map((cat) => (
                <Option key={cat} value={cat}>
                  {cat}
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item name="budget_id" hidden>
            <Input />
          </Form.Item>

          <Form.Item name="frequency" hidden initialValue="one_time">
            <Input />
          </Form.Item>

          <Form.Item
            name="expense_date"
            label="Date"
            rules={[{ required: true, message: 'Please select a date' }]}
          >
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>

          <Form.Item
            name="is_paid"
            valuePropName="checked"
            label="Paid"
          >
            <Switch />
            <div style={{ fontSize: '12px', color: '#6b7280', marginTop: 4 }}>
              Mark as paid if you've already paid this expense. Unpaid expenses won't deduct from the budget amount.
            </div>
          </Form.Item>
        </Form>
      </Modal>

      {/* View Budget Expenses Modal */}
      <Modal
        title={`${viewingBudget?.name || 'Budget'} Expenses`}
        open={isViewExpensesModalOpen}
        onCancel={() => {
          setIsViewExpensesModalOpen(false)
          setViewingBudget(null)
        }}
        footer={[
          <Button key="close" onClick={() => {
            setIsViewExpensesModalOpen(false)
            setViewingBudget(null)
          }}>
            Close
          </Button>
        ]}
        width={700}
      >
        {viewingBudget && (() => {
          const budgetExpenses = getBudgetExpenses(viewingBudget.id)
          const remaining = getBudgetRemaining(viewingBudget)
          
          if (budgetExpenses.length === 0) {
            return (
              <Empty 
                description="No expenses yet" 
                image={Empty.PRESENTED_IMAGE_SIMPLE}
              />
            )
          }

          return (
            <Space direction="vertical" style={{ width: '100%' }} size="middle">
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                padding: '12px',
                backgroundColor: '#f5f5f5',
                borderRadius: '4px'
              }}>
                <Space direction="vertical" size={0}>
                  <Text type="secondary" style={{ fontSize: '12px' }}>Total Budget</Text>
                  <Text strong style={{ fontSize: '16px' }}>{formatCurrency(viewingBudget.amount)}</Text>
                </Space>
                <Space direction="vertical" size={0} align="end">
                  <Text type="secondary" style={{ fontSize: '12px' }}>Spent</Text>
                  <Text strong style={{ fontSize: '16px', color: '#dc2626' }}>
                    {formatCurrency(viewingBudget.amount - remaining)}
                  </Text>
                </Space>
                <Space direction="vertical" size={0} align="end">
                  <Text type="secondary" style={{ fontSize: '12px' }}>Remaining</Text>
                  <Text 
                    strong 
                    style={{ 
                      fontSize: '16px',
                      color: remaining >= 0 ? '#16a34a' : '#dc2626'
                    }}
                  >
                    {formatCurrency(remaining)}
                  </Text>
                </Space>
              </div>
              <List
                dataSource={budgetExpenses}
                renderItem={(expense) => (
                  <List.Item
                    style={{
                      padding: '12px 0',
                      borderBottom: '1px solid #f0f0f0',
                    }}
                  >
                    <List.Item.Meta
                      avatar={
                        <Checkbox 
                          checked={expense.is_paid} 
                          onChange={() => handleToggleExpensePaid(expense.id, expense.is_paid)}
                        />
                      }
                      title={
                        <Space>
                          <Text delete={expense.is_paid} strong={!expense.is_paid}>
                            {expense.description}
                          </Text>
                          {expense.category && (
                            <Tag>{expense.category}</Tag>
                          )}
                        </Space>
                      }
                      description={
                        <Text type="secondary" style={{ fontSize: '12px' }}>
                          {formatDate(expense.expense_date)}
                        </Text>
                      }
                    />
                    <Space>
                      <Text
                        strong
                        delete={expense.is_paid}
                        style={{
                          color: expense.is_paid ? '#9ca3af' : '#dc2626',
                        }}
                      >
                        -{formatCurrency(expense.amount)}
                      </Text>
                      {!expense.is_paid && (
                        <Button
                          type="text"
                          size="small"
                          icon={<EditOutlined />}
                          onClick={() => handleOpenEditExpenseModal(expense)}
                          style={{ color: '#1890ff' }}
                        />
                      )}
                      <Popconfirm
                        title="Delete expense"
                        description="Are you sure you want to delete this expense?"
                        onConfirm={() => handleDeleteExpense(expense.id)}
                        okText="Yes"
                        cancelText="No"
                      >
                        <Button
                          type="text"
                          danger
                          size="small"
                          icon={<DeleteOutlined />}
                        />
                      </Popconfirm>
                    </Space>
                  </List.Item>
                )}
              />
            </Space>
          )
        })()}
      </Modal>

      {/* Edit Budget Expense Modal */}
      <Modal
        title="Edit Expense"
        open={isEditExpenseModalOpen}
        onCancel={handleCloseEditExpenseModal}
        onOk={editExpenseForm.submit}
        confirmLoading={isUpdatingExpense}
        okText="Update Expense"
        cancelText="Cancel"
        width={600}
      >
        <Form
          form={editExpenseForm}
          layout="vertical"
          onFinish={handleSubmitEditExpense}
        >
          <Form.Item
            name="description"
            label="Description"
            rules={[{ required: true, message: 'Please enter a description' }]}
          >
            <Input placeholder="e.g., Groceries, Coffee, Uber ride" />
          </Form.Item>

          <Form.Item
            name="amount"
            label="Amount (₱)"
            rules={[
              { required: true, message: 'Please enter an amount' },
              { type: 'number', min: 0.01, message: 'Amount must be greater than 0' },
            ]}
          >
            <InputNumber
              style={{ width: '100%' }}
              prefix="₱"
              step={0.01}
              min={0}
              placeholder="0.00"
            />
          </Form.Item>

          <Form.Item
            name="category"
            label="Category (Optional)"
          >
            <Select placeholder="Select a category" allowClear>
              {expenseCategories.map((cat) => (
                <Option key={cat} value={cat}>
                  {cat}
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            name="expense_date"
            label="Date"
            rules={[{ required: true, message: 'Please select a date' }]}
          >
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}

