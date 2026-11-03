import {
  AuditOutlined,
  CheckSquareOutlined,
  CloudDownloadOutlined,
  DashboardOutlined,
  EditOutlined,
  HeartOutlined,
  LinkOutlined,
  LogoutOutlined,
  SettingOutlined,
  TagsOutlined,
  TeamOutlined,
  UserOutlined,
} from '@ant-design/icons'
import { useQuery } from '@tanstack/react-query'
import { Avatar, Badge, Dropdown, Layout, Menu, Typography, theme } from 'antd'
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
    { key: '/match-health', label: 'Match health', icon: <HeartOutlined />, permission: 'matches.read' },
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
  // Matched items a shop changed or dropped: their prices are out until someone looks.
  const unhealthy = useQuery({
    queryKey: ['match-health-count'],
    queryFn: async () => {
      const c = (await api.get<{ changed: number; gone: number }>('/matches/health/count')).data
      return c.changed + c.gone
    },
    enabled: can('matches.read'),
    refetchInterval: 60_000,
  })
  const badges: Record<string, number | undefined> = {
    '/matches': waiting.data,
    '/match-health': unhealthy.data,
  }

  const items: ItemType[] = NAV.flatMap<ItemType>((g) => {
    const visible = g.items.filter((n) => !n.permission || can(n.permission))
      .map((n) => ({
        key: n.key,
        icon: n.icon,
        label: badges[n.key]
          ? (
            <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span>{n.label}</span>
              <Badge count={badges[n.key]} overflowCount={999} size="small" style={{ backgroundColor: '#E11D48' }} />
            </span>
          )
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
        width={240}
        theme="light"
        className="app-sider"
        style={{
          height: '100vh',
          overflowY: 'auto',
          borderRight: `1px solid ${token.colorBorderSecondary}`,
          background: '#ffffff',
        }}
      >
        <div
          className="brand"
          style={{
            position: 'sticky',
            top: 0,
            zIndex: 2,
            background: '#ffffff',
            borderBottom: `1px solid ${token.colorBorderSecondary}`,
          }}
        >
          <div className="brand-mark">S</div>
          <div className="brand-text">
            <span className="brand-title">SRIBEES</span>
            <span className="brand-badge">Price Intel</span>
          </div>
        </div>
        <div style={{ padding: '12px 8px' }}>
          <Menu
            mode="inline"
            selectedKeys={[selected]}
            items={items}
            onClick={(e) => navigate(e.key)}
            style={{ borderInlineEnd: 0, background: 'transparent' }}
          />
        </div>
      </Layout.Sider>
      <Layout style={{ height: '100vh', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        <Layout.Header
          className="topbar"
          style={{
            borderBottom: `1px solid ${token.colorBorderSecondary}`,
            flexShrink: 0,
            zIndex: 1,
            height: 60,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Typography.Text type="secondary" style={{ fontSize: 13 }}>
              Welcome back, <strong style={{ color: token.colorTextBase }}>{me?.full_name.split(' ')[0]}</strong>
            </Typography.Text>
          </div>
          <Dropdown
            trigger={['click']}
            menu={{
              items: [
                {
                  key: 'profile-header',
                  disabled: true,
                  label: (
                    <div style={{ padding: '4px 0' }}>
                      <div style={{ fontWeight: 600, color: '#0F172A' }}>{me?.full_name}</div>
                      <div style={{ fontSize: 12, color: '#64748B' }}>{me?.email}</div>
                    </div>
                  ),
                },
                { type: 'divider' },
                {
                  key: 'sessions',
                  icon: <UserOutlined />,
                  label: 'My sessions',
                  onClick: () => navigate('/sessions'),
                },
                { type: 'divider' },
                {
                  key: 'logout',
                  icon: <LogoutOutlined style={{ color: '#EF4444' }} />,
                  danger: true,
                  label: 'Sign out',
                  onClick: () => logout(),
                },
              ],
            }}
          >
            <button className="user-profile-btn" style={{ cursor: 'pointer' }}>
              <Avatar
                size={26}
                style={{
                  background: 'linear-gradient(135deg, #E11D48 0%, #BE123C 100%)',
                  fontWeight: 600,
                  fontSize: 13,
                }}
              >
                {me?.full_name.slice(0, 1).toUpperCase()}
              </Avatar>
              <span className="user-label">
                <Typography.Text strong style={{ fontSize: 13 }}>
                  {me?.full_name}
                </Typography.Text>
                <Typography.Text type="secondary" style={{ fontSize: 11 }}>
                  {me ? ROLE_LABEL[me.role] : ''}
                </Typography.Text>
              </span>
            </button>
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
