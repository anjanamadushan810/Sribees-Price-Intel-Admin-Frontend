import {
  CheckOutlined,
  CloseOutlined,
  LinkOutlined,
  ShopOutlined,
  WarningOutlined,
} from '@ant-design/icons'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  App,
  Button,
  Card,
  Empty,
  Image,
  Pagination,
  Popconfirm,
  Progress,
  Select,
  Space,
  Tag,
  Tooltip,
  Typography,
} from 'antd'
import { useState } from 'react'
import { api, errorMessage } from '../api/client'
import { useCompetitors } from '../api/lookups'
import { formatMoney, toCents } from '../api/money'
import type { MatchQueueItem, MatchQueuePage } from '../api/types'
import { useAuth } from '../auth/AuthContext'
import PageHeader from '../components/PageHeader'

/** Beyond half or double our price, ask once more before matching */
function priceFarOff(m: MatchQueueItem): boolean {
  if (!m.item.last_price || !m.our_price) return false
  const ratio = toCents(m.item.last_price) / toCents(m.our_price)
  return ratio > 2 || ratio < 0.5
}

function Photo({ src, alt }: { src: string | null | undefined; alt?: string }) {
  if (!src) {
    return (
      <div className="photo photo-none">
        No image
      </div>
    )
  }
  return (
    <Image
      src={src}
      alt={alt || 'Product'}
      width={76}
      height={76}
      className="photo"
      referrerPolicy="no-referrer"
      style={{ objectFit: 'contain', padding: 4 }}
      fallback={PHOTO_FALLBACK}
    />
  )
}

const PHOTO_FALLBACK =
  'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="76" height="76"><rect width="76" height="76" fill="%23f1f5f9"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="%2394a3b8" font-size="10">No image</text></svg>'

export default function MatchQueue() {
  const { can } = useAuth()
  const { message } = App.useApp()
  const queryClient = useQueryClient()
  const competitors = useCompetitors()
  const [competitorId, setCompetitorId] = useState<number>()
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const decide = can('matches.decide')

  const queue = useQuery({
    queryKey: ['match-queue', competitorId, page, pageSize],
    queryFn: async () =>
      (await api.get<MatchQueuePage>('/matches/queue', {
        params: { competitor_id: competitorId, page, limit: pageSize },
      })).data,
    placeholderData: (prev) => prev,
  })

  const act = useMutation({
    mutationFn: ({ id, verb }: { id: string; verb: 'confirm' | 'reject' }) =>
      api.post(`/matches/${id}/${verb}`),
    onSuccess: () => {
      message.success('Match decision saved')
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
      <PageHeader
        title="Product Match Queue"
        subtitle={
          queue.data
            ? `${queue.data.total} candidate pairs awaiting verification. Confirming links them for automated daily price tracking.`
            : 'Loading candidate queue...'
        }
        extra={
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <Select
              allowClear
              placeholder="Filter by Competitor Shop"
              style={{ width: 220 }}
              value={competitorId}
              onChange={(v) => {
                setCompetitorId(v)
                setPage(1)
              }}
              options={(competitors.data ?? [])
                .filter((c) => c.kind === 'scraped')
                .map((c) => ({ value: c.competitor_id, label: c.name }))}
            />
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 13, color: '#64748B' }}>Show:</span>
              <Select
                value={pageSize}
                style={{ width: 115 }}
                onChange={(v) => {
                  setPageSize(v)
                  setPage(1)
                }}
                options={[
                  { value: 10, label: '10 / page' },
                  { value: 20, label: '20 / page' },
                  { value: 50, label: '50 / page' },
                  { value: 100, label: '100 / page' },
                ]}
              />
            </div>
          </div>
        }
      />

      {!queue.isLoading && groups.size === 0 && (
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description={
            <div style={{ padding: '24px 0' }}>
              <Typography.Text strong style={{ fontSize: 16, color: '#334155' }}>
                All matches verified!
              </Typography.Text>
              <div style={{ color: '#64748B', fontSize: 13, marginTop: 4 }}>
                No candidate items currently waiting in the verification queue.
              </div>
            </div>
          }
        />
      )}

      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        {[...groups.values()].map((candidates) => {
          const first = candidates[0]
          return (
            <Card
              key={`${first.product_id}:${first.competitor_id}`}
              style={{
                borderRadius: 14,
                border: '1px solid #e2e8f0',
                overflow: 'hidden',
              }}
              title={
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0' }}>
                  <span style={{ fontWeight: 700, fontSize: 14.5, color: '#0F172A' }}>
                    {first.product_name}
                  </span>
                  {first.product_size && (
                    <Tag color="cyan" style={{ borderRadius: 6 }}>
                      {first.product_size}
                    </Tag>
                  )}
                </div>
              }
              extra={
                <Tag color="magenta" style={{ fontWeight: 600, borderRadius: 6, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  <ShopOutlined /> {first.competitor}
                </Tag>
              }
            >
              <div className="match-row" style={{ alignItems: 'stretch' }}>
                {/* Sribees Catalog Item */}
                <div
                  className="ours"
                  style={{
                    background: '#F8FAFC',
                    padding: '16px',
                    borderRadius: 12,
                    minWidth: 150,
                    maxWidth: 180,
                    textAlign: 'center',
                    borderRight: 'none',
                    border: '1px solid #E2E8F0',
                  }}
                >
                  <Tag color="blue" style={{ marginBottom: 8, fontWeight: 600 }}>SRIBEES</Tag>
                  <Photo src={first.product_image} alt={first.product_name} />
                  <div style={{ marginTop: 10 }}>
                    <div style={{ fontSize: 11, color: '#64748B' }}>Selling Price</div>
                    <div className="num" style={{ fontWeight: 700, fontSize: 15, color: '#0F172A' }}>
                      {first.our_price ? `Rs ${formatMoney(first.our_price)}` : '—'}
                    </div>
                  </div>
                </div>

                {/* Competitor Candidates */}
                <Space direction="vertical" size="middle" style={{ width: '100%', flex: 1 }}>
                  {candidates.map((m) => {
                    const scorePct = Math.round(Number(m.score) * 100)
                    const isFar = priceFarOff(m)
                    const isActing = act.isPending && act.variables?.id === m.match_id
                    return (
                      <div
                        key={m.match_id}
                        className="candidate"
                        style={{
                          background: '#ffffff',
                          padding: '14px 18px',
                          borderRadius: 12,
                          border: '1px solid #E2E8F0',
                          alignItems: 'center',
                          gap: 16,
                        }}
                      >
                        <Photo src={m.item.image_url} alt={m.item.name} />

                        <Tooltip title={`Fuzzy match confidence: ${scorePct}%`}>
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                            <Progress
                              type="circle"
                              size={42}
                              percent={scorePct}
                              strokeColor={scorePct > 80 ? '#059669' : scorePct > 60 ? '#D97706' : '#2563EB'}
                              format={(p) => <span style={{ fontSize: 10, fontWeight: 700 }}>{p}%</span>}
                            />
                            <span style={{ fontSize: 9, color: '#94a3b8', marginTop: 2 }}>Match</span>
                          </div>
                        </Tooltip>

                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: 600, fontSize: 14, color: '#0F172A' }}>
                            {m.item.name}{' '}
                            {m.item.url && (
                              <a href={m.item.url} target="_blank" rel="noreferrer noopener" style={{ marginLeft: 4 }}>
                                <LinkOutlined style={{ color: '#2563EB', fontSize: 13 }} />
                              </a>
                            )}
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 4, flexWrap: 'wrap' }}>
                            <strong className="num" style={{ fontSize: 14, color: '#0F172A' }}>
                              Rs {m.item.last_price ? formatMoney(m.item.last_price) : '—'}
                            </strong>
                            {m.item.last_mrp && (
                              <span style={{ fontSize: 12, color: '#64748B' }}>
                                MRP: Rs {formatMoney(m.item.last_mrp)}
                              </span>
                            )}
                            {!m.item.in_stock && (
                              <Tag color="red" style={{ fontSize: 11 }}>Out of stock</Tag>
                            )}
                            {isFar && (
                              <Tag color="warning" icon={<WarningOutlined />}>
                                Large Price Difference
                              </Tag>
                            )}
                          </div>
                        </div>

                        {decide && (
                          <Space size={8}>
                            {isFar ? (
                              <Popconfirm
                                title="Noticeable Price Difference"
                                description={`They sell at Rs ${formatMoney(m.item.last_price)}, our price is Rs ${formatMoney(m.our_price)}. Are you sure this is the same product pack and size?`}
                                okText="Yes, Same Product"
                                cancelText="Cancel"
                                onConfirm={() => act.mutate({ id: m.match_id, verb: 'confirm' })}
                              >
                                <Button
                                  type="primary"
                                  icon={<WarningOutlined />}
                                  loading={isActing && act.variables?.verb === 'confirm'}
                                  style={{ background: '#D97706', borderColor: '#D97706' }}
                                >
                                  Verify Match
                                </Button>
                              </Popconfirm>
                            ) : (
                              <Button
                                type="primary"
                                icon={<CheckOutlined />}
                                loading={isActing && act.variables?.verb === 'confirm'}
                                style={{ background: '#059669', borderColor: '#059669' }}
                                onClick={() => act.mutate({ id: m.match_id, verb: 'confirm' })}
                              >
                                Confirm Match
                              </Button>
                            )}
                            <Button
                              danger
                              icon={<CloseOutlined />}
                              loading={isActing && act.variables?.verb === 'reject'}
                              onClick={() => act.mutate({ id: m.match_id, verb: 'reject' })}
                            >
                              Reject
                            </Button>
                          </Space>
                        )}
                      </div>
                    )
                  })}
                </Space>
              </div>
            </Card>
          )
        })}
      </Space>

      {(queue.data?.total ?? 0) > 0 && (
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: 24 }}>
          <Pagination
            current={page}
            pageSize={pageSize}
            total={queue.data?.total}
            showSizeChanger={true}
            pageSizeOptions={['10', '20', '50', '100']}
            onShowSizeChange={(_, size) => {
              setPageSize(size)
              setPage(1)
            }}
            onChange={setPage}
            showTotal={(total, range) => `${range[0]}-${range[1]} of ${total} candidates`}
          />
        </div>
      )}
    </>
  )
}
