import { LinkOutlined, WarningOutlined } from '@ant-design/icons'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { App, Button, Card, Empty, Pagination, Popconfirm, Progress, Select, Space, Tag, Typography } from 'antd'
import { useState } from 'react'
import { api, errorMessage } from '../api/client'
import { useCompetitors } from '../api/lookups'
import { formatMoney, toCents } from '../api/money'
import type { MatchQueueItem, MatchQueuePage } from '../api/types'
import { useAuth } from '../auth/AuthContext'
import PageHeader from '../components/PageHeader'

/** Owner (2026-10-29): beyond half or double our price, ask once more before matching. */
function priceFarOff(m: MatchQueueItem): boolean {
  if (!m.item.last_price || !m.our_price) return false
  const ratio = toCents(m.item.last_price) / toCents(m.our_price)
  return ratio > 2 || ratio < 0.5
}

export default function MatchQueue() {
  const { can } = useAuth()
  const { message } = App.useApp()
  const queryClient = useQueryClient()
  const competitors = useCompetitors()
  const [competitorId, setCompetitorId] = useState<number>()
  const [page, setPage] = useState(1)
  const decide = can('matches.decide')

  const queue = useQuery({
    queryKey: ['match-queue', competitorId, page],
    queryFn: async () => (await api.get<MatchQueuePage>('/matches/queue', {
      params: { competitor_id: competitorId, page, limit: 20 },
    })).data,
    placeholderData: (prev) => prev,
  })
  const act = useMutation({
    mutationFn: ({ id, verb }: { id: string; verb: 'confirm' | 'reject' }) => api.post(`/matches/${id}/${verb}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['match-queue'] })
      queryClient.invalidateQueries({ queryKey: ['match-queue-count'] })
      queryClient.invalidateQueries({ queryKey: ['summary'] })
    },
    onError: (e) => message.error(errorMessage(e)),
  })

  // One card per product and shop: its candidates side by side, best first.
  const groups = new Map<string, MatchQueueItem[]>()
  for (const m of queue.data?.items ?? []) {
    const key = `${m.product_id}:${m.competitor_id}`
    groups.set(key, [...(groups.get(key) ?? []), m])
  }

  return (
    <>
      <PageHeader title="Match queue"
        subtitle={queue.data
          ? `${queue.data.no_price_yet} products have no shop price yet and come first; ${queue.data.total} pairs in all. Sure matches (same name, size and price) are confirmed automatically.`
          : '…'}
        extra={
          <Select allowClear placeholder="All shops" style={{ width: 200 }} value={competitorId}
            onChange={(v) => { setCompetitorId(v); setPage(1) }}
            options={(competitors.data ?? []).filter((c) => c.kind === 'scraped')
              .map((c) => ({ value: c.competitor_id, label: c.name }))} />
        } />
      {!queue.isLoading && groups.size === 0 && <Empty description="Nothing to check" />}
      <Space direction="vertical" size="middle" style={{ width: '100%' }}>
        {[...groups.values()].map((candidates) => {
          const first = candidates[0]
          return (
            <Card key={`${first.product_id}:${first.competitor_id}`} size="small"
              title={<span>{first.product_name} {first.product_size && <Tag>{first.product_size}</Tag>}</span>}
              extra={<Tag>{first.competitor}</Tag>}>
              <Space direction="vertical" style={{ width: '100%' }}>
                {candidates.map((m) => (
                  <div key={m.match_id} className="candidate">
                    <Progress type="circle" size={38} percent={Math.round(Number(m.score) * 100)} />
                    <div style={{ flex: 1 }}>
                      <div>
                        {m.item.name}{' '}
                        {m.item.url && <a href={m.item.url} target="_blank" rel="noreferrer noopener"><LinkOutlined /></a>}
                      </div>
                      <Typography.Text type="secondary" className="num">
                        Rs {m.item.last_price ? formatMoney(m.item.last_price) : '—'}
                        {m.item.last_mrp && ` · MRP ${formatMoney(m.item.last_mrp)}`}
                        {!m.item.in_stock && ' · out of stock'}
                      </Typography.Text>
                    </div>
                    {decide && (
                      <Space>
                        {priceFarOff(m) ? (
                          <Popconfirm
                            title="The price is far from ours"
                            description={`They sell it at Rs ${formatMoney(m.item.last_price)}, we at Rs ${formatMoney(m.our_price)}. Same pack and size?`}
                            okText="Yes, same product" cancelText="Back"
                            onConfirm={() => act.mutate({ id: m.match_id, verb: 'confirm' })}>
                            <Button type="primary" size="small" icon={<WarningOutlined />}
                              loading={act.isPending && act.variables?.id === m.match_id}>Same product</Button>
                          </Popconfirm>
                        ) : (
                          <Button type="primary" size="small" loading={act.isPending && act.variables?.id === m.match_id}
                            onClick={() => act.mutate({ id: m.match_id, verb: 'confirm' })}>Same product</Button>
                        )}
                        <Button size="small" onClick={() => act.mutate({ id: m.match_id, verb: 'reject' })}>No</Button>
                      </Space>
                    )}
                  </div>
                ))}
              </Space>
            </Card>
          )
        })}
      </Space>
      {(queue.data?.pages ?? 1) > 1 && (
        <Pagination style={{ marginTop: 16 }} current={page} pageSize={20} total={queue.data?.total}
          showSizeChanger={false} onChange={setPage} />
      )}
    </>
  )
}
