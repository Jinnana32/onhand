import { ReactNode, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

interface LayoutProps {
  children: ReactNode;
}

const navigation = [
  { name: 'Dashboard', href: '/', icon: '📊' },
  { name: 'Calculator', href: '/calculator', icon: '🧮' },
  { name: 'Cash Flow', href: '/cash-flow', icon: '💰' },
  { name: 'Credit Cards', href: '/credit-cards', icon: '💳' },
  { name: 'Liabilities', href: '/liabilities', icon: '📋' },
  { name: 'Income', href: '/income', icon: '💰' },
  { name: 'Expenses', href: '/expenses', icon: '🛒' },
  { name: 'AI Assistant', href: '/assistant', icon: '🤖' },
];

export function Layout({ children }: LayoutProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate('/auth');
  };

  const handleLinkClick = () => {
    setMobileMenuOpen(false);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex lg:flex-shrink-0">
        <div className="flex flex-col w-64">
          <div className="flex flex-col flex-grow bg-white border-r border-gray-200 pt-5 pb-4 overflow-y-auto">
            <div className="flex items-center flex-shrink-0 px-4">
              <h1 className="text-xl font-bold text-gray-900">OnHands</h1>
            </div>
            <div className="mt-5 flex-grow flex flex-col">
              <nav className="flex-1 px-2 space-y-1">
                {navigation.map((item) => {
                  const isActive = location.pathname === item.href;
                  return (
                    <Link
                      key={item.name}
                      to={item.href}
                      className={`${
                        isActive
                          ? 'bg-indigo-50 text-indigo-700 border-indigo-500'
                          : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                      } group flex items-center px-3 py-2 text-sm font-medium border-l-4 border-transparent`}
                    >
                      <span className="mr-3 text-lg">{item.icon}</span>
                      {item.name}
                    </Link>
                  );
                })}
              </nav>
              <div className="flex-shrink-0 flex border-t border-gray-200 p-4">
                <button
                  onClick={handleSignOut}
                  className="flex-shrink-0 w-full group block"
                >
                  <div className="flex items-center">
                    <div className="ml-3">
                      <p className="text-sm font-medium text-gray-700 group-hover:text-gray-900">
                        Sign Out
                      </p>
                    </div>
                  </div>
                </button>
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* Mobile Drawer Overlay */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-40 lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
        >
          <div className="fixed inset-0 bg-gray-600 bg-opacity-75" />
        </div>
      )}

      {/* Mobile Drawer */}
      <div
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-white transform transition-transform duration-300 ease-in-out lg:hidden ${
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex flex-col h-full">
          <div className="flex items-center justify-between px-4 py-5 border-b border-gray-200">
            <h1 className="text-xl font-bold text-gray-900">OnHands</h1>
            <button
              onClick={() => setMobileMenuOpen(false)}
              className="text-gray-500 hover:text-gray-700"
            >
              <span className="sr-only">Close menu</span>
              <svg
                className="h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
          <div className="flex-1 overflow-y-auto">
            <nav className="px-2 py-4 space-y-1">
              {navigation.map((item) => {
                const isActive = location.pathname === item.href;
                return (
                  <Link
                    key={item.name}
                    to={item.href}
                    onClick={handleLinkClick}
                    className={`${
                      isActive
                        ? 'bg-indigo-50 text-indigo-700 border-indigo-500'
                        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                    } group flex items-center px-3 py-2 text-sm font-medium border-l-4 border-transparent`}
                  >
                    <span className="mr-3 text-lg">{item.icon}</span>
                    {item.name}
                  </Link>
                );
              })}
            </nav>
          </div>
          <div className="flex-shrink-0 border-t border-gray-200 p-4">
            <button
              onClick={() => {
                handleSignOut();
                handleLinkClick();
              }}
              className="w-full text-left px-3 py-2 text-sm font-medium text-gray-700 hover:text-gray-900"
            >
              Sign Out
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex flex-col flex-1 overflow-hidden">
        {/* Mobile Header */}
        <div className="lg:hidden bg-white shadow-sm border-b border-gray-200">
          <div className="flex items-center justify-between px-4 h-16">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="text-gray-500 hover:text-gray-700"
            >
              <span className="sr-only">Open menu</span>
              <svg
                className="h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 6h16M4 12h16M4 18h16"
                />
              </svg>
            </button>
            <h1 className="text-xl font-bold text-gray-900">OnHands</h1>
            <button
              onClick={handleSignOut}
              className="text-gray-700 hover:text-gray-900 text-sm font-medium"
            >
              Sign Out
            </button>
          </div>
        </div>

        {/* Desktop Header */}
        <div className="hidden lg:block bg-white shadow-sm border-b border-gray-200">
          <div className="flex items-center justify-end px-6 h-16">
            <button
              onClick={handleSignOut}
              className="text-gray-700 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
            >
              Sign Out
            </button>
          </div>
        </div>

        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
