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
      params: { branch_id: branchId, q: q || undefined, position, review_level: level,
                cost_missing: costMissing || undefined, page, limit: 50 },
    })).data,
    enabled: !!branchId,
    placeholderData: (prev) => prev,
  })

  return (
    <>
      <PageHeader title="Price comparison" subtitle="Our selling price against the cheapest fresh competitor price"
        extra={<BranchPicker value={branchId} onChange={setBranchId} />} />
      <Space wrap style={{ marginBottom: 16 }}>
        <Input.Search allowClear placeholder="Name, Sinhala name or SKU" style={{ width: 260 }}
          onSearch={(v) => { setQ(v.trim()); setPage(1) }} />
        <Select allowClear placeholder="Any position" style={{ width: 170 }} value={position}
          onChange={(v) => set('position', v)}
          options={Object.entries(POSITION).map(([value, p]) => ({ value, label: p.label }))} />
        <Select allowClear placeholder="Any review level" style={{ width: 170 }} value={level}
          onChange={(v) => set('level', v)}
          options={Object.entries(LEVEL_LABEL).map(([value, label]) => ({ value, label }))} />
        <Checkbox checked={costMissing} onChange={(e) => set('cost_missing', e.target.checked ? '1' : undefined)}>
          Cost price missing
        </Checkbox>
      </Space>
      <Table<ProductRow>
        rowKey="product_id"
        size="middle"
        loading={list.isFetching}
        dataSource={list.data?.items}
        scroll={{ x: 900 }}
        onRow={(r) => ({ onClick: () => setOpen(r.product_id), style: { cursor: 'pointer' } })}
        pagination={{ current: page, pageSize: 50, total: list.data?.total, showSizeChanger: false,
                      onChange: setPage }}
        columns={[
          { title: 'Product', render: (_, r) => (
              <>
                <div>{r.name}</div>
                {r.name_si && <Typography.Text type="secondary" style={{ fontSize: 12 }}>{r.name_si}</Typography.Text>}
              </>
            ) },
          { title: 'Review', dataIndex: 'review_level', width: 120, render: (v) => LEVEL_LABEL[v] },
          { title: 'Our price', dataIndex: 'our_price', width: 110, align: 'right',
            render: (v) => <span className="num">{v ? formatMoney(v) : '—'}</span> },
          { title: 'Cheapest', width: 170, align: 'right', render: (_, r) => r.cheapest_price ? (
              <>
                <div className="num">{formatMoney(r.cheapest_price)}</div>
                <Typography.Text type="secondary" style={{ fontSize: 12 }}>{r.cheapest_competitor}</Typography.Text>
              </>
            ) : '—' },
          { title: 'Gap', width: 100, align: 'right', render: (_, r) => {
              if (!r.our_price || !r.cheapest_price) return '—'
              const gap = toCents(r.our_price) - toCents(r.cheapest_price)
              return <span className="num" style={{ color: gap > 0 ? '#cf1322' : gap < 0 ? '#389e0d' : undefined }}>
                {gap > 0 ? '+' : ''}{formatMoney(gap)}
              </span>
            } },
          { title: 'Cost', dataIndex: 'cost_price', width: 100, align: 'right',
            render: (v) => <span className="num">{v ? formatMoney(v) : '—'}</span> },
          { title: 'Position', dataIndex: 'position', width: 150, render: (v, r) => (
              <Space size={4}>
                <Tag color={POSITION[v].color}>{POSITION[v].label}</Tag>
                {r.pending_suggestion_id && <Tag color="gold">Suggestion</Tag>}
              </Space>
            ) },
        ]}
      />
      {open && branchId && <ProductDrawer productId={open} branchId={branchId} onClose={() => setOpen(null)} />}
    </>
  )
}
