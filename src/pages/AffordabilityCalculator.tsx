import { useState } from 'react'
import { 
  Card, 
  InputNumber, 
  Button, 
  Typography, 
  Space, 
  Row, 
  Col, 
  Tag, 
  Alert,
  Divider,
  Statistic,
  Empty
} from 'antd'
import { CheckCircleOutlined, WarningOutlined, CloseCircleOutlined, FlagOutlined } from '@ant-design/icons'
import { useProfile, useLiabilities, useIncomeSources, useExpenses, useCreditCards } from '../hooks'
import { calculateAffordability, AffordabilityCalculation } from '../lib/affordability'
import { formatCurrency } from '../lib/utils'

const { Title, Text } = Typography

export function AffordabilityCalculator() {
  const { profile } = useProfile()
  const { liabilities } = useLiabilities()
  const { incomeSources } = useIncomeSources()
  const { expenses } = useExpenses()
  const { creditCards } = useCreditCards()

  const [purchaseAmount, setPurchaseAmount] = useState<number | null>(null)
  const [calculation, setCalculation] = useState<AffordabilityCalculation | null>(null)

  const handleCalculate = () => {
    if (!purchaseAmount || purchaseAmount <= 0) {
      return
    }

    if (!profile) {
      return
    }

    const result = calculateAffordability(
      purchaseAmount,
      profile.current_cash,
      liabilities,
      incomeSources,
      expenses,
      creditCards
    )

    setCalculation(result)
  }

  const getStatusConfig = (status: string, isOverboard?: boolean) => {
    if (isOverboard && status === 'tight') {
      return {
        icon: <FlagOutlined />,
        color: 'error',
        bgColor: '#fef2f2',
        borderColor: '#fecaca',
      }
    }
    switch (status) {
      case 'affordable':
        return {
          icon: <CheckCircleOutlined />,
          color: 'success',
          bgColor: '#f0fdf4',
          borderColor: '#bbf7d0',
        }
      case 'tight':
        return {
          icon: <WarningOutlined />,
          color: 'warning',
          bgColor: '#fffbeb',
          borderColor: '#fde68a',
        }
      case 'unaffordable':
        return {
          icon: <CloseCircleOutlined />,
          color: 'error',
          bgColor: '#fef2f2',
          borderColor: '#fecaca',
        }
      default:
        return {
          icon: null,
          color: 'default',
          bgColor: '#f9fafb',
          borderColor: '#e5e7eb',
        }
    }
  }

  const getStatusMessage = (status: string, paymentMethod?: string) => {
    switch (status) {
      case 'affordable':
        if (paymentMethod === 'cash') {
          return 'You can afford this purchase with cash!'
        } else if (paymentMethod === 'credit') {
          return 'You can afford this purchase using credit card (no cash on hand)'
        } else if (paymentMethod === 'both') {
          return 'You can afford this purchase with cash and credit'
        }
        return 'You can afford this purchase!'
      case 'tight':
        return 'You can afford this, but it requires future income that hasn\'t been received yet.'
      case 'unaffordable':
        return "You can't afford this purchase right now."
      default:
        return ''
    }
  }

  return (
    <Space direction="vertical" size="large" style={{ width: '100%' }}>
      <div>
        <Title level={2} style={{ marginBottom: 8 }}>Affordability Calculator</Title>
        <Text type="secondary">
          Calculate if you can afford a purchase based on your current financial situation.
        </Text>
      </div>

      <Card>
        <Space direction="vertical" size="middle" style={{ width: '100%' }}>
          <div>
            <Text strong>How much do you want to spend? (₱)</Text>
            <InputNumber
              style={{ width: '100%', marginTop: 8 }}
              prefix="₱"
              placeholder="0.00"
              step={0.01}
              min={0}
              value={purchaseAmount}
              onChange={(value) => setPurchaseAmount(value)}
              size="large"
            />
          </div>
          <Button
            type="primary"
            onClick={handleCalculate}
            disabled={!purchaseAmount || purchaseAmount <= 0}
            size="large"
            block
          >
            Calculate
          </Button>
        </Space>
      </Card>

      {calculation && (
        <>
          {/* Result Card */}
          {(() => {
            const isOverboard = calculation.afterPurchase.overboardAmount > 10000
            const statusConfig = getStatusConfig(calculation.status, isOverboard)
            const statusMessage = isOverboard && calculation.status === 'tight'
              ? 'Warning: This purchase requires a significant amount from future income that hasn\'t been received yet.'
              : getStatusMessage(calculation.status, calculation.paymentMethod)

            return (
              <Card
                style={{
                  backgroundColor: statusConfig.bgColor,
                  borderColor: statusConfig.borderColor,
                  borderWidth: 2,
                }}
              >
                <Space direction="vertical" size="middle" style={{ width: '100%' }}>
                  <Space size="middle">
                    <div style={{ fontSize: '32px' }}>{statusConfig.icon}</div>
                    <div>
                      <Title level={4} style={{ margin: 0 }}>{statusMessage}</Title>
                      <Text type="secondary" style={{ fontSize: '12px' }}>
                        Purchase Amount: {formatCurrency(calculation.purchaseAmount)}
                      </Text>
                      {isOverboard && calculation.status === 'tight' && (
                        <div style={{ marginTop: 4 }}>
                          <Text type="danger" style={{ fontSize: '12px' }}>
                            You're overboard by <strong>{formatCurrency(calculation.afterPurchase.overboardAmount)}</strong> - This is a substantial amount that requires a reliable source of future income.
                          </Text>
                        </div>
                      )}
                      {calculation.paymentMethod === 'credit' && !isOverboard && (
                        <div style={{ marginTop: 4 }}>
                          <Text type="warning" style={{ fontSize: '12px' }}>
                            ⚠️ This purchase will use your credit card since you don't have cash on hand
                          </Text>
                        </div>
                      )}
                    </div>
                  </Space>

                  <Row gutter={[16, 16]}>
                    <Col xs={24} md={8}>
                      <Statistic
                        title="Available NOW"
                        value={formatCurrency(calculation.availableNow)}
                        valueStyle={{ color: '#2563eb' }}
                        prefix="₱"
                      />
                      <Text type="secondary" style={{ fontSize: '12px' }}>Cash + Credit (no future income)</Text>
                    </Col>
                    <Col xs={24} md={8}>
                      <Statistic
                        title="With Future Income"
                        value={formatCurrency(calculation.availableBudget)}
                        valueStyle={{ color: '#16a34a' }}
                        prefix="₱"
                      />
                      <Text type="secondary" style={{ fontSize: '12px' }}>Includes income in next 30 days</Text>
                    </Col>
                    {calculation.creditCardAvailable > 0 && (
                      <Col xs={24} md={8}>
                        <Statistic
                          title="Available Credit"
                          value={formatCurrency(calculation.creditCardAvailable)}
                          prefix="₱"
                        />
                      </Col>
                    )}
                  </Row>
                </Space>
              </Card>
            )
          })()}

          {/* Breakdown Card */}
          <Card title="Calculation Breakdown">
            <Space direction="vertical" size="middle" style={{ width: '100%' }}>
              <Row justify="space-between" align="middle" style={{ padding: '8px 0', borderBottom: '1px solid #f0f0f0' }}>
                <Col>
                  <Text>Starting Cash</Text>
                </Col>
                <Col>
                  <Text strong>{formatCurrency(calculation.breakdown.startingCash)}</Text>
                </Col>
              </Row>
              <Row justify="space-between" align="middle" style={{ padding: '8px 0', borderBottom: '1px solid #f0f0f0' }}>
                <Col>
                  <Text>+ Upcoming Income (next 30 days)</Text>
                </Col>
                <Col>
                  <Text strong style={{ color: '#16a34a' }}>
                    +{formatCurrency(calculation.breakdown.incomeAdded)}
                  </Text>
                </Col>
              </Row>
              <Row justify="space-between" align="middle" style={{ padding: '8px 0', borderBottom: '1px solid #f0f0f0' }}>
                <Col>
                  <Text>- Upcoming Liabilities (next 30 days)</Text>
                </Col>
                <Col>
                  <Text strong style={{ color: '#dc2626' }}>
                    -{formatCurrency(calculation.breakdown.liabilitiesDeducted)}
                  </Text>
                </Col>
              </Row>
              <Row justify="space-between" align="middle" style={{ padding: '8px 0', borderBottom: '1px solid #f0f0f0' }}>
                <Col>
                  <Text>- Recent Expenses (last 30 days)</Text>
                </Col>
                <Col>
                  <Text strong style={{ color: '#dc2626' }}>
                    -{formatCurrency(calculation.breakdown.expensesDeducted)}
                  </Text>
                </Col>
              </Row>
              {calculation.breakdown.creditAvailable > 0 && (
                <Row justify="space-between" align="middle" style={{ padding: '8px 0', borderBottom: '1px solid #f0f0f0' }}>
                  <Col>
                    <Text>+ Available Credit Card Limit</Text>
                  </Col>
                  <Col>
                    <Text strong style={{ color: '#2563eb' }}>
                      +{formatCurrency(calculation.breakdown.creditAvailable)}
                    </Text>
                  </Col>
                </Row>
              )}
              <Row justify="space-between" align="middle" style={{ padding: '8px 0', borderBottom: '1px solid #f0f0f0' }}>
                <Col>
                  <Text>= Available NOW (Cash + Credit)</Text>
                </Col>
                <Col>
                  <Text strong style={{ color: '#2563eb' }}>
                    {formatCurrency(calculation.breakdown.availableNow)}
                  </Text>
                </Col>
              </Row>
              <Divider />
              <Row justify="space-between" align="middle" style={{ padding: '8px 0' }}>
                <Col>
                  <Text strong>Available with Future Income</Text>
                </Col>
                <Col>
                  <Title level={4} style={{ margin: 0 }}>
                    {formatCurrency(calculation.breakdown.finalBudget)}
                  </Title>
                </Col>
              </Row>
            </Space>
          </Card>

          {/* After Purchase Impact */}
          <Card title="If You Make This Purchase">
            <Space direction="vertical" size="large" style={{ width: '100%' }}>
              <Row gutter={[16, 16]}>
                <Col xs={24} sm={12} lg={5}>
                  <Card size="small">
                    <Statistic
                      title="Remaining Cash"
                      value={formatCurrency(calculation.afterPurchase.remainingCash)}
                      prefix="₱"
                    />
                  </Card>
                </Col>
                <Col xs={24} sm={12} lg={5}>
                  <Card size="small">
                    <Statistic
                      title="Remaining Credit"
                      value={formatCurrency(calculation.afterPurchase.remainingCredit)}
                      prefix="₱"
                    />
                  </Card>
                </Col>
                <Col xs={24} sm={12} lg={5}>
                  <Card size="small">
                    <Statistic
                      title="Credit Utilization"
                      value={calculation.afterPurchase.creditUtilization.toFixed(1)}
                      suffix="%"
                    />
                  </Card>
                </Col>
                <Col xs={24} sm={12} lg={5}>
                  <Card size="small">
                    <Statistic
                      title="New Available Budget"
                      value={formatCurrency(calculation.afterPurchase.newAvailableBudget)}
                      prefix="₱"
                    />
                  </Card>
                </Col>
                <Col xs={24} sm={12} lg={4}>
                  <Card
                    size="small"
                    style={{
                      backgroundColor: calculation.afterPurchase.overboardAmount > 0 ? '#fef2f2' : '#f9fafb',
                      borderColor: calculation.afterPurchase.overboardAmount > 0 ? '#fecaca' : undefined,
                    }}
                  >
                    <Statistic
                      title="Overboard Amount"
                      value={formatCurrency(calculation.afterPurchase.overboardAmount)}
                      valueStyle={{
                        color: calculation.afterPurchase.overboardAmount > 0 ? '#dc2626' : undefined,
                      }}
                      prefix="₱"
                    />
                  </Card>
                </Col>
              </Row>

              {calculation.status === 'tight' && (
                <Alert
                  type={calculation.afterPurchase.overboardAmount > 10000 ? 'error' : 'warning'}
                  message={
                    calculation.afterPurchase.overboardAmount > 10000 ? (
                      <>
                        <strong>🚩 Warning:</strong> This purchase requires a significant amount from future income that hasn't been received yet.
                        <br />
                        <strong>Available NOW:</strong> {formatCurrency(calculation.availableNow)} (Cash + Credit)
                        <br />
                        You're overboard by <strong>{formatCurrency(calculation.afterPurchase.overboardAmount)}</strong>, which will need to be covered by future income. This is a substantial amount - make sure you have a reliable source of income coming in and can pay this off before interest accrues.
                      </>
                    ) : (
                      <>
                        <strong>⚠️ Note:</strong> You can afford this, but it requires future income that hasn't been received yet.
                        <br />
                        <strong>Available NOW:</strong> {formatCurrency(calculation.availableNow)} (Cash + Credit)
                        <br />
                        You're short by {formatCurrency(
                          Math.max(0, calculation.purchaseAmount - calculation.availableNow)
                        )}{' '}
                        which will be covered by future income. Make sure you can pay this off before interest accrues.
                      </>
                    )
                  }
                />
              )}

              {calculation.status === 'unaffordable' && (
                <Alert
                  type="error"
                  message={
                    <>
                      <strong>Warning:</strong> You don't have enough funds or credit to make this purchase.
                      You're short by{' '}
                      {formatCurrency(
                        calculation.purchaseAmount -
                          (calculation.availableBudget + calculation.creditCardAvailable)
                      )}
                      .
                    </>
                  }
                />
              )}
            </Space>
          </Card>
        </>
      )}

      {!calculation && (
        <Card>
          <Empty description="Enter an amount above to calculate affordability" />
        </Card>
      )}
    </Space>
  )
}
