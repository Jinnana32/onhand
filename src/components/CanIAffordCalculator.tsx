import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Card, InputNumber, Space, Typography, Tag } from 'antd'
import { useFinancialSummary } from '../hooks'
import { formatCurrency } from '../lib/utils'

const { Title, Text } = Typography

export function CanIAffordCalculator() {
  const [amount, setAmount] = useState<number | null>(null)
  const { summary } = useFinancialSummary()

  const purchaseAmount = amount || 0
  const canAfford =
    summary && purchaseAmount > 0
      ? summary.availableCash + summary.netCashFlow >= purchaseAmount
      : null

  return (
    <Card title="Can I Afford This?">
      <Space direction="vertical" size="middle" style={{ width: '100%' }}>
        <InputNumber
          style={{ width: '100%' }}
          prefix="₱"
          placeholder="0.00"
          step={0.01}
          min={0}
          value={amount}
          onChange={(value) => setAmount(value)}
          size="large"
        />
        {purchaseAmount > 0 && summary && (
          <Card
            size="small"
            style={{
              backgroundColor: canAfford ? '#f0fdf4' : '#fef2f2',
              borderColor: canAfford ? '#22c55e' : '#ef4444',
            }}
          >
            <Space direction="vertical" size="small" style={{ width: '100%' }}>
              <Text type="secondary" style={{ fontSize: '12px' }}>Available Budget:</Text>
              <Title level={4} style={{ margin: 0, color: canAfford ? '#16a34a' : '#dc2626' }}>
                {formatCurrency(summary.availableCash + summary.netCashFlow)}
              </Title>
              {canAfford ? (
                <Tag color="success">✓ You can afford this!</Tag>
              ) : (
                <Tag color="error">
                  ✗ Short by {formatCurrency(purchaseAmount - (summary.availableCash + summary.netCashFlow))}
                </Tag>
              )}
            </Space>
          </Card>
        )}
        {summary && (
          <Space split="|" style={{ fontSize: '12px', color: '#6b7280' }}>
            <Text type="secondary" style={{ fontSize: '12px' }}>
              Available Cash: {formatCurrency(summary.availableCash)}
            </Text>
            <Text type="secondary" style={{ fontSize: '12px' }}>
              Net Cash Flow: {formatCurrency(summary.netCashFlow)}
            </Text>
            <Link to="/calculator" style={{ fontSize: '12px' }}>
              View Detailed Calculator →
            </Link>
          </Space>
        )}
      </Space>
    </Card>
  )
}

