import { Result, Spin } from 'antd'
import { lazy, Suspense, type ReactNode } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { useAuth } from './auth/AuthContext'
import LoginPage from './auth/LoginPage'
import AppLayout from './components/AppLayout'

const AuditLog = lazy(() => import('./pages/AuditLog'))
const ManualPrices = lazy(() => import('./pages/ManualPrices'))
const MatchQueue = lazy(() => import('./pages/MatchQueue'))
const Overview = lazy(() => import('./pages/Overview'))
const Products = lazy(() => import('./pages/Products'))
const Sessions = lazy(() => import('./pages/Sessions'))
const Settings = lazy(() => import('./pages/Settings'))
const Sources = lazy(() => import('./pages/Sources'))
const Suggestions = lazy(() => import('./pages/Suggestions'))
const Users = lazy(() => import('./pages/Users'))

// The server enforces every permission; this only hides pages a role cannot use.
function Guard({ permission, children }: { permission: string; children: ReactNode }) {
  const { can } = useAuth()
  if (!can(permission)) {
    return <Result status="403" title="No access" subTitle="Your role cannot open this page." />
  }
  return <>{children}</>
}

const guarded = (permission: string, page: ReactNode) => <Guard permission={permission}>{page}</Guard>

export default function App() {
  const { me, ready, can } = useAuth()
  if (!ready) return <div className="center"><Spin size="large" /></div>
  if (!me) return <LoginPage />
  return (
    <Suspense fallback={<div className="center"><Spin /></div>}>
      <Routes>
        <Route element={<AppLayout />}>
          <Route index element={can('reports.read') ? <Overview /> : <Navigate to="/products" replace />} />
          <Route path="products" element={guarded('prices.read', <Products />)} />
          <Route path="suggestions" element={guarded('suggestions.read', <Suggestions />)} />
          <Route path="matches" element={guarded('matches.read', <MatchQueue />)} />
          <Route path="manual" element={guarded('observations.manual', <ManualPrices />)} />
          <Route path="sources" element={guarded('competitors.read', <Sources />)} />
          <Route path="settings" element={guarded('settings.read', <Settings />)} />
          <Route path="users" element={guarded('users.read', <Users />)} />
          <Route path="audit" element={guarded('audit.read', <AuditLog />)} />
          <Route path="sessions" element={<Sessions />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </Suspense>
  )
}
