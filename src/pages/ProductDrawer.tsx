import {
  DollarOutlined,
  HistoryOutlined,
  InfoCircleOutlined,
  LinkOutlined,
  ShopOutlined,
} from '@ant-design/icons'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Alert,
  App,
  Button,
  Card,
  Descriptions,
  Drawer,
  Empty,
  Input,
  List,
  Popconfirm,
  Space,
  Table,
  Tag,
  Tooltip,
  Typography,
} from 'antd'
import { useState } from 'react'
import { api, errorMessage } from '../api/client'
import { LEVEL_LABEL, POSITION } from '../api/lookups'
import { formatMoney, isValidAmount } from '../api/money'
import { ago, formatTime } from '../api/time'
import type { HistoryPoint, ProductRow } from '../api/types'
import { useAuth } from '../auth/AuthContext'

export default function ProductDrawer({
  productId,
  branchId,
  onClose,
}: {
  productId: string
  branchId: string
  onClose: () => void
}) {
  const { can } = useAuth()
  const { message } = App.useApp()
  const queryClient = useQueryClient()
  const [cost, setCost] = useState('')

  const product = useQuery({
    queryKey: ['product', productId, branchId],
    queryFn: async () =>
      (await api.get<ProductRow>(`/products/${productId}`, { params: { branch_id: branchId } })).data,
  })

  const history = useQuery({
    queryKey: ['history', productId],
    queryFn: async () => (await api.get<HistoryPoint[]>(`/products/${productId}/history`)).data,
  })

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ['product', productId] })
    queryClient.invalidateQueries({ queryKey: ['products'] })
  }

  const saveCost = useMutation({
    mutationFn: () => {
      const clean = cost.trim().replace(/,/g, '')
      return api.put(`/branches/${branchId}/products/${productId}/cost`, {
        cost_price: clean,
      })
    },
    onSuccess: () => {
      const isZero = Number(cost.trim().replace(/,/g, '')) === 0
      message.success(
        isZero
          ? 'Cost price cleared (marked as Missing).'
          : 'Cost price saved successfully. Repricing suggestions will update on next run.'
      )
      setCost('')
      refresh()
    },
  })

  const clearCost = useMutation({
    mutationFn: () => api.delete(`/branches/${branchId}/products/${productId}/cost`),
    onSuccess: () => {
      message.success('Cost price cleared (marked as Missing).')
      setCost('')
      refresh()
    },
  })

  const unmatch = useMutation({
    mutationFn: (matchId: string) => api.post(`/matches/${matchId}/reject`),
    onSuccess: () => {
      message.success('Match rejected and removed')
      refresh()
    },
  })

  const p = product.data

  return (
    <Drawer
      open
      width={680}
      onClose={onClose}
      title={
        <div>
          <div style={{ fontSize: 16, fontWeight: 700, color: '#0F172A' }}>
            {p?.name ?? 'Product Details'}
          </div>
          {p?.name_si && (
            <div style={{ fontSize: 12, color: '#64748B', fontWeight: 400 }}>
              {p.name_si}
            </div>
          )}
        </div>
      }
      loading={product.isLoading}
    >
      {p && (
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          {/* Product Overview Card */}
          <Card size="small" style={{ borderRadius: 12 }}>
            <Descriptions size="small" column={2} bordered>
              <Descriptions.Item label="Our Selling Price">
                <strong className="num" style={{ fontSize: 15, color: '#0F172A' }}>
                  {p.our_price ? `Rs ${formatMoney(p.our_price)}` : '—'}
                </strong>
              </Descriptions.Item>
              <Descriptions.Item label="Market Standing">
                <Tag color={POSITION[p.position].color} style={{ borderRadius: 6 }}>
                  {POSITION[p.position].label}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Printed MRP">
                <span className="num">{p.mrp ? `Rs ${formatMoney(p.mrp)}` : '—'}</span>
              </Descriptions.Item>
              <Descriptions.Item label="Review Cadence">
                <Tag>{LEVEL_LABEL[p.review_level]}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="SKU / Barcode">
                <span>{p.sku ?? '—'}</span>
              </Descriptions.Item>
              <Descriptions.Item label="Cost Price">
                <span className="num" style={{ fontWeight: 600, color: p.cost_price ? '#059669' : '#D97706' }}>
                  {p.cost_price ? `Rs ${formatMoney(p.cost_price)}` : 'Missing'}
                </span>
              </Descriptions.Item>
            </Descriptions>
          </Card>

          {/* Cost Price Entry */}
          {can('costs.write') && (
            <Card
              size="small"
              title={
                <span style={{ fontSize: 13, fontWeight: 600 }}>
                  <DollarOutlined style={{ marginRight: 6, color: '#E11D48' }} />
                  Update Branch Cost Price
                </span>
              }
              style={{ borderRadius: 12, background: '#FFF1F2', borderColor: '#FECDD3' }}
            >
              <Typography.Text type="secondary" style={{ display: 'block', fontSize: 12, marginBottom: 10 }}>
                Cost price is required to calculate the protected 5% minimum profit floor. (Enter 0 or use Clear to reset to Missing)
              </Typography.Text>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <Space.Compact style={{ flex: 1 }}>
                  <Input
                    addonBefore="Rs"
                    placeholder={p.cost_price ? `Current: ${formatMoney(p.cost_price)}` : 'Enter purchase cost (0 to clear)'}
                    value={cost}
                    onChange={(e) => setCost(e.target.value)}
                    onPressEnter={() => {
                      if (isValidAmount(cost)) saveCost.mutate()
                    }}
                  />
                  <Button
                    type="primary"
                    disabled={!isValidAmount(cost)}
                    loading={saveCost.isPending}
                    onClick={() => saveCost.mutate()}
                    style={{ background: '#E11D48', borderColor: '#E11D48' }}
                  >
                    Save Cost
                  </Button>
                </Space.Compact>
                {p.cost_price && (
                  <Popconfirm
                    title="Clear cost price?"
                    description="This resets the cost to 'Missing' and protects profit by withholding repricing suggestions until a valid cost is re-entered."
                    onConfirm={() => clearCost.mutate()}
                    okText="Clear"
                    cancelText="Cancel"
                  >
                    <Button danger loading={clearCost.isPending}>
                      Clear
                    </Button>
                  </Popconfirm>
                )}
              </div>
              {(saveCost.error || clearCost.error) && (
                <Alert
                  style={{ marginTop: 8 }}
                  type="error"
                  showIcon
                  message={errorMessage(saveCost.error || clearCost.error)}
                />
              )}
            </Card>
          )}

          {/* Competitor Prices Table */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
              <ShopOutlined style={{ color: '#E11D48' }} />
              <Typography.Title level={5} style={{ margin: 0, fontSize: 14 }}>
                Competitor Offerings
              </Typography.Title>
            </div>
            <Table
              rowKey="match_id"
              size="small"
              pagination={false}
              dataSource={p.prices}
              locale={{
                emptyText: (
                  <Empty
                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                    description="No competitor products currently matched"
                  />
                ),
              }}
              columns={[
                {
                  title: 'Shop',
                  dataIndex: 'competitor',
                  render: (v) => <strong>{v}</strong>,
                },
                {
                  title: 'Competitor Listing',
                  render: (_, cp) => (
                    <Space size={6}>
                      <span style={{ fontSize: 13 }}>{cp.item.name}</span>
                      {cp.item.url && (
                        <a href={cp.item.url} target="_blank" rel="noreferrer noopener">
                          <LinkOutlined style={{ color: '#2563EB' }} />
                        </a>
                      )}
                    </Space>
                  ),
                },
                {
                  title: 'Price',
                  align: 'right',
                  render: (_, cp) => (
                    <span
                      className="num"
                      style={{
                        fontWeight: 600,
                        color: '#0F172A',
                        opacity: cp.fresh ? 1 : 0.45,
                      }}
                    >
                      {cp.item.last_price ? `Rs ${formatMoney(cp.item.last_price)}` : '—'}
                    </span>
                  ),
                },
                {
                  title: 'Last Seen',
                  render: (_, cp) => (
                    <Space size={4}>
                      <span style={{ fontSize: 12, color: '#64748B' }}>
                        {ago(cp.item.last_seen_at)}
                      </span>
                      {!cp.fresh && (
                        <Tooltip title={cp.item.in_stock ? 'Price is too old for active suggestions' : 'Out of stock'}>
                          <InfoCircleOutlined style={{ color: '#D97706' }} />
                        </Tooltip>
                      )}
                    </Space>
                  ),
                },
                ...(can('matches.decide')
                  ? [
                      {
                        width: 80,
                        align: 'right' as const,
                        render: (_: unknown, cp: ProductRow['prices'][number]) => (
                          <Popconfirm
                            title="Remove this product match?"
                            description="Will unmatch this competitor item from your catalog."
                            okText="Unmatch"
                            okButtonProps={{ danger: true }}
                            onConfirm={() => unmatch.mutate(cp.match_id)}
                          >
                            <Button size="small" type="link" danger>
                              Wrong
                            </Button>
                          </Popconfirm>
                        ),
                      },
                    ]
                  : []),
              ]}
            />
          </div>

          {/* Price History */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
              <HistoryOutlined style={{ color: '#64748B' }} />
              <Typography.Title level={5} style={{ margin: 0, fontSize: 14 }}>
                Price History (Last 90 Days)
              </Typography.Title>
            </div>
            <List
              size="small"
              loading={history.isLoading}
              dataSource={[...(history.data ?? [])].reverse().slice(0, 20)}
              locale={{ emptyText: 'No historical price points recorded yet' }}
              style={{ background: '#ffffff', borderRadius: 12, border: '1px solid #e2e8f0' }}
              renderItem={(h) => (
                <List.Item style={{ padding: '8px 16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 12, color: '#64748B' }}>{formatTime(h.seen_at)}</span>
                    <strong style={{ fontSize: 13, color: '#334155' }}>{h.competitor}</strong>
                    {h.source === 'manual' && <Tag color="blue" style={{ fontSize: 10 }}>Store Shelf</Tag>}
                  </div>
                  <strong className="num" style={{ fontSize: 13.5, color: '#0F172A' }}>
                    Rs {formatMoney(h.price)}
                  </strong>
                </List.Item>
              )}
            />
          </div>
        </Space>
      )}
    </Drawer>
  )
}
