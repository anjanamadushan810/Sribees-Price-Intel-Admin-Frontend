import { InfoCircleOutlined, LinkOutlined } from '@ant-design/icons'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Alert, App, Button, Descriptions, Drawer, Input, List, Popconfirm, Space, Table, Tag, Tooltip, Typography } from 'antd'
import { useState } from 'react'
import { api, errorMessage } from '../api/client'
import { LEVEL_LABEL, POSITION } from '../api/lookups'
import { formatMoney, isValidAmount } from '../api/money'
import { ago, formatTime } from '../api/time'
import type { HistoryPoint, ProductRow } from '../api/types'
import { useAuth } from '../auth/AuthContext'

export default function ProductDrawer({ productId, branchId, onClose }: {
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
    queryFn: async () => (await api.get<ProductRow>(`/products/${productId}`, { params: { branch_id: branchId } })).data,
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
    mutationFn: () => api.put(`/branches/${branchId}/products/${productId}/cost`, { cost_price: cost.trim().replace(/,/g, '') }),
    onSuccess: () => { message.success('Cost saved. A new suggestion follows on the next run.'); setCost(''); refresh() },
  })
  const unmatch = useMutation({
    mutationFn: (matchId: string) => api.post(`/matches/${matchId}/reject`),
    onSuccess: () => { message.success('Match removed'); refresh() },
  })

  const p = product.data
  return (
    <Drawer open width={640} onClose={onClose} title={p?.name ?? 'Product'} loading={product.isLoading}>
      {p && (
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          <Descriptions size="small" column={2} bordered>
            <Descriptions.Item label="Our price"><span className="num">{p.our_price ? formatMoney(p.our_price) : '—'}</span></Descriptions.Item>
            <Descriptions.Item label="Position"><Tag color={POSITION[p.position].color}>{POSITION[p.position].label}</Tag></Descriptions.Item>
            <Descriptions.Item label="MRP"><span className="num">{p.mrp ? formatMoney(p.mrp) : '—'}</span></Descriptions.Item>
            <Descriptions.Item label="Checked">{LEVEL_LABEL[p.review_level]}</Descriptions.Item>
            <Descriptions.Item label="SKU">{p.sku ?? '—'}</Descriptions.Item>
            <Descriptions.Item label="Cost">
              <span className="num">{p.cost_price ? formatMoney(p.cost_price) : '—'}</span>
            </Descriptions.Item>
          </Descriptions>

          {can('costs.write') && (
            <Space.Compact style={{ width: '100%' }}>
              <Input addonBefore="Cost price Rs" placeholder={p.cost_price ? 'New cost' : 'What this branch pays'}
                value={cost} onChange={(e) => setCost(e.target.value)} />
              <Button type="primary" disabled={!isValidAmount(cost)} loading={saveCost.isPending}
                onClick={() => saveCost.mutate()}>Save cost</Button>
            </Space.Compact>
          )}
          {saveCost.error && <Alert type="error" showIcon message={errorMessage(saveCost.error)} />}

          <div>
            <Typography.Title level={5}>Competitor prices</Typography.Title>
            <Table
              rowKey="match_id"
              size="small"
              pagination={false}
              dataSource={p.prices}
              locale={{ emptyText: 'No competitor item matched yet' }}
              columns={[
                { title: 'Shop', dataIndex: 'competitor' },
                { title: 'Their item', render: (_, cp) => (
                    <Space size={4}>
                      <span>{cp.item.name}</span>
                      {cp.item.url && <a href={cp.item.url} target="_blank" rel="noreferrer noopener"><LinkOutlined /></a>}
                    </Space>
                  ) },
                { title: 'Price', align: 'right', render: (_, cp) => (
                    <span className="num" style={{ opacity: cp.fresh ? 1 : 0.45 }}>
                      {cp.item.last_price ? formatMoney(cp.item.last_price) : '—'}
                    </span>
                  ) },
                { title: 'Seen', render: (_, cp) => (
                    <Space size={4}>
                      <span>{ago(cp.item.last_seen_at)}</span>
                      {!cp.fresh && (
                        <Tooltip title={cp.item.in_stock ? 'Too old to count for a suggestion' : 'Out of stock there'}>
                          <InfoCircleOutlined style={{ color: '#8c8c8c' }} />
                        </Tooltip>
                      )}
                    </Space>
                  ) },
                ...(can('matches.decide') ? [{
                  width: 90,
                  render: (_: unknown, cp: ProductRow['prices'][number]) => (
                    <Popconfirm title="This is not the same product?" okText="Remove match"
                      onConfirm={() => unmatch.mutate(cp.match_id)}>
                      <Button size="small" type="link" danger>Wrong</Button>
                    </Popconfirm>
                  ),
                }] : []),
              ]}
            />
          </div>

          <div>
            <Typography.Title level={5}>Price history (90 days)</Typography.Title>
            <List
              size="small"
              loading={history.isLoading}
              dataSource={[...(history.data ?? [])].reverse().slice(0, 30)}
              locale={{ emptyText: 'No history yet' }}
              renderItem={(h) => (
                <List.Item>
                  <span>{formatTime(h.seen_at)} · {h.competitor}{h.source === 'manual' && <Tag style={{ marginLeft: 6 }}>Shelf</Tag>}</span>
                  <span className="num">{formatMoney(h.price)}</span>
                </List.Item>
              )}
            />
          </div>
        </Space>
      )}
    </Drawer>
  )
}
