import { Typography, Row, Col, Space } from 'antd'
import { FinancialSnapshotCards } from './FinancialSnapshotCards'
import { CanIAffordCalculator } from './CanIAffordCalculator'
import { RecentExpenses } from './RecentExpenses'
import { UpcomingBills } from './UpcomingBills'

const { Title } = Typography

export function Dashboard() {
  return (
    <Space direction="vertical" size="large" style={{ width: '100%' }}>
      <div>
        <Title level={2} style={{ marginBottom: 24 }}>Dashboard</Title>
        <FinancialSnapshotCards />
      </div>

      <Row gutter={[24, 24]}>
        <Col xs={24} lg={12}>
          <CanIAffordCalculator />
        </Col>
        <Col xs={24} lg={12}>
          <UpcomingBills />
        </Col>
      </Row>

      <RecentExpenses />
    </Space>
  )
}

