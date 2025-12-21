import { useState, useMemo } from 'react'
import { 
  Table, 
  Button, 
  Modal, 
  Form, 
  Input, 
  InputNumber, 
  Select, 
  DatePicker, 
  Switch, 
  Typography, 
  Space, 
  Tag, 
  Popconfirm,
  message,
  Empty,
  Card,
  Skeleton
} from 'antd'
import { PlusOutlined, EditOutlined, DeleteOutlined, SearchOutlined } from '@ant-design/icons'
import dayjs, { Dayjs } from 'dayjs'
import { useExpenses, useLiabilities } from '../hooks'
import { Expense } from '../types/database.types'
import { formatCurrency, formatDate } from '../lib/utils'

const { Title } = Typography
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

  const [form] = Form.useForm()
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [searchText, setSearchText] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string | undefined>(undefined)
  const [selectedFrequency, setSelectedFrequency] = useState<string | undefined>(undefined)
  const [selectedStatus, setSelectedStatus] = useState<string | undefined>(undefined)
  const [selectedLinkedTo, setSelectedLinkedTo] = useState<string | undefined>(undefined)

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

  const handleOpenModal = (expense?: Expense) => {
    if (expense) {
      setEditingExpense(expense)
      form.setFieldsValue({
        description: expense.description,
        amount: expense.amount,
        category: expense.category || undefined,
        frequency: expense.frequency || 'one_time',
        expense_date: expense.frequency === 'one_time' ? dayjs(expense.expense_date) : undefined,
        start_date: expense.start_date ? dayjs(expense.start_date) : dayjs(),
        due_date: expense.due_date || undefined,
        is_active: expense.is_active !== undefined ? expense.is_active : true,
        is_paid: expense.is_paid !== undefined ? expense.is_paid : (expense.frequency === 'one_time' ? true : false),
      })
    } else {
      setEditingExpense(null)
      form.resetFields()
      form.setFieldsValue({
        frequency: 'one_time',
        expense_date: dayjs(),
        start_date: dayjs(),
        is_active: true,
        is_paid: true, // One-time expenses default to paid
      })
    }
    setIsModalOpen(true)
  }

  const handleCloseModal = () => {
    setIsModalOpen(false)
    setEditingExpense(null)
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

      const dueDate = values.due_date ? parseInt(values.due_date.toString()) : null
      if (values.frequency !== 'one_time' && (!dueDate || dueDate < 1 || dueDate > 31)) {
        message.error('Please enter a valid due date (1-31) for recurring expenses')
      return
    }

    const input = {
        description: values.description,
      amount,
        category: values.category || null,
        expense_date: values.frequency === 'one_time' 
          ? (values.expense_date as Dayjs).format('YYYY-MM-DD')
          : new Date().toISOString().split('T')[0], // For recurring expenses, use creation date
        frequency: values.frequency,
        due_date: values.frequency !== 'one_time' ? dueDate : null,
        start_date: values.frequency !== 'one_time' 
          ? (values.start_date as Dayjs).format('YYYY-MM-DD')
          : null,
        is_active: values.is_active,
        is_paid: values.is_paid !== undefined ? values.is_paid : (values.frequency === 'one_time' ? true : false),
    }

    if (editingExpense) {
      updateExpense(
        {
          id: editingExpense.id,
          updates: input,
        },
        {
          onSuccess: () => {
              message.success('Expense updated successfully')
            handleCloseModal()
          },
          onError: (error: Error) => {
              message.error('Error updating expense: ' + (error instanceof Error ? error.message : 'Unknown error'))
          },
        }
      )
    } else {
      createExpense(input, {
        onSuccess: () => {
            message.success('Expense created successfully')
          handleCloseModal()
        },
        onError: (error: Error) => {
            message.error('Error creating expense: ' + (error instanceof Error ? error.message : 'Unknown error'))
        },
      })
      }
    } catch (error) {
      // Form validation errors are handled by Ant Design
    }
  }

  const handleDelete = (id: string) => {
      setDeletingId(id)
      deleteExpense(id, {
        onSuccess: () => {
        message.success('Expense deleted successfully')
          setDeletingId(null)
        },
        onError: (error: Error) => {
        message.error('Error deleting expense: ' + (error instanceof Error ? error.message : 'Unknown error'))
          setDeletingId(null)
        },
      })
    }

  // Filter expenses based on search and filters
  const filteredExpenses = useMemo(() => {
    return expenses.filter((expense) => {
      // Search filter
      if (searchText) {
        const searchLower = searchText.toLowerCase()
        const descriptionMatch = expense.description.toLowerCase().includes(searchLower)
        const linkedToMatch = expense.liability_id && liabilityMap.has(expense.liability_id)
          ? liabilityMap.get(expense.liability_id)!.toLowerCase().includes(searchLower)
          : false
        if (!descriptionMatch && !linkedToMatch) {
          return false
        }
      }

      // Category filter
      if (selectedCategory) {
        if (expense.category !== selectedCategory) {
          return false
        }
      }

      // Frequency filter
      if (selectedFrequency) {
        if (expense.frequency !== selectedFrequency) {
          return false
        }
      }

      // Status filter
      if (selectedStatus) {
        if (selectedStatus === 'active' && !expense.is_active) {
          return false
        }
        if (selectedStatus === 'inactive' && expense.is_active) {
          return false
        }
        if (selectedStatus === 'paid' && !expense.is_paid) {
          return false
        }
        if (selectedStatus === 'unpaid' && expense.is_paid) {
          return false
        }
      }

      // Linked To filter
      if (selectedLinkedTo) {
        if (selectedLinkedTo === 'none' && expense.liability_id) {
          return false
        }
        if (selectedLinkedTo !== 'none' && expense.liability_id !== selectedLinkedTo) {
          return false
        }
      }

      return true
    })
  }, [expenses, searchText, selectedCategory, selectedFrequency, selectedStatus, selectedLinkedTo, liabilityMap])

  const columns = [
    {
      title: 'Date',
      key: 'date',
      render: (_: unknown, expense: Expense) => {
        if (expense.frequency === 'one_time') {
          return <div>{formatDate(expense.expense_date)}</div>
        }
        return (
          <div>
            <div>Due: Day {expense.due_date}</div>
            {expense.start_date && (
              <div style={{ fontSize: '12px', color: '#6b7280' }}>
                Started: {formatDate(expense.start_date)}
              </div>
            )}
          </div>
        )
      },
    },
    {
      title: 'Description',
      dataIndex: 'description',
      key: 'description',
    },
    {
      title: 'Linked To',
      key: 'linked_to',
      render: (_: unknown, expense: Expense) => {
        if (expense.liability_id && liabilityMap.has(expense.liability_id)) {
          return (
            <Tag color="purple">{liabilityMap.get(expense.liability_id)}</Tag>
          )
        }
        return <span style={{ color: '#9ca3af' }}>—</span>
      },
    },
    {
      title: 'Category',
      key: 'category',
      render: (_: unknown, expense: Expense) => {
        if (expense.category) {
          return <Tag color="blue">{expense.category}</Tag>
        }
        return <span style={{ color: '#9ca3af' }}>—</span>
      },
    },
    {
      title: 'Type',
      key: 'type',
      render: (_: unknown, expense: Expense) => {
        return (
          <Space>
            {expense.frequency === 'one_time' ? (
              <Tag>One Time</Tag>
            ) : (
              <Tag color="green">
                {expense.frequency === 'monthly' ? 'Monthly' : 'Weekly'} Recurring
              </Tag>
            )}
            {expense.frequency !== 'one_time' && !expense.is_active && (
              <Tag>Inactive</Tag>
            )}
          </Space>
        )
      },
    },
    {
      title: 'Amount',
      key: 'amount',
      align: 'right' as const,
      render: (_: unknown, expense: Expense) => (
        <div style={{ fontWeight: 600 }}>{formatCurrency(expense.amount)}</div>
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      align: 'right' as const,
      render: (_: unknown, expense: Expense) => (
        <Space>
          <Button
            type="link"
            icon={<EditOutlined />}
            onClick={() => handleOpenModal(expense)}
          >
            Edit
          </Button>
          <Popconfirm
            title="Delete expense"
            description="Are you sure you want to delete this expense?"
            onConfirm={() => handleDelete(expense.id)}
            okText="Yes"
            cancelText="No"
          >
            <Button
              type="link"
              danger
              icon={<DeleteOutlined />}
              loading={deletingId === expense.id}
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
        <Title level={2} style={{ marginBottom: 24 }}>Expenses</Title>
        <Card>
          <Skeleton active />
        </Card>
      </div>
    )
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <Title level={2} style={{ margin: 0 }}>Expenses</Title>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => handleOpenModal()}
          size="large"
        >
          Log Expense
        </Button>
      </div>

      {/* Search and Filters */}
      {expenses.length > 0 && (
        <Card style={{ marginBottom: 24 }}>
          <Space direction="vertical" size="middle" style={{ width: '100%' }}>
            <Input
              placeholder="Search expenses by description or linked liability..."
              prefix={<SearchOutlined />}
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              allowClear
              style={{ width: '100%' }}
            />
            <Space wrap>
              <Select
                placeholder="Filter by Category"
                value={selectedCategory}
                onChange={setSelectedCategory}
                allowClear
                style={{ width: 150 }}
              >
                {expenseCategories.map((cat) => (
                  <Option key={cat} value={cat}>
                    {cat}
                  </Option>
                ))}
              </Select>
              <Select
                placeholder="Filter by Type"
                value={selectedFrequency}
                onChange={setSelectedFrequency}
                allowClear
                style={{ width: 150 }}
              >
                <Option value="one_time">One Time</Option>
                <Option value="monthly">Monthly</Option>
                <Option value="weekly">Weekly</Option>
              </Select>
              <Select
                placeholder="Filter by Status"
                value={selectedStatus}
                onChange={setSelectedStatus}
                allowClear
                style={{ width: 150 }}
              >
                <Option value="active">Active</Option>
                <Option value="inactive">Inactive</Option>
                <Option value="paid">Paid</Option>
                <Option value="unpaid">Unpaid</Option>
              </Select>
              <Select
                placeholder="Filter by Linked To"
                value={selectedLinkedTo}
                onChange={setSelectedLinkedTo}
                allowClear
                style={{ width: 200 }}
              >
                <Option value="none">Not Linked</Option>
                {liabilities?.map((liability) => (
                  <Option key={liability.id} value={liability.id}>
                    {liability.name}
                  </Option>
                ))}
              </Select>
              {(searchText || selectedCategory || selectedFrequency || selectedStatus || selectedLinkedTo) && (
                <Button
                  type="link"
                  onClick={() => {
                    setSearchText('')
                    setSelectedCategory(undefined)
                    setSelectedFrequency(undefined)
                    setSelectedStatus(undefined)
                    setSelectedLinkedTo(undefined)
                  }}
                >
                  Clear all filters
                </Button>
              )}
            </Space>
          </Space>
        </Card>
      )}

      {expenses.length === 0 ? (
        <Card>
          <Empty
            description={
              <div>
                <p>No expenses logged yet.</p>
                <Button
                  type="link"
            onClick={() => handleOpenModal()}
                  style={{ marginTop: 8 }}
          >
            Log your first expense
                </Button>
        </div>
            }
          />
        </Card>
      ) : (
        <Card>
          <Table
            columns={columns}
            dataSource={filteredExpenses}
            rowKey="id"
            pagination={{
              pageSize: 10,
              showSizeChanger: true,
              showTotal: (total, range) => 
                `${range[0]}-${range[1]} of ${total} expenses${searchText || selectedCategory || selectedFrequency || selectedStatus || selectedLinkedTo ? ` (filtered from ${expenses.length})` : ''}`,
            }}
            scroll={{ x: 'max-content' }}
          />
        </Card>
      )}

      <Modal
        title={editingExpense ? 'Edit Expense' : 'Log Expense'}
        open={isModalOpen}
        onCancel={handleCloseModal}
        onOk={handleSubmit}
        confirmLoading={isCreating || isUpdating}
        okText={editingExpense ? 'Update' : 'Log Expense'}
        cancelText="Cancel"
        width={600}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
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
            name="frequency"
            label="Frequency"
            rules={[{ required: true }]}
          >
            <Select>
              <Option value="one_time">One Time</Option>
              <Option value="monthly">Monthly (Recurring)</Option>
              <Option value="weekly">Weekly (Recurring)</Option>
            </Select>
            <div style={{ fontSize: '12px', color: '#6b7280', marginTop: 4 }}>
              Select "Monthly" or "Weekly" for recurring bills like utilities
            </div>
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
                      <div style={{ fontSize: '12px', color: '#6b7280', marginTop: 4 }}>
                        When did this expense occur?
                      </div>
                    </Form.Item>
                    <Form.Item
                      name="is_paid"
                      valuePropName="checked"
                      label="Paid"
                    >
                      <Switch />
                      <div style={{ fontSize: '12px', color: '#6b7280', marginTop: 4 }}>
                        Mark as paid if you've already paid this expense. Unpaid expenses won't deduct from your cash.
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
                    <div style={{ fontSize: '12px', color: '#6b7280', marginTop: 4 }}>
                  When does this recurring expense start?
              </div>
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
                    <div style={{ fontSize: '12px', color: '#6b7280', marginTop: 4 }}>
                  What day of the month is this bill due?
              </div>
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
                      Mark as paid if you've already paid this expense. Unpaid expenses won't deduct from your cash.
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
