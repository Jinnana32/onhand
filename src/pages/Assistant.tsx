import { Typography, Card, Space } from 'antd'
import { RobotOutlined } from '@ant-design/icons'

const { Title, Text } = Typography

export function Assistant() {
  return (
    <div>
      <Title level={2} style={{ marginBottom: 24 }}>AI Assistant</Title>
      <Card>
        <Space direction="vertical" size="large" align="center" style={{ width: '100%', padding: '48px 24px' }}>
          <RobotOutlined style={{ fontSize: '64px', color: '#6366f1' }} />
          <Title level={4} type="secondary">AI Assistant Coming Soon</Title>
          <Text type="secondary" style={{ textAlign: 'center', maxWidth: 400 }}>
            Our AI assistant will help you make better financial decisions by analyzing your spending patterns, 
            suggesting budget optimizations, and answering questions about your finances.
          </Text>
        </Space>
      </Card>
    </div>
  )
}
