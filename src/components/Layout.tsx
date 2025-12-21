import { ReactNode, useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Layout as AntLayout, Menu, Drawer, Button } from 'antd';
import { 
  DashboardOutlined, 
  CalculatorOutlined, 
  DollarOutlined, 
  CreditCardOutlined, 
  FileTextOutlined, 
  WalletOutlined, 
  ShoppingOutlined, 
  RobotOutlined,
  MenuOutlined,
  LogoutOutlined
} from '@ant-design/icons';
import { supabase } from '../lib/supabase';

const { Header, Sider, Content } = AntLayout;

// Simple hook to detect mobile (lg breakpoint is 992px in Ant Design)
function useIsMobile() {
  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.innerWidth < 992;
  });

  // This useEffect is necessary for responsive layout detection (external system: browser window)
  // It's a legitimate use case per the project rules
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 992);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return isMobile;
}

interface LayoutProps {
  children: ReactNode;
}

const navigation = [
  { name: 'Dashboard', href: '/', icon: DashboardOutlined },
  { name: 'Calculator', href: '/calculator', icon: CalculatorOutlined },
  { name: 'Cash Flow', href: '/cash-flow', icon: DollarOutlined },
  { name: 'Credit Cards', href: '/credit-cards', icon: CreditCardOutlined },
  { name: 'Liabilities', href: '/liabilities', icon: FileTextOutlined },
  { name: 'Income', href: '/income', icon: WalletOutlined },
  { name: 'Expenses', href: '/expenses', icon: ShoppingOutlined },
  { name: 'Budgets', href: '/budgets', icon: WalletOutlined },
  { name: 'AI Assistant', href: '/assistant', icon: RobotOutlined },
];

export function Layout({ children }: LayoutProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const isMobile = useIsMobile();

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate('/auth');
  };

  const menuItems = navigation.map((item) => ({
    key: item.href,
    icon: <item.icon />,
    label: item.name,
    onClick: () => {
      navigate(item.href);
      setMobileMenuOpen(false);
    },
  }));

  const selectedKeys = [location.pathname];

  return (
    <AntLayout style={{ minHeight: '100vh' }}>
      {/* Desktop Sidebar */}
      {!isMobile && (
        <Sider
          width={256}
          theme="light"
          style={{
            overflow: 'auto',
            height: '100vh',
            position: 'fixed',
            left: 0,
            top: 0,
            bottom: 0,
          }}
        >
        <div style={{ padding: '16px', borderBottom: '1px solid #f0f0f0' }}>
          <h1 style={{ margin: 0, fontSize: '20px', fontWeight: 'bold', color: '#1f2937' }}>
            OnHands
          </h1>
        </div>
        <Menu
          mode="inline"
          selectedKeys={selectedKeys}
          items={menuItems}
          style={{ borderRight: 0, height: 'calc(100vh - 73px)' }}
        />
        <div style={{ padding: '16px', borderTop: '1px solid #f0f0f0' }}>
          <Button
            type="text"
            icon={<LogoutOutlined />}
            onClick={handleSignOut}
            block
            style={{ textAlign: 'left' }}
          >
            Sign Out
          </Button>
        </div>
      </Sider>
      )}

      {/* Mobile Drawer */}
      <Drawer
        title="OnHands"
        placement="left"
        onClose={() => setMobileMenuOpen(false)}
        open={mobileMenuOpen}
        bodyStyle={{ padding: 0 }}
        width={256}
      >
        <Menu
          mode="inline"
          selectedKeys={selectedKeys}
          items={menuItems}
          style={{ borderRight: 0 }}
        />
        <div style={{ padding: '16px', borderTop: '1px solid #f0f0f0' }}>
          <Button
            type="text"
            icon={<LogoutOutlined />}
            onClick={() => {
              handleSignOut();
              setMobileMenuOpen(false);
            }}
            block
            style={{ textAlign: 'left' }}
          >
            Sign Out
          </Button>
        </div>
      </Drawer>

      {/* Main Layout */}
      <AntLayout style={{ marginLeft: isMobile ? 0 : 256 }}>
        {/* Single Header with conditional content */}
        <Header
          style={{
            background: '#fff',
            padding: isMobile ? '0 16px' : '0 24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: isMobile ? 'space-between' : 'flex-end',
            boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
            position: 'sticky',
            top: 0,
            zIndex: 10,
          }}
        >
          {isMobile ? (
            <>
              <Button
                type="text"
                icon={<MenuOutlined />}
                onClick={() => setMobileMenuOpen(true)}
              />
              <h1 style={{ margin: 0, fontSize: '18px', fontWeight: 'bold' }}>OnHands</h1>
              <Button
                type="text"
                icon={<LogoutOutlined />}
                onClick={handleSignOut}
              >
                Sign Out
              </Button>
            </>
          ) : (
            <Button
              type="text"
              icon={<LogoutOutlined />}
              onClick={handleSignOut}
            >
              Sign Out
            </Button>
          )}
        </Header>

        {/* Content */}
        <Content
          style={{
            margin: '24px 16px',
            padding: 24,
            background: '#f5f5f5',
            minHeight: 280,
          }}
        >
          <div style={{ maxWidth: '1280px', margin: '0 auto' }}>
            {children}
          </div>
        </Content>
      </AntLayout>
    </AntLayout>
  );
}
