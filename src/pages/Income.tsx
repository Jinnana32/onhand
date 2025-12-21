import { useState } from 'react'
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
  Skeleton,
  Row,
  Col,
} from 'antd'
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons'
import dayjs, { Dayjs } from 'dayjs'
import { useIncomeSources } from '../hooks'
import { IncomeSource } from '../types/database.types'
import { formatCurrency, formatDate } from '../lib/utils'

const { Title, Text } = Typography
const { Option } = Select

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

  const [form] = Form.useForm()
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingIncome, setEditingIncome] = useState<IncomeSource | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const handleOpenModal = (income?: IncomeSource) => {
    if (income) {
      setEditingIncome(income)
      form.setFieldsValue({
        name: income.name,
        amount: income.amount,
        frequency: income.frequency,
        category: income.category,
        next_payment_date: income.next_payment_date
          ? dayjs(income.next_payment_date)
          : undefined,
        payment_date: income.payment_date ? dayjs(income.payment_date) : undefined,
        isReceived: income.is_received || false,
      })
    } else {
      setEditingIncome(null)
      form.resetFields()
      form.setFieldsValue({
        frequency: 'monthly',
        category: 'salary',
        isReceived: false,
      })
    }
    setIsModalOpen(true)
  }

  const handleCloseModal = () => {
    setIsModalOpen(false)
    setEditingIncome(null)
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

      // For one-time payments: if received, set payment_date to today and next_payment_date to today
      // If not received, use next_payment_date as the expected date
      let next_payment_date: string | null = null
      let payment_date: string | null = null
      let is_received: boolean = false

      if (values.frequency === 'one_time') {
        is_received = values.isReceived
        if (values.isReceived) {
          // Received: set both to today
          const today = new Date().toISOString().split('T')[0]
          payment_date = today
          next_payment_date = today
        } else {
          // Not received: use next_payment_date as expected date
          next_payment_date = values.next_payment_date
            ? (values.next_payment_date as Dayjs).format('YYYY-MM-DD')
            : null
          payment_date = null
        }
      } else {
        // For recurring payments, use the existing logic
        next_payment_date = values.next_payment_date
          ? (values.next_payment_date as Dayjs).format('YYYY-MM-DD')
          : null
        payment_date = null
        is_received = false
      }

      const input = {
        name: values.name,
        amount,
        frequency: values.frequency,
        category: values.category,
        next_payment_date,
        payment_date,
        is_received,
      }

      if (editingIncome) {
        updateIncomeSource(
          {
            id: editingIncome.id,
            updates: input,
          },
          {
            onSuccess: () => {
              message.success('Income source updated successfully')
              handleCloseModal()
            },
            onError: (error: Error) => {
              message.error(
                'Error updating income source: ' +
                  (error instanceof Error ? error.message : 'Unknown error')
              )
            },
          }
        )
      } else {
        createIncomeSource(input, {
          onSuccess: () => {
            message.success('Income source created successfully')
            handleCloseModal()
          },
          onError: (error: Error) => {
            message.error(
              'Error creating income source: ' +
                (error instanceof Error ? error.message : 'Unknown error')
            )
          },
        })
      }
    } catch (error) {
      // Form validation errors are handled by Ant Design
    }
  }

  const handleDelete = (id: string) => {
    setDeletingId(id)
    deleteIncomeSource(id, {
      onSuccess: () => {
        message.success('Income source deleted successfully')
        setDeletingId(null)
      },
      onError: (error: Error) => {
        message.error(
          'Error deleting income source: ' +
            (error instanceof Error ? error.message : 'Unknown error')
        )
        setDeletingId(null)
      },
    })
  }

  const handleToggleActive = (income: IncomeSource) => {
    updateIncomeSource(
      {
        id: income.id,
        updates: { is_active: !income.is_active },
      },
      {
        onSuccess: () => {
          message.success(
            `Income source ${!income.is_active ? 'activated' : 'deactivated'} successfully`
          )
        },
        onError: (error: Error) => {
          message.error(
            'Error updating income source: ' +
              (error instanceof Error ? error.message : 'Unknown error')
          )
        },
      }
    )
  }

  const columns = [
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
      render: (_: unknown, income: IncomeSource) => (
        <Text strong={income.is_active} delete={!income.is_active}>
          {income.name}
        </Text>
      ),
    },
    {
      title: 'Amount',
      key: 'amount',
      render: (_: unknown, income: IncomeSource) => (
        <Text>{formatCurrency(income.amount)}</Text>
      ),
    },
    {
      title: 'Category',
      key: 'category',
      render: (_: unknown, income: IncomeSource) => (
        <Tag color="blue">{income.category}</Tag>
      ),
    },
    {
      title: 'Frequency',
      key: 'frequency',
      render: (_: unknown, income: IncomeSource) => (
        <Tag color="cyan">{income.frequency}</Tag>
      ),
    },
    {
      title: 'Next Payment',
      key: 'next_payment',
      render: (_: unknown, income: IncomeSource) => (
        <Text type="secondary">
          {income.next_payment_date
            ? formatDate(income.next_payment_date)
            : income.payment_date
            ? formatDate(income.payment_date)
            : 'N/A'}
        </Text>
      ),
    },
    {
      title: 'Status',
      key: 'status',
      render: (_: unknown, income: IncomeSource) => (
        <Tag color={income.is_active ? 'success' : 'default'}>
          {income.is_active ? 'Active' : 'Inactive'}
        </Tag>
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: unknown, income: IncomeSource) => (
        <Space>
          <Button
            type="link"
            size="small"
            onClick={() => handleToggleActive(income)}
          >
            {income.is_active ? 'Deactivate' : 'Activate'}
          </Button>
          <Button
            type="link"
            icon={<EditOutlined />}
            onClick={() => handleOpenModal(income)}
          >
            Edit
          </Button>
          <Popconfirm
            title="Delete income source"
            description="Are you sure you want to delete this income source?"
            onConfirm={() => handleDelete(income.id)}
            okText="Yes"
            cancelText="No"
          >
            <Button
              type="link"
              danger
              icon={<DeleteOutlined />}
              loading={deletingId === income.id}
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
        <Title level={2} style={{ marginBottom: 24 }}>Income Sources</Title>
        <Card>
          <Skeleton active />
        </Card>
      </div>
    )
  }

  return (
    <div>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 24,
        }}
      >
        <Title level={2} style={{ margin: 0 }}>Income Sources</Title>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => handleOpenModal()}
          size="large"
        >
          Add Income Source
        </Button>
      </div>

      {incomeSources.length === 0 ? (
        <Card>
          <Empty
            description={
              <div>
                <p>No income sources yet.</p>
                <Button
                  type="link"
                  onClick={() => handleOpenModal()}
                  style={{ marginTop: 8 }}
                >
                  Add your first income source
                </Button>
              </div>
            }
          />
        </Card>
      ) : (
        <Card>
          <Table
            columns={columns}
            dataSource={incomeSources}
            rowKey="id"
            pagination={{
              pageSize: 10,
              showSizeChanger: true,
              showTotal: (total) => `Total ${total} income sources`,
            }}
            scroll={{ x: 'max-content' }}
            rowClassName={(record) =>
              !record.is_active ? 'ant-table-row-disabled' : ''
            }
          />
        </Card>
      )}

      <Modal
        title={editingIncome ? 'Edit Income Source' : 'Add Income Source'}
        open={isModalOpen}
        onCancel={handleCloseModal}
        onOk={handleSubmit}
        confirmLoading={isCreating || isUpdating}
        okText={editingIncome ? 'Update' : 'Create'}
        cancelText="Cancel"
        width={600}
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item
            name="name"
            label="Name"
            rules={[{ required: true, message: 'Please enter a name' }]}
          >
            <Input placeholder="e.g., Salary, Freelance Project" />
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

          <Row gutter={16}>
            <Col xs={24} sm={12}>
              <Form.Item
                name="category"
                label="Category"
                rules={[{ required: true, message: 'Please select a category' }]}
              >
                <Select>
                  <Option value="salary">Salary</Option>
                  <Option value="project">Project</Option>
                  <Option value="other">Other</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item
                name="frequency"
                label="Frequency"
                rules={[{ required: true, message: 'Please select a frequency' }]}
              >
                <Select>
                  <Option value="monthly">Monthly</Option>
                  <Option value="weekly">Weekly</Option>
                  <Option value="one_time">One Time</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            noStyle
            shouldUpdate={(prevValues, currentValues) =>
              prevValues.frequency !== currentValues.frequency
            }
          >
            {({ getFieldValue }) => {
              const frequency = getFieldValue('frequency')
              if (frequency !== 'one_time') {
                return (
                  <Form.Item
                    name="next_payment_date"
                    label="Next Payment Date"
                    rules={[
                      { required: true, message: 'Please select a next payment date' },
                    ]}
                  >
                    <DatePicker style={{ width: '100%' }} />
                  </Form.Item>
                )
              }
              return (
                <>
                  <Form.Item
                    name="isReceived"
                    valuePropName="checked"
                    label="Received"
                  >
                    <Switch />
                  </Form.Item>
                  {!getFieldValue('isReceived') && (
                    <Form.Item
                      name="next_payment_date"
                      label="Expected Payment Date"
                      rules={[
                        { required: true, message: 'Please select an expected payment date' },
                      ]}
                    >
                      <DatePicker style={{ width: '100%' }} />
                    </Form.Item>
                  )}
                </>
              )
            }}
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}
