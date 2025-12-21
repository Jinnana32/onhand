import { useState, useMemo } from 'react';
import {
  Table,
  Button,
  Modal,
  Form,
  Input,
  InputNumber,
  Select,
  DatePicker,
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
  Alert,
} from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, SearchOutlined } from '@ant-design/icons';
import dayjs, { Dayjs } from 'dayjs';
import { useLiabilities, useCreditCards } from '../hooks';
import { Liability } from '../types/database.types';
import { formatCurrency } from '../lib/utils';

const { Title, Text } = Typography;
const { Option } = Select;

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

  const [form] = Form.useForm();
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

  const handleOpenModal = (liability?: Liability) => {
    if (liability) {
      setEditingLiability(liability);
      form.setFieldsValue({
        name: liability.name,
        amount: liability.amount,
        due_date: liability.due_date,
        category: liability.category,
        payment_type:
          liability.payment_type ||
          (liability.category === 'loan' ? 'installment' : 'straight'),
        source: liability.source || '',
        credit_card_id: liability.credit_card_id || undefined,
        credit_limit: liability.credit_limit || undefined,
        current_balance: liability.current_balance || undefined,
        months_to_pay: liability.months_to_pay || undefined,
        start_date: liability.start_date
          ? dayjs(liability.start_date)
          : dayjs(),
      });
    } else {
      setEditingLiability(null);
      form.resetFields();
      form.setFieldsValue({
        category: 'credit_card',
        payment_type: 'straight',
        start_date: dayjs(),
      });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingLiability(null);
    form.resetFields();
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      const amount = values.amount;
      const dueDate = values.due_date;
    // Only set current_balance for credit cards, loans, and credit card installments
    const needsCurrentBalance =
        values.category === 'credit_card' || values.category === 'loan';
    const currentBalance =
        needsCurrentBalance && values.current_balance
          ? values.current_balance
        : null;
      const creditLimit = values.credit_limit || null;

    if (isNaN(amount) || amount <= 0) {
        message.error('Please enter a valid amount');
      return;
    }

    if (isNaN(dueDate) || dueDate < 1 || dueDate > 31) {
        message.error('Please enter a valid due date (1-31)');
      return;
    }

    // Determine payment_type and months_to_pay based on category
    let paymentType: 'straight' | 'installment' | null = null;
    let monthsToPay: number | null = null;

      if (values.category === 'credit_card') {
      // Credit card: use selected payment_type
        paymentType = values.payment_type || 'straight';
      // Straight payment = months_to_pay = 1, Installment = user specified
      if (paymentType === 'straight') {
        monthsToPay = 1;
      } else {
        // Installment: user must specify months_to_pay
          monthsToPay = values.months_to_pay || null;
          if (!values.months_to_pay || values.months_to_pay < 1) {
            message.error(
            'Please enter a valid number of months for installment payment (1 or more)'
          );
          return;
        }
      }
      } else if (values.category === 'loan') {
      // Loan: always installment
      paymentType = 'installment';
        monthsToPay = values.months_to_pay || null;
        if (!values.months_to_pay || values.months_to_pay < 1) {
          message.error('Please enter a valid number of months for the loan (1 or more)');
        return;
      }
      } else if (values.category === 'recurring_bill') {
      // Recurring bill: always straight, no months_to_pay (recurring forever)
      paymentType = 'straight';
      monthsToPay = null;
    } else {
      // Other: default to straight
      paymentType = 'straight';
        monthsToPay = values.months_to_pay || null;
      if (
          values.months_to_pay &&
          (isNaN(values.months_to_pay) || values.months_to_pay < 1)
      ) {
          message.error(
          'Please enter a valid number of months (1 or more), or leave empty for recurring forever'
        );
        return;
      }
    }

    const input = {
        name: values.name,
      amount,
      due_date: dueDate,
        category: values.category,
      payment_type: paymentType,
        source: values.source || null,
        credit_card_id: values.credit_card_id || null,
      credit_limit: creditLimit,
      current_balance: currentBalance,
      months_to_pay: monthsToPay,
        start_date: values.start_date
          ? (values.start_date as Dayjs).format('YYYY-MM-DD')
          : null,
    };

    if (editingLiability) {
      updateLiability(
        {
          id: editingLiability.id,
          updates: input,
        },
        {
          onSuccess: () => {
              message.success('Liability updated successfully');
            handleCloseModal();
          },
          onError: (error: Error) => {
              message.error(
              'Error updating liability: ' +
                (error instanceof Error ? error.message : 'Unknown error')
            );
          },
        }
      );
    } else {
      createLiability(input, {
        onSuccess: () => {
            message.success('Liability created successfully');
          handleCloseModal();
        },
        onError: (error: Error) => {
            message.error(
            'Error creating liability: ' +
              (error instanceof Error ? error.message : 'Unknown error')
          );
        },
      });
      }
    } catch (error) {
      // Form validation errors are handled by Ant Design
    }
  };

  const handleDelete = (id: string) => {
      setDeletingId(id);
      deleteLiability(id, {
        onSuccess: () => {
        message.success('Liability deleted successfully');
          setDeletingId(null);
        },
        onError: (error: Error) => {
        message.error(
            'Error deleting liability: ' +
              (error instanceof Error ? error.message : 'Unknown error')
          );
          setDeletingId(null);
        },
      });
  };

  const handleToggleActive = (liability: Liability) => {
    updateLiability(
      {
        id: liability.id,
        updates: { is_active: !liability.is_active },
      },
      {
        onSuccess: () => {
          message.success(
            `Liability ${!liability.is_active ? 'activated' : 'deactivated'} successfully`
          );
        },
        onError: (error: Error) => {
          message.error(
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

  if (isLoading) {
    return (
      <div>
        <Title level={2} style={{ marginBottom: 24 }}>Liabilities</Title>
        <Card>
          <Skeleton active />
        </Card>
      </div>
    );
  }

  const columns = [
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
      render: (_: unknown, liability: Liability) => (
        <Text strong={liability.is_active} delete={!liability.is_active}>
          {liability.name}
        </Text>
      ),
    },
    {
      title: 'Source',
      key: 'source',
      render: (_: unknown, liability: Liability) =>
        liability.source ? (
          <Tag>{liability.source}</Tag>
        ) : (
          <Text type="secondary">—</Text>
        ),
    },
    {
      title: 'Amount',
      key: 'amount',
      render: (_: unknown, liability: Liability) => (
        <Text>{formatCurrency(liability.amount)}</Text>
      ),
    },
    {
      title: 'Due Date',
      key: 'due_date',
      render: (_: unknown, liability: Liability) => (
        <Text>Day {liability.due_date}</Text>
      ),
    },
    {
      title: 'Category',
      key: 'category',
      render: (_: unknown, liability: Liability) => (
        <Tag color="purple">
          {liability.category.replace('_', ' ')}
        </Tag>
      ),
    },
    {
      title: 'Payment Type',
      key: 'payment_type',
      render: (_: unknown, liability: Liability) => {
        if (!liability.payment_type) {
          return <Text type="secondary">—</Text>;
        }
        return (
          <Tag
            color={
              liability.payment_type === 'installment' ? 'orange' : 'green'
            }
          >
            {liability.payment_type === 'installment'
              ? `Installment${
                  liability.months_to_pay
                    ? ` (${liability.months_to_pay} months)`
                    : ''
                }`
              : 'Straight'}
          </Tag>
        );
      },
    },
    {
      title: 'Balance / Limit',
      key: 'balance_limit',
      render: (_: unknown, liability: Liability) => {
        if (liability.current_balance !== null) {
  return (
    <div>
              <Text>{formatCurrency(liability.current_balance)}</Text>
              {liability.credit_limit && (
                <Text type="secondary">
                  {' '}/ {formatCurrency(liability.credit_limit)}
                </Text>
              )}
            </div>
          );
        }
        return <Text type="secondary">—</Text>;
      },
    },
    {
      title: 'Status',
      key: 'status',
      render: (_: unknown, liability: Liability) => (
        <Tag color={liability.is_active ? 'success' : 'default'}>
          {liability.is_active ? 'Active' : 'Inactive'}
        </Tag>
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: unknown, liability: Liability) => (
        <Space>
          <Button
            type="link"
            size="small"
            onClick={() => handleToggleActive(liability)}
          >
            {liability.is_active ? 'Deactivate' : 'Activate'}
          </Button>
          <Button
            type="link"
            icon={<EditOutlined />}
            onClick={() => handleOpenModal(liability)}
          >
            Edit
          </Button>
          <Popconfirm
            title="Delete liability"
            description="Are you sure you want to delete this liability?"
            onConfirm={() => handleDelete(liability.id)}
            okText="Yes"
            cancelText="No"
          >
            <Button
              type="link"
              danger
              icon={<DeleteOutlined />}
              loading={deletingId === liability.id}
            >
              Delete
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

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
        <Title level={2} style={{ margin: 0 }}>Liabilities</Title>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => handleOpenModal()}
          size="large"
        >
          Add Liability
        </Button>
      </div>

      {/* Search and Filters */}
      <Card style={{ marginBottom: 24 }}>
        <Row gutter={[16, 16]}>
          <Col xs={24} md={8}>
          <div>
              <Text strong style={{ display: 'block', marginBottom: 8 }}>
              Search
              </Text>
              <Input
                prefix={<SearchOutlined />}
                placeholder="Search by name, source, or category..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                allowClear
              />
            </div>
          </Col>
          <Col xs={24} md={8}>
          <div>
              <Text strong style={{ display: 'block', marginBottom: 8 }}>
              Category
              </Text>
              <Select
                style={{ width: '100%' }}
              value={selectedCategory}
                onChange={(value) =>
                  setSelectedCategory(value as Liability['category'] | 'all')
                }
              >
                <Option value="all">All Categories</Option>
                <Option value="credit_card">Credit Card</Option>
                <Option value="loan">Loan</Option>
                <Option value="recurring_bill">Recurring Bill</Option>
                <Option value="other">Other</Option>
              </Select>
          </div>
          </Col>
          <Col xs={24} md={8}>
          <div>
              <Text strong style={{ display: 'block', marginBottom: 8 }}>
              Status
              </Text>
              <Select
                style={{ width: '100%' }}
              value={statusFilter}
                onChange={(value) =>
                  setStatusFilter(value as 'all' | 'active' | 'inactive')
                }
              >
                <Option value="all">All Status</Option>
                <Option value="active">Active</Option>
                <Option value="inactive">Inactive</Option>
              </Select>
          </div>
          </Col>
        </Row>

        {/* Clear Filters */}
        {(searchQuery ||
          selectedCategory !== 'all' ||
          statusFilter !== 'all') && (
          <Alert
            message={
              <Space>
                <Text>
              Showing {filteredLiabilities.length} of {liabilities.length}{' '}
              liabilities
                </Text>
                <Button
                  type="link"
                  size="small"
              onClick={() => {
                setSearchQuery('');
                setSelectedCategory('all');
                setStatusFilter('all');
              }}
            >
              Clear all filters
                </Button>
              </Space>
            }
            type="info"
            showIcon
            style={{ marginTop: 16 }}
          />
        )}
      </Card>

      {liabilities.length === 0 ? (
        <Card>
          <Empty
            description={
              <div>
                <p>No liabilities yet.</p>
                <Button
                  type="link"
            onClick={() => handleOpenModal()}
                  style={{ marginTop: 8 }}
          >
            Add your first liability
                </Button>
        </div>
            }
          />
        </Card>
      ) : filteredLiabilities.length === 0 ? (
        <Card>
          <Empty
            description={
              <div>
                <p>No liabilities match your filters.</p>
                <Button
                  type="link"
            onClick={() => {
              setSearchQuery('');
              setSelectedCategory('all');
              setStatusFilter('all');
            }}
                  style={{ marginTop: 8 }}
          >
            Clear filters
                </Button>
        </div>
            }
          />
        </Card>
      ) : (
        <Card>
          <Table
            columns={columns}
            dataSource={filteredLiabilities}
            rowKey="id"
            pagination={{
              pageSize: 10,
              showSizeChanger: true,
              showTotal: (total) => `Total ${total} liabilities`,
            }}
            scroll={{ x: 'max-content' }}
            rowClassName={(record) =>
              !record.is_active ? 'ant-table-row-disabled' : ''
            }
          />
        </Card>
      )}

      <Modal
        title={editingLiability ? 'Edit Liability' : 'Add Liability'}
        open={isModalOpen}
        onCancel={handleCloseModal}
        onOk={handleSubmit}
        confirmLoading={isCreating || isUpdating}
        okText={editingLiability ? 'Update' : 'Create'}
        cancelText="Cancel"
        width={700}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
        >
          <Form.Item
            name="name"
            label="Name"
            rules={[{ required: true, message: 'Please enter a name' }]}
          >
            <Input placeholder="e.g., BPI Credit Card, Atome Loan" />
          </Form.Item>

          <Form.Item
            name="amount"
            label="Monthly Amount (₱)"
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
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item
                name="start_date"
                label="Start Date"
                rules={[{ required: true, message: 'Please select a start date' }]}
              >
                <DatePicker style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name="category"
            label="Category"
            rules={[{ required: true, message: 'Please select a category' }]}
          >
            <Select
              onChange={(value) => {
                const newCategory = value as Liability['category'];
                // Auto-set payment_type based on category
                let newPaymentType: 'straight' | 'installment' | null =
                  'straight';
                if (newCategory === 'loan') {
                  newPaymentType = 'installment';
                } else if (newCategory === 'recurring_bill') {
                  newPaymentType = 'straight';
                } else if (newCategory === 'credit_card') {
                  // Keep existing payment_type for credit card, or default to straight
                  newPaymentType = form.getFieldValue('payment_type') || 'straight';
                }

                form.setFieldsValue({
                  payment_type: newPaymentType,
                  // Clear current_balance and months_to_pay for recurring bills
                  current_balance:
                    newCategory === 'recurring_bill' || newCategory === 'other'
                      ? undefined
                      : form.getFieldValue('current_balance'),
                  months_to_pay:
                    newCategory === 'recurring_bill' ||
                    (newCategory === 'credit_card' &&
                      newPaymentType === 'straight')
                      ? undefined
                      : form.getFieldValue('months_to_pay'),
                });
              }}
            >
              <Option value="credit_card">Credit Card</Option>
              <Option value="loan">Loan</Option>
              <Option value="recurring_bill">Recurring Bill</Option>
              <Option value="other">Other</Option>
            </Select>
          </Form.Item>

          {/* Payment Type - Only for credit cards */}
          <Form.Item
            noStyle
            shouldUpdate={(prevValues, currentValues) =>
              prevValues.category !== currentValues.category
            }
          >
            {({ getFieldValue }) => {
              const category = getFieldValue('category');
              if (category === 'credit_card') {
                return (
                  <Form.Item
                    name="payment_type"
                    label="Payment Type"
                    rules={[{ required: true, message: 'Please select a payment type' }]}
                  >
                    <Select
                      onChange={(value) => {
                        const newPaymentType = value as 'straight' | 'installment';
                        form.setFieldsValue({
                    payment_type: newPaymentType,
                    // Clear months_to_pay if switching to straight
                    months_to_pay:
                      newPaymentType === 'straight'
                              ? undefined
                              : form.getFieldValue('months_to_pay'),
                  });
                }}
                    >
                      <Option value="straight">Straight (Monthly Payment)</Option>
                      <Option value="installment">Installment (Multi-month)</Option>
                    </Select>
                    <div style={{ fontSize: '12px', color: '#6b7280', marginTop: 4 }}>
                      {form.getFieldValue('payment_type') === 'straight'
                  ? 'Pay the full amount monthly (months_to_pay = 1)'
                  : 'Convert to installments over multiple months'}
            </div>
                  </Form.Item>
                );
              }
              return null;
            }}
          </Form.Item>

          <Form.Item
            name="source"
            label="Source / Provider (Optional)"
          >
            <Input
              placeholder={
                form.getFieldValue('category') === 'credit_card'
                  ? 'e.g., BPI, RCBC, BDO'
                  : form.getFieldValue('category') === 'loan'
                  ? 'e.g., Atome, Home Credit, BillEase'
                  : form.getFieldValue('category') === 'recurring_bill'
                  ? 'e.g., Meralco, Maynilad, Manila Water'
                  : 'e.g., Provider name'
              }
            />
          </Form.Item>

          <Form.Item
            noStyle
            shouldUpdate={(prevValues, currentValues) =>
              prevValues.category !== currentValues.category
            }
          >
            {({ getFieldValue }) => {
              const category = getFieldValue('category');
              if (category === 'credit_card') {
                return (
            <>
              {creditCards.length > 0 && (
                      <Form.Item
                        name="credit_card_id"
                        label="Link to Credit Card (Optional)"
                      >
                        <Select
                          placeholder="Select a credit card..."
                          allowClear
                          onChange={(value) => {
                      const selectedCard = creditCards.find(
                              (c) => c.id === value
                            );
                            if (selectedCard) {
                              form.setFieldsValue({
                                credit_limit: selectedCard.credit_limit,
                                current_balance: selectedCard.current_balance,
                              });
                            }
                          }}
                        >
                    {creditCards
                      .filter((c) => c.is_active)
                      .map((card) => (
                              <Option key={card.id} value={card.id}>
                          {card.bank} - {card.name} (Limit:{' '}
                          {formatCurrency(card.credit_limit)})
                              </Option>
                      ))}
                        </Select>
                        <div style={{ fontSize: '12px', color: '#6b7280', marginTop: 4 }}>
                    Select a registered credit card to link this liability.
                    Credit limit and balance will be auto-filled.
                </div>
                      </Form.Item>
                    )}
                    <Form.Item name="credit_limit" label="Credit Limit (₱)">
                      <InputNumber
                        style={{ width: '100%' }}
                        prefix="₱"
                        step={0.01}
                        min={0}
                  placeholder="0.00"
                />
                    </Form.Item>
                  </>
                );
              }
              return null;
            }}
          </Form.Item>

          {/* Info for credit cards */}
          <Form.Item
            noStyle
            shouldUpdate={(prevValues, currentValues) =>
              prevValues.category !== currentValues.category ||
              prevValues.payment_type !== currentValues.payment_type
            }
          >
            {({ getFieldValue }) => {
              const category = getFieldValue('category');
              const paymentType = getFieldValue('payment_type');
              if (category === 'credit_card' && paymentType === 'straight') {
                return (
                  <Alert
                    message="Note: Straight payment automatically sets months_to_pay = 1 (monthly payment cycle)."
                    type="info"
                    showIcon
                    style={{ marginBottom: 16 }}
                  />
                );
              }
              return null;
            }}
          </Form.Item>

          {/* Current Balance - Only for credit cards and loans */}
          <Form.Item
            noStyle
            shouldUpdate={(prevValues, currentValues) =>
              prevValues.category !== currentValues.category
            }
          >
            {({ getFieldValue }) => {
              const category = getFieldValue('category');
              if (category === 'credit_card' || category === 'loan') {
                return (
                  <Form.Item name="current_balance" label="Current Balance (₱)">
                    <InputNumber
                      style={{ width: '100%' }}
                      prefix="₱"
                      step={0.01}
                      min={0}
                placeholder="0.00"
              />
                    <div style={{ fontSize: '12px', color: '#6b7280', marginTop: 4 }}>
                      {category === 'credit_card' &&
                  'Outstanding balance on this credit card'}
                      {category === 'loan' && 'Remaining principal amount'}
                      {category === 'credit_card' &&
                        form.getFieldValue('payment_type') === 'installment' &&
                  'Remaining amount to pay for this installment'}
            </div>
                  </Form.Item>
                );
              }
              return null;
            }}
          </Form.Item>

          {/* Months to Pay - Only for loans and credit card installments */}
          <Form.Item
            noStyle
            shouldUpdate={(prevValues, currentValues) =>
              prevValues.category !== currentValues.category ||
              prevValues.payment_type !== currentValues.payment_type
            }
          >
            {({ getFieldValue }) => {
              const category = getFieldValue('category');
              const paymentType = getFieldValue('payment_type');
              if (
                category === 'loan' ||
                (category === 'credit_card' && paymentType === 'installment')
              ) {
                return (
                  <Form.Item
                    name="months_to_pay"
                    label="Months to Pay"
                    rules={[
                      { required: true, message: 'Please enter months to pay' },
                      { type: 'number', min: 1, message: 'Must be at least 1 month' },
                    ]}
                  >
                    <InputNumber
                      style={{ width: '100%' }}
                      min={1}
                placeholder="e.g., 12"
              />
                    <div style={{ fontSize: '12px', color: '#6b7280', marginTop: 4 }}>
                Total number of months for this{' '}
                      {category === 'loan' ? 'loan' : 'installment'}.
            </div>
                  </Form.Item>
                );
              }
              return null;
            }}
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
