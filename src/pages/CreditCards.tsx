import { useState } from 'react'
import { 
  Table, 
  Button, 
  Modal, 
  Form, 
  Input, 
  InputNumber, 
  Typography, 
  Space, 
  Tag, 
  Popconfirm,
  message,
  Empty,
  Card,
  Skeleton,
  Progress,
  Switch
} from 'antd'
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons'
import { useCreditCards } from '../hooks/useCreditCards'
import { CreditCard } from '../types/database.types'
import { formatCurrency } from '../lib/utils'

const { Title, Text } = Typography

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

  const [form] = Form.useForm()
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingCard, setEditingCard] = useState<CreditCard | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const handleOpenModal = (card?: CreditCard) => {
    if (card) {
      setEditingCard(card)
      form.setFieldsValue({
        name: card.name,
        bank: card.bank,
        credit_limit: card.credit_limit,
        current_balance: card.current_balance,
        due_date: card.due_date,
      })
    } else {
      setEditingCard(null)
      form.resetFields()
    }
    setIsModalOpen(true)
  }

  const handleCloseModal = () => {
    setIsModalOpen(false)
    setEditingCard(null)
    form.resetFields()
  }

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields()
      const creditLimit = values.credit_limit
      const currentBalance = values.current_balance || 0
      const dueDate = values.due_date

      if (isNaN(creditLimit) || creditLimit <= 0) {
        message.error('Please enter a valid credit limit')
        return
      }

      if (isNaN(dueDate) || dueDate < 1 || dueDate > 31) {
        message.error('Please enter a valid due date (1-31)')
        return
      }

      const input = {
        name: values.name,
        bank: values.bank,
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
              message.success('Credit card updated successfully')
              handleCloseModal()
            },
            onError: (error: Error) => {
              message.error('Error updating credit card: ' + (error instanceof Error ? error.message : 'Unknown error'))
            },
          }
        )
      } else {
        createCreditCard(input, {
          onSuccess: () => {
            message.success('Credit card created successfully')
            handleCloseModal()
          },
          onError: (error: Error) => {
            message.error('Error creating credit card: ' + (error instanceof Error ? error.message : 'Unknown error'))
          },
        })
      }
    } catch (error) {
      // Form validation errors are handled by Ant Design
    }
  }

  const handleDelete = (id: string) => {
    setDeletingId(id)
    deleteCreditCard(id, {
      onSuccess: () => {
        message.success('Credit card deleted successfully')
        setDeletingId(null)
      },
      onError: (error: Error) => {
        message.error('Error deleting credit card: ' + (error instanceof Error ? error.message : 'Unknown error'))
        setDeletingId(null)
      },
    })
  }

  const handleToggleActive = (card: CreditCard) => {
    updateCreditCard(
      {
        id: card.id,
        updates: { is_active: !card.is_active },
      },
      {
        onSuccess: () => {
          message.success(`Credit card ${!card.is_active ? 'activated' : 'deactivated'} successfully`)
        },
        onError: (error: Error) => {
          message.error('Error updating credit card: ' + (error instanceof Error ? error.message : 'Unknown error'))
        },
      }
    )
  }

  const columns = [
    {
      title: 'Card Name',
      dataIndex: 'name',
      key: 'name',
      render: (_: unknown, card: CreditCard) => (
        <Text strong={card.is_active} delete={!card.is_active}>
          {card.name}
        </Text>
      ),
    },
    {
      title: 'Bank',
      key: 'bank',
      render: (_: unknown, card: CreditCard) => (
        <Tag color="blue">{card.bank}</Tag>
      ),
    },
    {
      title: 'Credit Limit',
      key: 'credit_limit',
      render: (_: unknown, card: CreditCard) => (
        <Text>{formatCurrency(card.credit_limit)}</Text>
      ),
    },
    {
      title: 'Current Balance',
      key: 'current_balance',
      render: (_: unknown, card: CreditCard) => (
        <Text>{formatCurrency(card.current_balance)}</Text>
      ),
    },
    {
      title: 'Available Credit',
      key: 'available_credit',
      render: (_: unknown, card: CreditCard) => {
        const availableCredit = card.credit_limit - card.current_balance
        const color =
          availableCredit < card.credit_limit * 0.1
            ? '#dc2626'
            : availableCredit < card.credit_limit * 0.3
            ? '#ea580c'
            : '#16a34a'
        return (
          <Text strong style={{ color }}>
            {formatCurrency(availableCredit)}
          </Text>
        )
      },
    },
    {
      title: 'Utilization',
      key: 'utilization',
      render: (_: unknown, card: CreditCard) => {
        const utilization = (card.current_balance / card.credit_limit) * 100
        const status =
          utilization > 80 ? 'exception' : utilization > 50 ? 'active' : 'success'
        return (
          <Space>
            <Progress
              percent={Math.min(utilization, 100)}
              status={status}
              showInfo={false}
              style={{ width: 80 }}
            />
            <Text>{utilization.toFixed(1)}%</Text>
          </Space>
        )
      },
    },
    {
      title: 'Due Date',
      key: 'due_date',
      render: (_: unknown, card: CreditCard) => (
        <Text>Day {card.due_date}</Text>
      ),
    },
    {
      title: 'Status',
      key: 'status',
      render: (_: unknown, card: CreditCard) => (
        <Tag color={card.is_active ? 'success' : 'default'}>
          {card.is_active ? 'Active' : 'Inactive'}
        </Tag>
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: unknown, card: CreditCard) => (
        <Space>
          <Button
            type="link"
            size="small"
            onClick={() => handleToggleActive(card)}
          >
            {card.is_active ? 'Deactivate' : 'Activate'}
          </Button>
          <Button
            type="link"
            icon={<EditOutlined />}
            onClick={() => handleOpenModal(card)}
          >
            Edit
          </Button>
          <Popconfirm
            title="Delete credit card"
            description="Are you sure you want to delete this credit card? This will also unlink any liabilities associated with it."
            onConfirm={() => handleDelete(card.id)}
            okText="Yes"
            cancelText="No"
          >
            <Button
              type="link"
              danger
              icon={<DeleteOutlined />}
              loading={deletingId === card.id}
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
        <Title level={2} style={{ marginBottom: 24 }}>Credit Cards</Title>
        <Card>
          <Skeleton active />
        </Card>
      </div>
    )
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div>
          <Title level={2} style={{ margin: 0 }}>Credit Cards</Title>
          <Text type="secondary" style={{ fontSize: '14px' }}>
            Manage your credit card accounts. Link them to liabilities to track monthly bills.
          </Text>
        </div>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => handleOpenModal()}
          size="large"
        >
          Add Credit Card
        </Button>
      </div>

      {creditCards.length === 0 ? (
        <Card>
          <Empty
            description={
              <div>
                <p>No credit cards registered yet.</p>
                <Button
                  type="link"
                  onClick={() => handleOpenModal()}
                  style={{ marginTop: 8 }}
                >
                  Add your first credit card
                </Button>
              </div>
            }
          />
        </Card>
      ) : (
        <Card>
          <Table
            columns={columns}
            dataSource={creditCards}
            rowKey="id"
            pagination={{
              pageSize: 10,
              showSizeChanger: true,
              showTotal: (total) => `Total ${total} credit cards`,
            }}
            scroll={{ x: 'max-content' }}
            rowClassName={(record) => (!record.is_active ? 'ant-table-row-disabled' : '')}
          />
        </Card>
      )}

      <Modal
        title={editingCard ? 'Edit Credit Card' : 'Add Credit Card'}
        open={isModalOpen}
        onCancel={handleCloseModal}
        onOk={handleSubmit}
        confirmLoading={isCreating || isUpdating}
        okText={editingCard ? 'Update' : 'Create'}
        cancelText="Cancel"
        width={600}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
        >
          <Form.Item
            name="name"
            label="Card Name"
            rules={[{ required: true, message: 'Please enter a card name' }]}
          >
            <Input placeholder="e.g., BPI Gold, RCBC Visa" />
          </Form.Item>

          <Form.Item
            name="bank"
            label="Bank"
            rules={[{ required: true, message: 'Please enter a bank name' }]}
          >
            <Input placeholder="e.g., BPI, RCBC, BDO" />
          </Form.Item>

          <Form.Item
            name="credit_limit"
            label="Credit Limit (₱)"
            rules={[
              { required: true, message: 'Please enter a credit limit' },
              { type: 'number', min: 0.01, message: 'Credit limit must be greater than 0' },
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
            name="current_balance"
            label="Current Balance (₱)"
            rules={[
              { type: 'number', min: 0, message: 'Balance cannot be negative' },
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
        </Form>
      </Modal>
    </div>
  )
}
