import {
  CheckCircleOutlined,
  CompassOutlined,
  ExportOutlined,
  InboxOutlined,
  SearchOutlined,
  SyncOutlined,
} from '@ant-design/icons'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  App,
  Button,
  Card,
  Checkbox,
  Col,
  Image,
  Input,
  Row,
  Select,
  Space,
  Table,
  Tag,
  Tooltip,
  Typography,
} from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { api, errorMessage } from '../api/client'
import { useCompetitors } from '../api/lookups'
import { formatMoney } from '../api/money'
import { ago, formatTime } from '../api/time'
import type {
  AssortmentItem,
  AssortmentPage,
  AssortmentStats,
  CrawlStatus,
} from '../api/types'
import { useAuth } from '../auth/AuthContext'
import PageHeader from '../components/PageHeader'

function ProductThumb({ src }: { src: string | null | undefined }) {
  if (!src) {
    return (
      <div
        style={{
          width: 44,
          height: 44,
          minWidth: 44,
          borderRadius: 8,
          background: '#F1F5F9',
          border: '1px solid #E2E8F0',
          display: 'grid',
          placeItems: 'center',
          color: '#94A3B8',
          fontSize: 10,
          userSelect: 'none',
        }}
      >
        No img
      </div>
    )
  }
  return (
    <div
      onClick={(e) => e.stopPropagation()}
      style={{
        width: 44,
        height: 44,
        minWidth: 44,
        borderRadius: 8,
        overflow: 'hidden',
        background: '#FFFFFF',
        border: '1px solid #E2E8F0',
        display: 'grid',
        placeItems: 'center',
      }}
    >
      <Image
        src={src}
        alt=""
        width={40}
        height={40}
        style={{ objectFit: 'contain' }}
        preview={{ mask: null }}
      />
    </div>
  )
}

export default function ProductDiscovery() {
  const { can } = useAuth()
  const { message } = App.useApp()
  const queryClient = useQueryClient()
  const [params, setParams] = useSearchParams()

  const competitorsQuery = useCompetitors()
  const competitors = competitorsQuery.data || []

  // URL search state
  const competitorIdParam = params.get('competitor')
  const competitorId = competitorIdParam ? Number(competitorIdParam) : undefined
  const inStockOnly = params.get('in_stock') === 'true'
  const sort = params.get('sort') || 'newest'
  const page = Math.max(1, Number(params.get('page') || 1))
  const limit = Math.max(1, Number(params.get('limit') || 20))

  const [searchTerm, setSearchTerm] = useState(params.get('q') || '')
  const [debouncedQ, setDebouncedQ] = useState(searchTerm)

  useEffect(() => {
    const handle = setTimeout(() => {
      setDebouncedQ(searchTerm.trim())
    }, 250)
    return () => clearTimeout(handle)
  }, [searchTerm])

  useEffect(() => {
    const next = new URLSearchParams(params)
    if (debouncedQ) {
      next.set('q', debouncedQ)
    } else {
      next.delete('q')
    }
    if (next.get('q') !== params.get('q')) {
      next.set('page', '1')
      setParams(next, { replace: true })
    }
  }, [debouncedQ])

  const setFilter = (key: string, val: string | null) => {
    const next = new URLSearchParams(params)
    if (val === null || val === undefined || val === '') {
      next.delete(key)
    } else {
      next.set(key, val)
    }
    next.set('page', '1')
    setParams(next)
  }

  // Active crawl poll
  const crawlStatus = useQuery({
    queryKey: ['discovery-crawl-status'],
    queryFn: async () => (await api.get<CrawlStatus>('/assortment/crawl/status')).data,
    refetchInterval: (q) => (q.state.data?.is_running ? 4000 : 15000),
  })

  // Aggregated stats
  const statsQuery = useQuery({
    queryKey: ['assortment-stats', competitorId],
    queryFn: async () =>
      (
        await api.get<AssortmentStats>('/assortment/stats', {
          params: { competitor_id: competitorId },
        })
      ).data,
  })

  // Assortment Gaps Query
  const gapsQuery = useQuery({
    queryKey: ['assortment-gaps', competitorId, debouncedQ, inStockOnly, sort, page, limit],
    queryFn: async () =>
      (
        await api.get<AssortmentPage>('/assortment/gaps', {
          params: {
            competitor_id: competitorId,
            q: debouncedQ || undefined,
            in_stock_only: inStockOnly,
            sort,
            page,
            limit,
          },
        })
      ).data,
  })

  // Manual Trigger Crawl
  const crawlMutation = useMutation({
    mutationFn: (targetId: number) => api.post(`/assortment/crawl/${targetId}`),
    onSuccess: () => {
      message.success('Discovery crawl started in the background.')
      queryClient.invalidateQueries({ queryKey: ['discovery-crawl-status'] })
    },
    onError: (err) => message.error(errorMessage(err)),
  })

  const cargillsComp = competitors.find((c) => c.code === 'cargills')
  const defaultCrawlTarget = competitorId || cargillsComp?.competitor_id || competitors[0]?.competitor_id

  const columns: ColumnsType<AssortmentItem> = [
    {
      title: 'Product',
      dataIndex: 'name',
      key: 'name',
      render: (_, item) => (
        <Space orientation="horizontal" size={12} align="center">
          <ProductThumb src={item.image_url} />
          <div>
            <Typography.Text strong style={{ fontSize: 13, display: 'block' }}>
              {item.name}
            </Typography.Text>
            <Space size={6} wrap style={{ marginTop: 2 }}>
              {item.brand && (
                <Tag color="blue" style={{ fontSize: 11, margin: 0 }}>
                  {item.brand}
                </Tag>
              )}
              {item.barcode && (
                <Typography.Text type="secondary" style={{ fontSize: 11 }}>
                  Barcode: {item.barcode}
                </Typography.Text>
              )}
            </Space>
          </div>
        </Space>
      ),
    },
    {
      title: 'Competitor',
      dataIndex: 'competitor_name',
      key: 'competitor_name',
      width: 140,
      render: (name) => <Tag color="geekblue">{name}</Tag>,
    },
    {
      title: 'Pack Size',
      key: 'pack',
      width: 110,
      render: (_, item) =>
        item.size_value ? (
          <Typography.Text style={{ fontSize: 13 }}>
            {item.size_value} {item.size_unit || ''}
          </Typography.Text>
        ) : (
          <Typography.Text type="secondary">—</Typography.Text>
        ),
    },
    {
      title: 'Competitor Price',
      key: 'price',
      width: 150,
      render: (_, item) => (
        <div>
          <Typography.Text strong style={{ fontSize: 14 }}>
            {formatMoney(item.last_price)}
          </Typography.Text>
          {item.last_mrp && Number(item.last_mrp) > Number(item.last_price) && (
            <div style={{ fontSize: 11, color: '#94A3B8' }}>
              MRP: <del>{formatMoney(item.last_mrp)}</del>
            </div>
          )}
        </div>
      ),
    },
    {
      title: 'Stock Status',
      key: 'stock',
      width: 120,
      render: (_, item) =>
        item.in_stock ? (
          <Tag color="success">In Stock</Tag>
        ) : (
          <Tag color="default">Out of Stock</Tag>
        ),
    },
    {
      title: 'First Seen',
      key: 'first_seen',
      width: 130,
      render: (_, item) => (
        <Tooltip title={formatTime(item.first_seen_at)}>
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            {ago(item.first_seen_at)}
          </Typography.Text>
        </Tooltip>
      ),
    },
    {
      title: '',
      key: 'actions',
      width: 70,
      render: (_, item) =>
        item.url ? (
          <Tooltip title="View on competitor store">
            <Button
              type="text"
              size="small"
              icon={<ExportOutlined />}
              href={item.url}
              target="_blank"
              rel="noopener noreferrer"
            />
          </Tooltip>
        ) : null,
    },
  ]

  const stats = statsQuery.data
  const isCrawlRunning = crawlStatus.data?.is_running

  return (
    <>
      <PageHeader
        title="Product Discovery & Assortment Gaps"
        subtitle="Catalog products found at competitors that Sribees does not stock or match yet"
        extra={
          can('scrape.run') && defaultCrawlTarget ? (
            <Space>
              {isCrawlRunning && (
                <Tag icon={<SyncOutlined spin />} color="processing">
                  {crawlStatus.data?.message || 'Crawling in progress...'}
                </Tag>
              )}
              <Button
                type="primary"
                icon={<SyncOutlined spin={isCrawlRunning} />}
                loading={crawlMutation.isPending || isCrawlRunning}
                onClick={() => crawlMutation.mutate(defaultCrawlTarget)}
                style={{ background: '#E11D48', borderColor: '#E11D48' }}
              >
                {isCrawlRunning ? 'Scraping...' : 'Run Discovery Crawl'}
              </Button>
            </Space>
          ) : undefined
        }
      />

      {/* Metric Cards */}
      <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
        <Col xs={24} sm={8}>
          <Card bordered={false} style={{ borderRadius: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
            <Space size={14} align="center">
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 10,
                  background: '#FEE2E2',
                  display: 'grid',
                  placeItems: 'center',
                  color: '#EF4444',
                  fontSize: 20,
                }}
              >
                <InboxOutlined />
              </div>
              <div>
                <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                  Total Missing Products
                </Typography.Text>
                <Typography.Title level={3} style={{ margin: 0, fontWeight: 700 }}>
                  {stats?.total_gaps?.toLocaleString() ?? '—'}
                </Typography.Title>
              </div>
            </Space>
          </Card>
        </Col>

        <Col xs={24} sm={8}>
          <Card bordered={false} style={{ borderRadius: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
            <Space size={14} align="center">
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 10,
                  background: '#DCFCE7',
                  display: 'grid',
                  placeItems: 'center',
                  color: '#22C55E',
                  fontSize: 20,
                }}
              >
                <CheckCircleOutlined />
              </div>
              <div>
                <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                  Currently In-Stock
                </Typography.Text>
                <Typography.Title level={3} style={{ margin: 0, fontWeight: 700, color: '#16A34A' }}>
                  {stats?.in_stock_gaps?.toLocaleString() ?? '—'}
                </Typography.Title>
              </div>
            </Space>
          </Card>
        </Col>

        <Col xs={24} sm={8}>
          <Card bordered={false} style={{ borderRadius: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
            <Space size={14} align="center">
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 10,
                  background: '#EFF6FF',
                  display: 'grid',
                  placeItems: 'center',
                  color: '#3B82F6',
                  fontSize: 20,
                }}
              >
                <CompassOutlined />
              </div>
              <div>
                <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                  Discovered This Week
                </Typography.Text>
                <Typography.Title level={3} style={{ margin: 0, fontWeight: 700, color: '#2563EB' }}>
                  {stats?.new_this_week?.toLocaleString() ?? '—'}
                </Typography.Title>
              </div>
            </Space>
          </Card>
        </Col>
      </Row>

      {/* Filter and Search Bar */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 12,
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 16,
          background: '#ffffff',
          padding: '12px 16px',
          borderRadius: 12,
          border: '1px solid #E2E8F0',
        }}
      >
        <Space wrap size={12} style={{ flex: 1 }}>
          <Input
            prefix={<SearchOutlined style={{ color: '#94A3B8' }} />}
            placeholder="Search by product name, brand or barcode..."
            allowClear
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ width: 320, borderRadius: 8 }}
          />

          <Select
            placeholder="All competitors"
            allowClear
            value={competitorId}
            onChange={(val) => setFilter('competitor', val ? String(val) : null)}
            style={{ width: 180 }}
            options={competitors.map((c) => ({
              label: c.name,
              value: c.competitor_id,
            }))}
          />

          <Select
            value={sort}
            onChange={(val) => setFilter('sort', val)}
            style={{ width: 180 }}
            options={[
              { label: 'Newest first', value: 'newest' },
              { label: 'Oldest first', value: 'oldest' },
              { label: 'Price: Low to High', value: 'price_asc' },
              { label: 'Price: High to Low', value: 'price_desc' },
              { label: 'Name (A-Z)', value: 'name' },
            ]}
          />

          <Checkbox
            checked={inStockOnly}
            onChange={(e) => setFilter('in_stock', e.target.checked ? 'true' : null)}
          >
            In-stock only
          </Checkbox>
        </Space>

        <Space size={8}>
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            Show:
          </Typography.Text>
          <Select
            value={limit}
            onChange={(val) => {
              const next = new URLSearchParams(params)
              next.set('limit', String(val))
              next.set('page', '1')
              setParams(next)
            }}
            options={[
              { label: '10 / page', value: 10 },
              { label: '20 / page', value: 20 },
              { label: '50 / page', value: 50 },
              { label: '100 / page', value: 100 },
            ]}
            style={{ width: 115 }}
          />
        </Space>
      </div>

      {/* Main Table */}
      <Table<AssortmentItem>
        rowKey="item_id"
        columns={columns}
        dataSource={gapsQuery.data?.items}
        loading={gapsQuery.isLoading}
        pagination={{
          current: page,
          pageSize: limit,
          total: gapsQuery.data?.total || 0,
          showTotal: (tot) => `${tot.toLocaleString()} missing items`,
          onChange: (p) => {
            const next = new URLSearchParams(params)
            next.set('page', String(p))
            setParams(next)
          },
        }}
        style={{
          background: '#ffffff',
          borderRadius: 12,
          overflow: 'hidden',
          border: '1px solid #E2E8F0',
        }}
      />
    </>
  )
}
