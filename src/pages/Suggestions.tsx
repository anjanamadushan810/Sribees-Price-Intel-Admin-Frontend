import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { App, Button, Popconfirm, Segmented, Space, Table, Tag, Tooltip, Typography } from 'antd'
import { useState } from 'react'
import { api, errorMessage } from '../api/client'
import { STATUS_COLOR, statusLabel } from '../api/lookups'
import { formatMoney, toCents } from '../api/money'
import { ago } from '../api/time'
import type { Suggestion, SuggestionStatus } from '../api/types'
import { useAuth } from '../auth/AuthContext'
import BranchPicker from '../components/BranchPicker'
import PageHeader from '../components/PageHeader'

const TABS: SuggestionStatus[] = ['pending', 'applied', 'failed', 'rejected']

export default function Suggestions() {
  const { can } = useAuth()
  const { message, modal } = App.useApp()
  const queryClient = useQueryClient()
  const [branchId, setBranchId] = useState<string>()
  const [status, setStatus] = useState<SuggestionStatus>('pending')
  const decide = can('suggestions.decide')

  const list = useQuery({
    queryKey: ['suggestions', branchId, status],
    queryFn: async () => (await api.get<Suggestion[]>('/suggestions', { params: { branch_id: branchId, status } })).data,
    enabled: !!branchId,
  })
  const act = useMutation({
    mutationFn: async ({ id, verb }: { id: string; verb: 'accept' | 'reject' }) =>
      (await api.post<Suggestion>(`/suggestions/${id}/${verb}`)).data,
    onSuccess: (s) => {
      if (s.status === 'applied') message.success(`Online now sells it at Rs ${formatMoney(s.suggested_price)}`)
      else if (s.status === 'failed') modal.warning({ title: 'Price not changed', content: s.apply_error })
      else message.info('Rejected')
      queryClient.invalidateQueries({ queryKey: ['suggestions'] })
      queryClient.invalidateQueries({ queryKey: ['summary'] })
    },
    onError: (e) => message.error(errorMessage(e)),
  })

  return (
    <>
      <PageHeader title="Price suggestions"
        subtitle="Match the cheapest shop, never below cost + margin. Accept changes this branch's price on Sribees Online."
        extra={<BranchPicker value={branchId} onChange={setBranchId} />} />
      <Segmented style={{ marginBottom: 16 }} value={status} onChange={(v) => setStatus(v as SuggestionStatus)}
        options={TABS.map((t) => ({ value: t, label: statusLabel(t) }))} />
      <Table<Suggestion>
        rowKey="suggestion_id"
        size="middle"
        loading={list.isLoading}
        dataSource={list.data}
        pagination={{ pageSize: 50, hideOnSinglePage: true }}
        scroll={{ x: 900 }}
        columns={[
          { title: 'Product', render: (_, s) => (
              <>
                <div>{s.product_name}</div>
                <Typography.Text type="secondary" style={{ fontSize: 12 }}>{s.sku ?? ''} · {ago(s.created_at)}</Typography.Text>
              </>
            ) },
          { title: 'Now', dataIndex: 'current_price', align: 'right', width: 100,
            render: (v) => <span className="num">{formatMoney(v)}</span> },
          { title: 'Suggested', align: 'right', width: 150, render: (_, s) => (
              <>
                <div className="num" style={{ fontWeight: 600 }}>{formatMoney(s.suggested_price)}</div>
                <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                  −{formatMoney(toCents(s.current_price) - toCents(s.suggested_price))}
                </Typography.Text>
              </>
            ) },
          { title: 'Why', width: 220, render: (_, s) => (
              <Space size={4} wrap>
                <span>{s.cheapest_competitor} {formatMoney(s.cheapest_price)}</span>
                {s.reason === 'floor' && (
                  <Tooltip title={`Cost ${formatMoney(s.cost_price)} + margin = ${formatMoney(s.floor_price)}. We stop here.`}>
                    <Tag color="orange">At floor</Tag>
                  </Tooltip>
                )}
              </Space>
            ) },
          ...(status === 'pending' ? [] : [{ title: 'Result', width: 200, render: (_: unknown, s: Suggestion) => (
              <Space direction="vertical" size={0}>
                <Tag color={STATUS_COLOR[s.status]}>{statusLabel(s.status)}</Tag>
                {s.apply_error && <Typography.Text type="secondary" style={{ fontSize: 12 }}>{s.apply_error}</Typography.Text>}
              </Space>
            ) }]),
          ...(status === 'pending' && decide ? [{ width: 190, render: (_: unknown, s: Suggestion) => (
              <Space>
                <Popconfirm title={`Sell at Rs ${formatMoney(s.suggested_price)} in ${s.branch}?`}
                  description="Sribees Online changes immediately." okText="Change price"
                  onConfirm={() => act.mutate({ id: s.suggestion_id, verb: 'accept' })}>
                  <Button type="primary" size="small" loading={act.isPending && act.variables?.id === s.suggestion_id}>Accept</Button>
                </Popconfirm>
                <Button size="small" onClick={() => act.mutate({ id: s.suggestion_id, verb: 'reject' })}>Reject</Button>
              </Space>
            ) }] : []),
        ]}
      />
    </>
  )
}
