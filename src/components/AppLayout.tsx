import {
  AuditOutlined,
  CheckSquareOutlined,
  CloudDownloadOutlined,
  DashboardOutlined,
  EditOutlined,
  LinkOutlined,
  LogoutOutlined,
  SettingOutlined,
  TagsOutlined,
  TeamOutlined,
  UserOutlined,
} from '@ant-design/icons'
import { useQuery } from '@tanstack/react-query'
import { Avatar, Badge, Button, Dropdown, Layout, Menu, Typography, theme } from 'antd'
import type { ItemType } from 'antd/es/menu/interface'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { api } from '../api/client'
import { ROLE_LABEL } from '../api/lookups'
import { useAuth } from '../auth/AuthContext'

interface NavItem { key: string; label: string; icon: React.ReactNode; permission?: string }

const NAV: { group?: string; items: NavItem[] }[] = [
  { items: [
    { key: '/', label: 'Overview', icon: <DashboardOutlined />, permission: 'reports.read' },
    { key: '/products', label: 'Price comparison', icon: <TagsOutlined />, permission: 'prices.read' },
  ] },
  { group: 'Decide', items: [
    { key: '/suggestions', label: 'Price suggestions', icon: <CheckSquareOutlined />, permission: 'suggestions.read' },
  ] },
  { group: 'Keep data right', items: [
    { key: '/matches', label: 'Match queue', icon: <LinkOutlined />, permission: 'matches.read' },
    { key: '/manual', label: 'Shelf prices', icon: <EditOutlined />, permission: 'observations.manual' },
  ] },
  { group: 'Setup', items: [
    { key: '/sources', label: 'Sources', icon: <CloudDownloadOutlined />, permission: 'competitors.read' },
    { key: '/settings', label: 'Price rule', icon: <SettingOutlined />, permission: 'settings.read' },
    { key: '/users', label: 'Users', icon: <TeamOutlined />, permission: 'users.read' },
    { key: '/audit', label: 'Audit log', icon: <AuditOutlined />, permission: 'audit.read' },
  ] },
]
const KEYS = NAV.flatMap((g) => g.items.map((i) => i.key))

export default function AppLayout() {
  const { me, can, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const { token } = theme.useToken()
  // How many products wait for a yes / no, shown on the menu so the queue is found.
  const waiting = useQuery({
    queryKey: ['match-queue-count'],
    queryFn: async () => (await api.get<{ waiting: number }>('/matches/queue/count')).data.waiting,
    enabled: can('matches.read'),
    refetchInterval: 60_000,
  })

  const items: ItemType[] = NAV.flatMap<ItemType>((g) => {
    const visible = g.items.filter((n) => !n.permission || can(n.permission))
      .map((n) => ({
        key: n.key,
        icon: n.icon,
        label: n.key === '/matches' && waiting.data
          ? <span>{n.label} <Badge count={waiting.data} overflowCount={999} size="small" /></span>
          : n.label,
      }))
    if (!visible.length) return []
    return g.group ? [{ type: 'group' as const, key: g.group, label: g.group, children: visible }] : visible
  })
  const selected =
    KEYS
      .filter((k) => k === '/' ? location.pathname === '/' : location.pathname.startsWith(k))
      .sort((a, b) => b.length - a.length)[0] ?? '/'

  return (
    <Layout style={{ height: '100vh', overflow: 'hidden' }}>
      <Layout.Sider
        breakpoint="lg"
        collapsedWidth={0}
        width={232}
        theme="light"
        className="app-sider"
        style={{
          height: '100vh',
          overflowY: 'auto',
          borderRight: `1px solid ${token.colorBorderSecondary}`,
        }}
      >
        <div
          className="brand"
          style={{
            position: 'sticky',
            top: 0,
            zIndex: 2,
            background: '#fff',
          }}
        >
          <span className="brand-mark">S</span>
          <span>
            <strong>Sribees</strong> Price Intel
          </span>
        </div>
        <Menu
          mode="inline"
          selectedKeys={[selected]}
          items={items}
          onClick={(e) => navigate(e.key)}
          style={{ borderInlineEnd: 0 }}
        />
      </Layout.Sider>
      <Layout style={{ height: '100vh', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        <Layout.Header
          className="topbar"
          style={{
            background: token.colorBgContainer,
            borderBottom: `1px solid ${token.colorBorderSecondary}`,
            flexShrink: 0,
            zIndex: 1,
          }}
        >
          <div />
          <Dropdown
            menu={{
              items: [
                { key: 'sessions', icon: <UserOutlined />, label: 'My sessions',
                  onClick: () => navigate('/sessions') },
                { type: 'divider' },
                { key: 'logout', icon: <LogoutOutlined />, label: 'Sign out', onClick: () => logout() },
              ],
            }}
          >
            <Button type="text" style={{ height: 48 }}>
              <Avatar size="small" style={{ background: token.colorPrimary }}>
                {me?.full_name.slice(0, 1).toUpperCase()}
              </Avatar>
              <span className="user-label">
                <Typography.Text strong>{me?.full_name}</Typography.Text>
                <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                  {me ? ROLE_LABEL[me.role] : ''}
                </Typography.Text>
              </span>
            </Button>
          </Dropdown>
        </Layout.Header>
        <Layout.Content style={{ flex: 1, overflowY: 'auto' }}>
          <div className="content">
            <Outlet />
          </div>
        </Layout.Content>
      </Layout>
    </Layout>
  )
}
