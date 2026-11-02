import {
  ArrowDownOutlined,
  ArrowUpOutlined,
  CheckCircleOutlined,
  DollarOutlined,
  EyeOutlined,
  InboxOutlined,
  LinkOutlined,
  QuestionCircleOutlined,
  WarningOutlined,
} from '@ant-design/icons'
import { useQuery } from '@tanstack/react-query'
import { Alert, Card, Col, Progress, Row, Skeleton, Space, Tag, Typography } from 'antd'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api/client'
import type { Summary } from '../api/types'
import { useAuth } from '../auth/AuthContext'
import BranchPicker from '../components/BranchPicker'
import PageHeader from '../components/PageHeader'

export default function Overview() {
  const { can } = useAuth()
  const navigate = useNavigate()
  const [branchId, setBranchId] = useState<string>()

  const summary = useQuery({
    queryKey: ['summary', branchId],
    queryFn: async () => (await api.get<Summary>('/reports/summary', { params: { branch_id: branchId } })).data,
    enabled: !!branchId,
  })

  const s = summary.data
  const isLoading = summary.isLoading

  // Competitiveness calculations
  const totalTracked = s?.tracked || 0
  const cheaper = s?.cheaper || 0
  const equal = s?.equal || 0
  const dearer = s?.dearer || 0
  const competitiveCount = cheaper + equal
  const competitivePct = totalTracked > 0 ? Math.round((competitiveCount / totalTracked) * 100) : 0

  return (
    <>
      <PageHeader
        title="Market Overview"
        subtitle="Real-time price intelligence and competitive standing across your supermarket branches"
        extra={<BranchPicker value={branchId} onChange={setBranchId} />}
      />

      {!!s?.sources_down.length && (
        <Alert
          style={{ marginBottom: 24, borderRadius: 12 }}
          type="warning"
          showIcon
          icon={<WarningOutlined />}
          message={
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
              <span>
                <strong>Sources not reading:</strong> {s.sources_down.join(', ')}
              </span>
              {can('competitors.read') && (
                <Tag
                  color="warning"
                  style={{ cursor: 'pointer', margin: 0 }}
                  onClick={() => navigate('/sources')}
                >
                  View scraper status →
                </Tag>
              )}
            </div>
          }
          description="Their prices may be older than usual. Check scraper logs in Sources for details."
        />
      )}

      {/* Competitiveness Hero Banner */}
      <Card
        style={{
          marginBottom: 24,
          background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
          borderRadius: 16,
          border: '1px solid #e2e8f0',
        }}
        styles={{ body: { padding: '24px 28px' } }}
      >
        <Row gutter={[24, 24]} align="middle">
          <Col xs={24} md={14}>
            <Space direction="vertical" size={6} style={{ width: '100%' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <CheckCircleOutlined style={{ color: '#059669', fontSize: 18 }} />
                <Typography.Text strong style={{ fontSize: 16, color: '#0f172a' }}>
                  Price Competitiveness Index
                </Typography.Text>
              </div>
              <Typography.Text type="secondary" style={{ fontSize: 13 }}>
                {competitivePct}% of tracked products are priced lower than or equal to local competitors.
              </Typography.Text>
              <div style={{ marginTop: 12 }}>
                <Progress
                  percent={competitivePct}
                  strokeColor={{
                    '0%': '#10B981',
                    '100%': '#059669',
                  }}
                  trailColor="#F1F5F9"
                  strokeWidth={12}
                  format={(p) => <span style={{ fontWeight: 700, color: '#059669' }}>{p}%</span>}
                />
              </div>
            </Space>
          </Col>
          <Col xs={24} md={10}>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: 12,
                textAlign: 'center',
                background: '#f8fafc',
                padding: '14px 16px',
                borderRadius: 12,
                border: '1px solid #e2e8f0',
              }}
            >
              <div>
                <div style={{ fontSize: 11, color: '#059669', fontWeight: 600, textTransform: 'uppercase' }}>Cheaper</div>
                <div style={{ fontSize: 20, fontWeight: 700, color: '#059669' }} className="num">{cheaper}</div>
              </div>
              <div style={{ borderLeft: '1px solid #e2e8f0', borderRight: '1px solid #e2e8f0' }}>
                <div style={{ fontSize: 11, color: '#2563EB', fontWeight: 600, textTransform: 'uppercase' }}>Equal</div>
                <div style={{ fontSize: 20, fontWeight: 700, color: '#2563EB' }} className="num">{equal}</div>
              </div>
              <div>
                <div style={{ fontSize: 11, color: '#DC2626', fontWeight: 600, textTransform: 'uppercase' }}>Dearer</div>
                <div style={{ fontSize: 20, fontWeight: 700, color: '#DC2626' }} className="num">{dearer}</div>
              </div>
            </div>
          </Col>
        </Row>
      </Card>

      {/* Main KPI Grid */}
      <Typography.Title level={5} style={{ marginBottom: 16, color: '#334155' }}>
        Market Standing & Price Positions
      </Typography.Title>
      <Row gutter={[16, 16]}>
        <Col xs={12} lg={6}>
          <Card
            hoverable
            onClick={() => navigate('/products?position=dearer')}
            style={{ borderRadius: 14, cursor: 'pointer' }}
            styles={{ body: { padding: '20px' } }}
          >
            {isLoading ? <Skeleton active paragraph={{ rows: 1 }} /> : (
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                <div>
                  <Typography.Text type="secondary" style={{ fontSize: 12, fontWeight: 500 }}>
                    We are dearer (Higher)
                  </Typography.Text>
                  <div style={{ fontSize: 26, fontWeight: 700, color: '#DC2626', marginTop: 4 }} className="num">
                    {s?.dearer ?? '—'}
                  </div>
                  <Typography.Text style={{ fontSize: 11, color: '#DC2626' }}>
                    Requires price reduction
                  </Typography.Text>
                </div>
                <div style={{ width: 40, height: 40, borderRadius: 10, background: '#FEE2E2', display: 'grid', placeItems: 'center', color: '#DC2626' }}>
                  <ArrowUpOutlined style={{ fontSize: 18 }} />
                </div>
              </div>
            )}
          </Card>
        </Col>

        <Col xs={12} lg={6}>
          <Card
            hoverable
            onClick={() => navigate('/products?position=cheaper')}
            style={{ borderRadius: 14, cursor: 'pointer' }}
            styles={{ body: { padding: '20px' } }}
          >
            {isLoading ? <Skeleton active paragraph={{ rows: 1 }} /> : (
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                <div>
                  <Typography.Text type="secondary" style={{ fontSize: 12, fontWeight: 500 }}>
                    We are cheaper (Lowest)
                  </Typography.Text>
                  <div style={{ fontSize: 26, fontWeight: 700, color: '#059669', marginTop: 4 }} className="num">
                    {s?.cheaper ?? '—'}
                  </div>
                  <Typography.Text style={{ fontSize: 11, color: '#059669' }}>
                    Winning price positions
                  </Typography.Text>
                </div>
                <div style={{ width: 40, height: 40, borderRadius: 10, background: '#D1FAE5', display: 'grid', placeItems: 'center', color: '#059669' }}>
                  <ArrowDownOutlined style={{ fontSize: 18 }} />
                </div>
              </div>
            )}
          </Card>
        </Col>

        <Col xs={12} lg={6}>
          <Card
            hoverable
            onClick={() => navigate('/products?position=equal')}
            style={{ borderRadius: 14, cursor: 'pointer' }}
            styles={{ body: { padding: '20px' } }}
          >
            {isLoading ? <Skeleton active paragraph={{ rows: 1 }} /> : (
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                <div>
                  <Typography.Text type="secondary" style={{ fontSize: 12, fontWeight: 500 }}>
                    Matched Price (Same)
                  </Typography.Text>
                  <div style={{ fontSize: 26, fontWeight: 700, color: '#2563EB', marginTop: 4 }} className="num">
                    {s?.equal ?? '—'}
                  </div>
                  <Typography.Text style={{ fontSize: 11, color: '#2563EB' }}>
                    Equal to competitor lowest
                  </Typography.Text>
                </div>
                <div style={{ width: 40, height: 40, borderRadius: 10, background: '#DBEAFE', display: 'grid', placeItems: 'center', color: '#2563EB' }}>
                  <CheckCircleOutlined style={{ fontSize: 18 }} />
                </div>
              </div>
            )}
          </Card>
        </Col>

        <Col xs={12} lg={6}>
          <Card
            hoverable
            onClick={() => navigate('/products?position=unknown')}
            style={{ borderRadius: 14, cursor: 'pointer' }}
            styles={{ body: { padding: '20px' } }}
          >
            {isLoading ? <Skeleton active paragraph={{ rows: 1 }} /> : (
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                <div>
                  <Typography.Text type="secondary" style={{ fontSize: 12, fontWeight: 500 }}>
                    No Competitor Data
                  </Typography.Text>
                  <div style={{ fontSize: 26, fontWeight: 700, color: '#64748B', marginTop: 4 }} className="num">
                    {s?.unknown ?? '—'}
                  </div>
                  <Typography.Text style={{ fontSize: 11, color: '#64748B' }}>
                    Untracked / no match
                  </Typography.Text>
                </div>
                <div style={{ width: 40, height: 40, borderRadius: 10, background: '#F1F5F9', display: 'grid', placeItems: 'center', color: '#64748B' }}>
                  <QuestionCircleOutlined style={{ fontSize: 18 }} />
                </div>
              </div>
            )}
          </Card>
        </Col>
      </Row>

      {/* Actionable Pipeline */}
      <Typography.Title level={5} style={{ marginTop: 28, marginBottom: 16, color: '#334155' }}>
        Action Pipeline & Catalog Hygiene
      </Typography.Title>
      <Row gutter={[16, 16]}>
        {can('suggestions.read') && (
          <Col xs={12} lg={6}>
            <Card
              hoverable
              onClick={() => navigate('/suggestions')}
              style={{
                borderRadius: 14,
                cursor: 'pointer',
                borderColor: (s?.pending_suggestions ?? 0) > 0 ? '#FCA5A5' : undefined,
                background: (s?.pending_suggestions ?? 0) > 0 ? '#FFF5F5' : '#ffffff',
              }}
              styles={{ body: { padding: '20px' } }}
            >
              {isLoading ? <Skeleton active paragraph={{ rows: 1 }} /> : (
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                  <div>
                    <Typography.Text type="secondary" style={{ fontSize: 12, fontWeight: 500 }}>
                      Suggestions Waiting
                    </Typography.Text>
                    <div style={{ fontSize: 26, fontWeight: 700, color: (s?.pending_suggestions ?? 0) > 0 ? '#E11D48' : '#0F172A', marginTop: 4 }} className="num">
                      {s?.pending_suggestions ?? 0}
                    </div>
                    <Typography.Text style={{ fontSize: 11, color: (s?.pending_suggestions ?? 0) > 0 ? '#E11D48' : '#64748B' }}>
                      {(s?.pending_suggestions ?? 0) > 0 ? 'Pending your review →' : 'All up to date'}
                    </Typography.Text>
                  </div>
                  <div style={{ width: 40, height: 40, borderRadius: 10, background: '#FFE4E6', display: 'grid', placeItems: 'center', color: '#E11D48' }}>
                    <InboxOutlined style={{ fontSize: 18 }} />
                  </div>
                </div>
              )}
            </Card>
          </Col>
        )}

        <Col xs={12} lg={6}>
          <Card
            hoverable
            onClick={() => navigate('/products?cost_missing=1')}
            style={{ borderRadius: 14, cursor: 'pointer' }}
            styles={{ body: { padding: '20px' } }}
          >
            {isLoading ? <Skeleton active paragraph={{ rows: 1 }} /> : (
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                <div>
                  <Typography.Text type="secondary" style={{ fontSize: 12, fontWeight: 500 }}>
                    Cost Price Missing
                  </Typography.Text>
                  <div style={{ fontSize: 26, fontWeight: 700, color: (s?.cost_missing ?? 0) > 0 ? '#D97706' : '#0F172A', marginTop: 4 }} className="num">
                    {s?.cost_missing ?? 0}
                  </div>
                  <Typography.Text style={{ fontSize: 11, color: (s?.cost_missing ?? 0) > 0 ? '#D97706' : '#64748B' }}>
                    Blocks margin calculation
                  </Typography.Text>
                </div>
                <div style={{ width: 40, height: 40, borderRadius: 10, background: '#FEF3C7', display: 'grid', placeItems: 'center', color: '#D97706' }}>
                  <DollarOutlined style={{ fontSize: 18 }} />
                </div>
              </div>
            )}
          </Card>
        </Col>

        {can('matches.read') && (
          <Col xs={12} lg={6}>
            <Card
              hoverable
              onClick={() => navigate('/matches')}
              style={{ borderRadius: 14, cursor: 'pointer' }}
              styles={{ body: { padding: '20px' } }}
            >
              {isLoading ? <Skeleton active paragraph={{ rows: 1 }} /> : (
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                  <div>
                    <Typography.Text type="secondary" style={{ fontSize: 12, fontWeight: 500 }}>
                      Match Queue
                    </Typography.Text>
                    <div style={{ fontSize: 26, fontWeight: 700, color: '#4F46E5', marginTop: 4 }} className="num">
                      {s?.match_queue ?? 0}
                    </div>
                    <Typography.Text style={{ fontSize: 11, color: '#4F46E5' }}>
                      Competitor candidates
                    </Typography.Text>
                  </div>
                  <div style={{ width: 40, height: 40, borderRadius: 10, background: '#EEF2FF', display: 'grid', placeItems: 'center', color: '#4F46E5' }}>
                    <LinkOutlined style={{ fontSize: 18 }} />
                  </div>
                </div>
              )}
            </Card>
          </Col>
        )}

        <Col xs={12} lg={6}>
          <Card
            hoverable
            onClick={() => navigate('/products')}
            style={{ borderRadius: 14, cursor: 'pointer' }}
            styles={{ body: { padding: '20px' } }}
          >
            {isLoading ? <Skeleton active paragraph={{ rows: 1 }} /> : (
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                <div>
                  <Typography.Text type="secondary" style={{ fontSize: 12, fontWeight: 500 }}>
                    Active Tracked Items
                  </Typography.Text>
                  <div style={{ fontSize: 26, fontWeight: 700, color: '#0F172A', marginTop: 4 }} className="num">
                    {s?.tracked ?? 0}
                  </div>
                  <Typography.Text style={{ fontSize: 11, color: '#64748B' }}>
                    From {s?.products ?? 0} store catalog items
                  </Typography.Text>
                </div>
                <div style={{ width: 40, height: 40, borderRadius: 10, background: '#F1F5F9', display: 'grid', placeItems: 'center', color: '#0F172A' }}>
                  <EyeOutlined style={{ fontSize: 18 }} />
                </div>
              </div>
            )}
          </Card>
        </Col>
      </Row>
    </>
  )
}
