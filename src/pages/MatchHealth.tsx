import { CheckOutlined, CloseOutlined, LinkOutlined, ShopOutlined } from '@ant-design/icons'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { App, Button, Card, Empty, Image, Pagination, Popconfirm, Space, Tabs, Tag, Typography } from 'antd'
import { useState } from 'react'
import { api, errorMessage } from '../api/client'
import { formatMoney } from '../api/money'
import { ago, formatTime } from '../api/time'
import type { MatchHealthItem, MatchHealthPage } from '../api/types'
import { useAuth } from '../auth/AuthContext'
import PageHeader from '../components/PageHeader'

type Kind = 'changed' | 'gone'

const PHOTO_FALLBACK =
  'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="76" height="76"><rect width="76" height="76" fill="%23f1f5f9"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="%2394a3b8" font-size="10">No image</text></svg>'

function Photo({ src, alt }: { src: string | null | undefined; alt: string }) {
  if (!src) return <div className="photo photo-none">No image</div>
  return (
    <Image src={src} alt={alt} width={76} height={76} className="photo" referrerPolicy="no-referrer"
      style={{ objectFit: 'contain', padding: 4 }} fallback={PHOTO_FALLBACK} />
  )
}

/** Matches the shop changed or dropped. Their prices do not count until someone decides. */
export default function MatchHealth() {
  const { can } = useAuth()
  const { message } = App.useApp()
  const queryClient = useQueryClient()
  const [kind, setKind] = useState<Kind>('changed')
  const [page, setPage] = useState(1)
  const decide = can('matches.decide')

  const counts = useQuery({
    queryKey: ['match-health-count'],
    queryFn: async () => (await api.get<Record<Kind, number>>('/matches/health/count')).data,
  })
  const list = useQuery({
    queryKey: ['match-health', kind, page],
    queryFn: async () =>
      (await api.get<MatchHealthPage>('/matches/health', { params: { status: kind, page } })).data,
    placeholderData: (prev) => prev,
  })

  const act = useMutation({
    mutationFn: ({ id, verb }: { id: string; verb: 'keep' | 'reject' }) => api.post(`/matches/${id}/${verb}`),
    onSuccess: (_, { verb }) => {
      message.success(verb === 'keep' ? 'Kept: its price counts again' : 'Match removed')
      for (const key of ['match-health', 'match-health-count', 'products', 'summary']) {
        queryClient.invalidateQueries({ queryKey: [key] })
      }
    },
    onError: (e) => message.error(errorMessage(e)),
  })

  const card = (m: MatchHealthItem) => {
    const busy = act.isPending && act.variables?.id === m.match_id
    return (
      <Card key={m.match_id} style={{ borderRadius: 14, border: '1px solid #e2e8f0' }}
        title={
          <Space size={8}>
            <span style={{ fontWeight: 700 }}>{m.product_name}</span>
            {m.product_size && <Tag color="cyan">{m.product_size}</Tag>}
          </Space>
        }
        extra={<Tag color="magenta" icon={<ShopOutlined />}>{m.competitor}</Tag>}
      >
        <div className="match-row" style={{ alignItems: 'stretch' }}>
          <div className="ours" style={{ background: '#F8FAFC', padding: 16, borderRadius: 12, minWidth: 150,
            maxWidth: 180, textAlign: 'center', border: '1px solid #E2E8F0' }}>
            <Tag color="blue" style={{ marginBottom: 8, fontWeight: 600 }}>SRIBEES</Tag>
            <Photo src={m.product_image} alt={m.product_name} />
            <div style={{ marginTop: 10, fontSize: 11, color: '#64748B' }}>Selling Price</div>
            <div className="num" style={{ fontWeight: 700 }}>
              {m.our_price ? `Rs ${formatMoney(m.our_price)}` : '—'}
            </div>
          </div>
          <div className="candidate" style={{ flex: 1, padding: '14px 18px', borderRadius: 12,
            border: '1px solid #E2E8F0', gap: 16, alignItems: 'center' }}>
            <Photo src={m.item.image_url} alt={m.item.name} />
            <div style={{ flex: 1 }}>
              <Tag color={m.status === 'changed' ? 'orange' : 'default'}>{m.note}</Tag>
              {m.seen_name && m.seen_name !== m.item.name && (
                <div style={{ fontSize: 12, color: '#64748B', marginTop: 6 }}>
                  Was: <span style={{ textDecoration: 'line-through' }}>{m.seen_name}</span>
                </div>
              )}
              <div style={{ fontWeight: 600, marginTop: 4 }}>
                {m.status === 'changed' ? 'Now: ' : ''}{m.item.name}{' '}
                {m.item.url && (
                  <a href={m.item.url} target="_blank" rel="noreferrer noopener"><LinkOutlined /></a>
                )}
              </div>
              <div style={{ fontSize: 12, color: '#64748B', marginTop: 4 }}>
                <strong className="num" style={{ color: '#0F172A' }}>
                  Rs {m.item.last_price ? formatMoney(m.item.last_price) : '—'}
                </strong>
                {' · '}last seen {formatTime(m.item.last_seen_at, 'YYYY-MM-DD')}
                {' · '}flagged {ago(m.since)}
                {m.was && <> · was {m.was === 'auto' ? 'matched automatically' : 'confirmed'}</>}
              </div>
            </div>
            {decide && (
              <Space size={8}>
                {m.status === 'changed' && (
                  <Button type="primary" icon={<CheckOutlined />} loading={busy && act.variables?.verb === 'keep'}
                    style={{ background: '#059669', borderColor: '#059669' }}
                    onClick={() => act.mutate({ id: m.match_id, verb: 'keep' })}>
                    Still the same
                  </Button>
                )}
                <Popconfirm
                  title="Remove this match?"
                  description="Its price stops being compared. A replacement may be proposed in the match queue."
                  okText="Remove" cancelText="Cancel"
                  onConfirm={() => act.mutate({ id: m.match_id, verb: 'reject' })}
                >
                  <Button danger icon={<CloseOutlined />} loading={busy && act.variables?.verb === 'reject'}>
                    {m.status === 'changed' ? 'Not the same' : 'Remove'}
                  </Button>
                </Popconfirm>
              </Space>
            )}
          </div>
        </div>
      </Card>
    )
  }

  const tabLabel = (k: Kind, text: string) => (
    <span>{text} {counts.data?.[k] ? <Tag style={{ marginLeft: 4 }}>{counts.data[k]}</Tag> : null}</span>
  )

  return (
    <>
      <PageHeader
        title="Match Health"
        subtitle="Matched items the shop changed or stopped listing. Their prices are left out of every comparison until someone decides."
      />
      <Tabs
        activeKey={kind}
        onChange={(k) => { setKind(k as Kind); setPage(1) }}
        items={[
          { key: 'changed', label: tabLabel('changed', 'Changed by the shop') },
          { key: 'gone', label: tabLabel('gone', 'No longer listed') },
        ]}
      />
      {kind === 'gone' && (
        <Typography.Paragraph type="secondary" style={{ marginTop: -4 }}>
          These come back by themselves if the shop lists them again.
        </Typography.Paragraph>
      )}
      {!list.isLoading && (list.data?.items.length ?? 0) === 0 && (
        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE}
          description={kind === 'changed' ? 'No shop has changed a matched item' : 'Every matched item is still listed'} />
      )}
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        {list.data?.items.map(card)}
      </Space>
      {(list.data?.total ?? 0) > 20 && (
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: 24 }}>
          <Pagination current={page} pageSize={20} total={list.data?.total} onChange={setPage}
            showSizeChanger={false} />
        </div>
      )}
    </>
  )
}
