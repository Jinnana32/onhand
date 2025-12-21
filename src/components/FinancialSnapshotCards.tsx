import { Card, Row, Col, Skeleton, Button, Modal, Form, InputNumber, message } from 'antd'
import { EditOutlined } from '@ant-design/icons'
import { useFinancialSummary, useProfile } from '../hooks'
import { formatCurrency } from '../lib/utils'
import { useState } from 'react'

export function FinancialSnapshotCards() {
  const { summary, isLoading } = useFinancialSummary()
  const { profile, updateProfile, isUpdating: isUpdatingProfile } = useProfile()
  const [isEditCashModalOpen, setIsEditCashModalOpen] = useState(false)
  const [cashForm] = Form.useForm()

  if (isLoading) {
    return (
      <Row gutter={[16, 16]}>
        {[1, 2, 3, 4].map((i) => (
          <Col xs={24} sm={12} lg={6} key={i}>
            <Card>
              <Skeleton active paragraph={{ rows: 1 }} />
            </Card>
          </Col>
        ))}
      </Row>
    )
  }

  if (!summary) {
    return null
  }

  const cards = [
    {
      title: 'Available Cash',
      value: formatCurrency(summary.availableCash),
      color: '#16a34a',
      borderColor: '#22c55e',
    },
    {
      title: 'Total Liabilities',
      value: formatCurrency(summary.totalLiabilities),
      color: '#dc2626',
      borderColor: '#ef4444',
    },
    {
      title: 'Upcoming Bills',
      value: `${summary.upcomingBillsCount} (${formatCurrency(summary.upcomingBillsTotal)})`,
      color: '#ea580c',
      borderColor: '#f97316',
    },
  ]

  // Only show credit cards info if user has credit cards
  if (summary.totalCreditLimit > 0) {
    cards.push({
      title: 'Available Credit',
      value: formatCurrency(summary.availableCreditLimit),
      color: '#2563eb',
      borderColor: '#3b82f6',
    })
    cards.push({
      title: 'Credit Utilization',
      value: `${summary.creditUtilization.toFixed(1)}%`,
      color:
        summary.creditUtilization > 80
          ? '#dc2626'
          : summary.creditUtilization > 50
          ? '#ea580c'
          : '#16a34a',
      borderColor:
        summary.creditUtilization > 80
          ? '#ef4444'
          : summary.creditUtilization > 50
          ? '#f97316'
          : '#22c55e',
    })
  }

  return (
    <>
      <Row gutter={[16, 16]}>
        {cards.map((card, index) => (
          <Col xs={24} sm={12} lg={cards.length > 4 ? undefined : 6} key={index} flex={cards.length > 4 ? '1 1 0' : undefined}>
            <Card
              style={{
                borderLeft: `4px solid ${card.borderColor}`,
              }}
              bodyStyle={{
                background: card.color === '#16a34a' ? '#f0fdf4' : 
                            card.color === '#dc2626' ? '#fef2f2' : 
                            card.color === '#ea580c' ? '#fff7ed' : 
                            card.color === '#2563eb' ? '#eff6ff' : '#f0fdf4',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                <div style={{ fontSize: '14px', color: '#6b7280' }}>
                  {card.title}
                </div>
                {card.title === 'Available Cash' && (
                  <Button
                    type="text"
                    size="small"
                    icon={<EditOutlined />}
                    onClick={() => {
                      cashForm.setFieldsValue({ current_cash: profile?.current_cash || 0 });
                      setIsEditCashModalOpen(true);
                    }}
                    style={{ padding: 0, height: 'auto', minWidth: 'auto' }}
                  />
                )}
              </div>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: card.color }}>
                {card.value}
              </div>
            </Card>
          </Col>
        ))}
      </Row>

      <Modal
        title="Edit Cash on Hand"
        open={isEditCashModalOpen}
        onCancel={() => {
          setIsEditCashModalOpen(false);
          cashForm.resetFields();
        }}
        onOk={async () => {
          try {
            const values = await cashForm.validateFields();
            updateProfile(
              { current_cash: values.current_cash },
              {
                onSuccess: () => {
                  message.success('Cash on hand updated successfully');
                  setIsEditCashModalOpen(false);
                  cashForm.resetFields();
                },
                onError: (error: Error) => {
                  message.error('Error updating cash: ' + (error instanceof Error ? error.message : 'Unknown error'));
                },
              }
            );
          } catch (error) {
            // Form validation errors are handled by Ant Design
          }
        }}
        confirmLoading={isUpdatingProfile}
        okText="Update"
        cancelText="Cancel"
      >
        <Form
          form={cashForm}
          layout="vertical"
        >
          <Form.Item
            name="current_cash"
            label="Cash on Hand (₱)"
            rules={[
              { required: true, message: 'Please enter the cash amount' },
              { type: 'number', min: 0, message: 'Cash amount must be 0 or greater' },
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
        </Form>
      </Modal>
    </>
  )
}

