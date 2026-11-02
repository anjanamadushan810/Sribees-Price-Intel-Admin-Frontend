import {
  DollarOutlined,
  ExclamationCircleOutlined,
  SearchOutlined,
} from '@ant-design/icons'
import { useQuery } from '@tanstack/react-query'
import { Checkbox, Input, Select, Space, Table, Tag, Typography } from 'antd'
import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { api } from '../api/client'
import { LEVEL_LABEL, POSITION } from '../api/lookups'
import { formatMoney, toCents } from '../api/money'
import type { ProductPage, ProductRow } from '../api/types'
import BranchPicker from '../components/BranchPicker'
import PageHeader from '../components/PageHeader'
import ProductDrawer from './ProductDrawer'

const CADENCE_COLORS: Record<string, string> = {
  daily: 'success',
  weekly: 'warning',
  monthly: 'processing',
  long: 'default',
}

export default function Products() {
  const [params, setParams] = useSearchParams()
  const [branchId, setBranchId] = useState<string>()
  const [q, setQ] = useState('')
  const [page, setPage] = useState(1)
  const [open, setOpen] = useState<string | null>(null)
  const position = params.get('position') ?? undefined
  const level = params.get('level') ?? undefined
  const costMissing = params.get('cost_missing') === '1'

  const set = (key: string, value: string | undefined) => {
    const next = new URLSearchParams(params)
    if (value) next.set(key, value)
    else next.delete(key)
    setParams(next, { replace: true })
    setPage(1)
  }

  const list = useQuery({
    queryKey: ['products', branchId, q, position, level, costMissing, page],
    queryFn: async () => (await api.get<ProductPage>('/products', {
      params: {
        branch_id: branchId,
        q: q || undefined,
        position,
        review_level: level,
        cost_missing: costMissing || undefined,
        page,
        limit: 50,
      },
    })).data,
    enabled: !!branchId,
    placeholderData: (prev) => prev,
  })

  return (
    <>
      <PageHeader
        title="Price Comparison"
        subtitle="Real-time supermarket catalog comparison against matched competitor prices"
        extra={<BranchPicker value={branchId} onChange={setBranchId} />}
      />

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          flexWrap: 'wrap',
          marginBottom: 20,
          background: '#ffffff',
          padding: '12px 16px',
          borderRadius: 12,
          border: '1px solid #e2e8f0',
        }}
      >
        <Input
          prefix={<SearchOutlined style={{ color: '#94a3b8' }} />}
          allowClear
          placeholder="Search by product name, Sinhala or SKU..."
          style={{ width: 280 }}
          onPressEnter={(e) => {
            setQ((e.target as HTMLInputElement).value.trim())
            setPage(1)
          }}
          onChange={(e) => {
            if (!e.target.value) {
              setQ('')
              setPage(1)
            }
          }}
        />

        <Select
          allowClear
          placeholder="Market position"
          style={{ width: 180 }}
          value={position}
          onChange={(v) => set('position', v)}
          options={Object.entries(POSITION).map(([value, p]) => ({
            value,
            label: (
              <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    backgroundColor: p.color === 'green' ? '#10B981' : p.color === 'red' ? '#EF4444' : p.color === 'blue' ? '#3B82F6' : '#94A3B8',
                  }}
                />
                {p.label}
              </span>
            ),
          }))}
        />

        <Select
          allowClear
          placeholder="Review cadence"
          style={{ width: 170 }}
          value={level}
          onChange={(v) => set('level', v)}
          options={Object.entries(LEVEL_LABEL).map(([value, label]) => ({
            value,
            label,
          }))}
        />

        <Checkbox
          checked={costMissing}
          onChange={(e) => set('cost_missing', e.target.checked ? '1' : undefined)}
          style={{ marginLeft: 4 }}
        >
          <span style={{ color: costMissing ? '#D97706' : undefined, fontWeight: costMissing ? 600 : 400 }}>
            <DollarOutlined style={{ marginRight: 4 }} /> Cost missing
          </span>
        </Checkbox>
      </div>

      <Table<ProductRow>
        rowKey="product_id"
        size="middle"
        loading={list.isFetching}
        dataSource={list.data?.items}
        scroll={{ x: 950 }}
        onRow={(r) => ({
          onClick: () => setOpen(r.product_id),
          style: { cursor: 'pointer' },
        })}
        pagination={{
          current: page,
          pageSize: 50,
          total: list.data?.total,
          showSizeChanger: false,
          onChange: setPage,
          showTotal: (total, range) => `${range[0]}-${range[1]} of ${total} products`,
        }}
        columns={[
          {
            title: 'Product',
            render: (_, r) => (
              <div style={{ maxWidth: 280 }}>
                <div style={{ fontWeight: 600, color: '#0F172A', fontSize: 13.5 }}>
                  {r.name}
                </div>
                {r.name_si && (
                  <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                    {r.name_si}
                  </Typography.Text>
                )}
                {r.sku && (
                  <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>
                    SKU: {r.sku}
                  </div>
                )}
              </div>
            ),
          },
          {
            title: 'Cadence',
            dataIndex: 'review_level',
            width: 120,
            render: (v: string) => (
              <Tag color={CADENCE_COLORS[v] || 'default'} style={{ borderRadius: 9999 }}>
                {LEVEL_LABEL[v]}
              </Tag>
            ),
          },
          {
            title: 'Our Price',
            dataIndex: 'our_price',
            width: 110,
            align: 'right',
            render: (v) => (
              <span className="num" style={{ fontWeight: 600, color: '#0F172A' }}>
                {v ? `Rs ${formatMoney(v)}` : '—'}
              </span>
            ),
          },
          {
            title: 'Cheapest Market',
            width: 170,
            align: 'right',
            render: (_, r) =>
              r.cheapest_price ? (
                <div>
                  <div className="num" style={{ fontWeight: 600, color: '#0F172A' }}>
                    Rs {formatMoney(r.cheapest_price)}
                  </div>
                  <Typography.Text type="secondary" style={{ fontSize: 11 }}>
                    {r.cheapest_competitor}
                  </Typography.Text>
                </div>
              ) : (
                <span style={{ color: '#94a3b8' }}>—</span>
              ),
          },
          {
            title: 'Price Gap',
            width: 110,
            align: 'right',
            render: (_, r) => {
              if (!r.our_price || !r.cheapest_price) return <span style={{ color: '#94a3b8' }}>—</span>
              const gap = toCents(r.our_price) - toCents(r.cheapest_price)
              const isDearer = gap > 0
              const isCheaper = gap < 0
              return (
                <span
                  className="num"
                  style={{
                    fontWeight: 600,
                    color: isDearer ? '#DC2626' : isCheaper ? '#059669' : '#2563EB',
                  }}
                >
                  {isDearer ? `+Rs ${formatMoney(gap)}` : isCheaper ? `-Rs ${formatMoney(Math.abs(gap))}` : '0.00'}
                </span>
              )
            },
          },
          {
            title: 'Cost',
            dataIndex: 'cost_price',
            width: 110,
            align: 'right',
            render: (v) =>
              v ? (
                <span className="num" style={{ color: '#334155' }}>
                  Rs {formatMoney(v)}
                </span>
              ) : (
                <Tag color="warning" icon={<ExclamationCircleOutlined />} style={{ margin: 0, fontSize: 11 }}>
                  Missing
                </Tag>
              ),
          },
          {
            title: 'Position',
            dataIndex: 'position',
            width: 160,
            render: (v, r) => (
              <Space size={4}>
                <Tag color={POSITION[v].color} style={{ borderRadius: 6 }}>
                  {POSITION[v].label}
                </Tag>
                {r.pending_suggestion_id && (
                  <Tag color="volcano" style={{ borderRadius: 6 }}>
                    Suggestion
                  </Tag>
                )}
              </Space>
            ),
          },
        ]}
      />

      {open && branchId && (
        <ProductDrawer
          productId={open}
          branchId={branchId}
          onClose={() => setOpen(null)}
        />
      )}
    </>
  )
}
