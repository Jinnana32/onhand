import { Card, List, Tag, Skeleton, Typography, Empty, Space } from 'antd';
import { useLiabilities } from '../hooks';
import { formatCurrency, getDaysUntilDue } from '../lib/utils';

const { Text } = Typography;

export function UpcomingBills() {
  const { liabilities, isLoading } = useLiabilities();

  // Get upcoming bills in the next 7 days
  const upcomingBills = liabilities
    .filter((liability) => {
      if (!liability.is_active) return false;
      const daysUntil = getDaysUntilDue(liability.due_date);
      return daysUntil >= 0 && daysUntil <= 7;
    })
    .sort((a, b) => getDaysUntilDue(a.due_date) - getDaysUntilDue(b.due_date))
    .slice(0, 5);

  if (isLoading) {
    return (
      <Card title="Cash flow (Next 7 Days)">
        <Skeleton active paragraph={{ rows: 3 }} />
      </Card>
    );
  }

  return (
    <Card title="Cash flow (Next 7 Days)">
      {upcomingBills.length === 0 ? (
        <Empty description="No bills due in the next 7 days." />
      ) : (
        <List
          dataSource={upcomingBills}
          renderItem={(bill) => {
            const daysUntil = getDaysUntilDue(bill.due_date);
            const tagColor =
              daysUntil === 0
                ? 'error'
                : daysUntil <= 2
                ? 'warning'
                : 'processing';
            const tagText =
              daysUntil === 0
                ? 'Due Today'
                : daysUntil === 1
                ? 'Due Tomorrow'
                : `Due in ${daysUntil} days`;

            return (
              <List.Item>
                <List.Item.Meta
                  title={bill.name}
                  description={
                    <Space size="small">
                      <Tag color={tagColor}>{tagText}</Tag>
                      <Tag>{bill.category}</Tag>
                    </Space>
                  }
                />
                <Text strong style={{ fontSize: '16px' }}>
                  {formatCurrency(bill.amount)}
                </Text>
              </List.Item>
            );
          }}
        />
      )}
    </Card>
  );
}
