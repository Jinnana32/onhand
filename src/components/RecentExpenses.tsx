import { Card, List, Tag, Skeleton, Typography, Empty, Space, Button } from 'antd'
import { useNavigate } from 'react-router-dom'
import { useExpenses } from '../hooks'
import { formatCurrency, formatDate } from '../lib/utils'

const { Text } = Typography

export function RecentExpenses() {
  const { expenses, isLoading } = useExpenses()
  const navigate = useNavigate()

  const recentExpenses = expenses.slice(0, 5)

  if (isLoading) {
    return (
      <Card title="Recent Expenses">
        <Skeleton active paragraph={{ rows: 3 }} />
      </Card>
    )
  }

  return (
    <Card
      title="Recent Expenses"
      extra={
        expenses.length > 5 ? (
          <Button type="link" onClick={() => navigate('/expenses')}>
            View All ({expenses.length})
          </Button>
        ) : null
      }
    >
      {recentExpenses.length === 0 ? (
        <Empty
          description={
            <div>
              <p>No expenses logged yet.</p>
              <p style={{ fontSize: '12px', marginTop: '8px' }}>Start tracking your purchases!</p>
            </div>
          }
        />
      ) : (
        <List
          dataSource={recentExpenses}
          renderItem={(expense) => (
            <List.Item>
              <List.Item.Meta
                title={expense.description}
                description={
                  <Space size="small">
                    <Text type="secondary" style={{ fontSize: '12px' }}>
                      {formatDate(expense.expense_date)}
                    </Text>
                    {expense.category && (
                      <>
                        <Text type="secondary">•</Text>
                        <Tag>{expense.category}</Tag>
                      </>
                    )}
                  </Space>
                }
              />
              <Text strong style={{ fontSize: '16px' }}>
                {formatCurrency(expense.amount)}
              </Text>
            </List.Item>
          )}
        />
      )}
    </Card>
  )
}

