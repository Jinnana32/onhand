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
  Switch
} from 'antd'
import { PlusOutlined, EditOutlined, DeleteOutlined, SearchOutlined, ShoppingOutlined } from '@ant-design/icons'
import dayjs, { Dayjs } from 'dayjs'
import { useBudgets, useProfile, useExpenses } from '../hooks'
import { Budget } from '../types/database.types'
import { formatCurrency, formatDate } from '../lib/utils'

const { Title } = Typography

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
  const { createExpense, isCreating: isCreatingExpense } = useExpenses()
  const [form] = Form.useForm()
  const [expenseForm] = Form.useForm()
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false)
  const [editingBudget, setEditingBudget] = useState<Budget | null>(null)
  const [selectedBudgetForExpense, setSelectedBudgetForExpense] = useState<Budget | null>(null)
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

          <Form.Item
            name="frequency"
            label="Frequency"
            rules={[{ required: true }]}
          >
            <Select>
              <Option value="one_time">One Time</Option>
              <Option value="monthly">Monthly (Recurring)</Option>
              <Option value="weekly">Weekly (Recurring)</Option>
            </Select>
          </Form.Item>

          <Form.Item
            noStyle
            shouldUpdate={(prevValues, currentValues) => prevValues.frequency !== currentValues.frequency}
          >
            {({ getFieldValue }) => {
              const frequency = getFieldValue('frequency')
              if (frequency === 'one_time') {
                return (
                  <>
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
                  </>
                )
              }
              return (
                <>
                  <Form.Item
                    name="start_date"
                    label="Start Date"
                    rules={[{ required: true, message: 'Please select a start date' }]}
                  >
                    <DatePicker style={{ width: '100%' }} />
                  </Form.Item>
                  <Form.Item
                    name="due_date"
                    label="Due Date (Day of Month, 1-31)"
                    rules={[
                      { required: true, message: 'Please enter a due date' },
                      { type: 'number', min: 1, max: 31, message: 'Due date must be between 1 and 31' },
                    ]}
                  >
                    <InputNumber
                      style={{ width: '100%' }}
                      min={1}
                      max={31}
                      placeholder="15"
                    />
                  </Form.Item>
                  <Form.Item
                    name="is_active"
                    valuePropName="checked"
                  >
                    <Switch />
                    <span style={{ marginLeft: 8 }}>Active</span>
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
                </>
              )
            }}
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}

