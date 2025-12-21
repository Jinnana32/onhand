import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { Session } from '@supabase/supabase-js'
import { ConfigProvider, Spin } from 'antd'
import { supabase } from './lib/supabase'
import { Auth } from './components/Auth'
import { Dashboard } from './components/Dashboard'
import { Layout } from './components/Layout'
import { Liabilities } from './pages/Liabilities'
import { Income } from './pages/Income'
import { Expenses } from './pages/Expenses'
import { Budgets } from './pages/Budgets'
import { Assistant } from './pages/Assistant'
import { AffordabilityCalculator } from './pages/AffordabilityCalculator'
import { CreditCards } from './pages/CreditCards'
import { CashFlow } from './pages/CashFlow'

const queryClient = new QueryClient()

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  return <Layout>{children}</Layout>
}

function App() {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setLoading(false)
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })

    return () => subscription.unsubscribe()
  }, [])

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Spin size="large" />
      </div>
    )
  }

  return (
    <ConfigProvider
      theme={{
        token: {
          colorPrimary: '#6366f1', // indigo-500
          borderRadius: 6,
        },
      }}
    >
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <Routes>
          <Route
            path="/auth"
            element={!session ? <Auth /> : <Navigate to="/" replace />}
          />
          <Route
            path="/"
            element={
              session ? (
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              ) : (
                <Navigate to="/auth" replace />
              )
            }
          />
          <Route
            path="/credit-cards"
            element={
              session ? (
                <ProtectedRoute>
                  <CreditCards />
                </ProtectedRoute>
              ) : (
                <Navigate to="/auth" replace />
              )
            }
          />
          <Route
            path="/liabilities"
            element={
              session ? (
                <ProtectedRoute>
                  <Liabilities />
                </ProtectedRoute>
              ) : (
                <Navigate to="/auth" replace />
              )
            }
          />
          <Route
            path="/income"
            element={
              session ? (
                <ProtectedRoute>
                  <Income />
                </ProtectedRoute>
              ) : (
                <Navigate to="/auth" replace />
              )
            }
          />
          <Route
            path="/expenses"
            element={
              session ? (
                <ProtectedRoute>
                  <Expenses />
                </ProtectedRoute>
              ) : (
                <Navigate to="/auth" replace />
              )
            }
          />
          <Route
            path="/budgets"
            element={
              session ? (
                <ProtectedRoute>
                  <Budgets />
                </ProtectedRoute>
              ) : (
                <Navigate to="/auth" replace />
              )
            }
          />
          <Route
            path="/assistant"
            element={
              session ? (
                <ProtectedRoute>
                  <Assistant />
                </ProtectedRoute>
              ) : (
                <Navigate to="/auth" replace />
              )
            }
          />
          <Route
            path="/calculator"
            element={
              session ? (
                <ProtectedRoute>
                  <AffordabilityCalculator />
                </ProtectedRoute>
              ) : (
                <Navigate to="/auth" replace />
              )
            }
          />
          <Route
            path="/cash-flow"
            element={
              session ? (
                <ProtectedRoute>
                  <CashFlow />
                </ProtectedRoute>
              ) : (
                <Navigate to="/auth" replace />
              )
            }
          />
          </Routes>
        </BrowserRouter>
      </QueryClientProvider>
    </ConfigProvider>
  )
}

export default App

