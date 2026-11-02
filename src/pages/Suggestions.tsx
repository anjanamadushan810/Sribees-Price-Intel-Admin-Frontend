import {
  ArrowDownOutlined,
  CheckOutlined,
  CloseOutlined,
  InfoCircleOutlined,
  ShopOutlined,
} from '@ant-design/icons'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  App,
  Button,
  Empty,
  Popconfirm,
  Segmented,
  Select,
  Space,
  Table,
  Tag,
  Tooltip,
  Typography,
} from 'antd'
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
  const [pageSize, setPageSize] = useState(20)
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
      if (s.status === 'applied') {
        message.success(`Applied: ${s.product_name} updated to Rs ${formatMoney(s.suggested_price)} on Sribees Online`)
      } else if (s.status === 'failed') {
        modal.warning({ title: 'Price update failed', content: s.apply_error })
      } else {
        message.info('Suggestion rejected')
      }
      queryClient.invalidateQueries({ queryKey: ['suggestions'] })
      queryClient.invalidateQueries({ queryKey: ['summary'] })
    },
    onError: (e) => message.error(errorMessage(e)),
  })

  return (
    <>
      <PageHeader
        title="Price Suggestions"
        subtitle="Dynamic repricing recommendations to match competitor lowest prices while safeguarding profit margins"
        extra={<BranchPicker value={branchId} onChange={setBranchId} />}
      />

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <Segmented
          style={{ background: '#f1f5f9', padding: 4, borderRadius: 10 }}
          value={status}
          onChange={(v) => setStatus(v as SuggestionStatus)}
          options={TABS.map((t) => ({
            value: t,
            label: (
              <span style={{ padding: '2px 8px', fontWeight: 500 }}>
                {statusLabel(t)}
              </span>
            ),
          }))}
        />
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          {list.data && list.data.length > 0 && (
            <Typography.Text type="secondary" style={{ fontSize: 13 }}>
              Total: <strong>{list.data.length}</strong> {status} suggestions
            </Typography.Text>
          )}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 13, color: '#64748B' }}>Show:</span>
            <Select
              value={pageSize}
              style={{ width: 115 }}
              onChange={(v) => setPageSize(v)}
              options={[
                { value: 10, label: '10 / page' },
                { value: 20, label: '20 / page' },
                { value: 50, label: '50 / page' },
                { value: 100, label: '100 / page' },
              ]}
            />
          </div>
        </div>
      </div>

      <Table<Suggestion>
        rowKey="suggestion_id"
        size="middle"
        loading={list.isLoading}
        dataSource={list.data}
        pagination={{
          pageSize,
          showSizeChanger: true,
          pageSizeOptions: ['10', '20', '50', '100'],
          onShowSizeChange: (_, size) => setPageSize(size),
          showTotal: (total, range) => `${range[0]}-${range[1]} of ${total} suggestions`,
        }}
        scroll={{ x: 920 }}
        locale={{
          emptyText: (
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description={
                <div style={{ padding: '16px 0' }}>
                  <Typography.Text strong style={{ fontSize: 15, color: '#334155' }}>
                    No {status} suggestions found
                  </Typography.Text>
                  <div style={{ color: '#64748B', fontSize: 13, marginTop: 4 }}>
                    {status === 'pending'
                      ? 'Your prices are either already cheaper or equal to competitors, or cost prices need to be set.'
                      : `No suggestions with status "${status}" for this branch.`}
                  </div>
                </div>
              }
            />
          ),
        }}
        columns={[
          {
            title: 'Product',
            render: (_, s) => (
              <div style={{ maxWidth: 300 }}>
                <div style={{ fontWeight: 600, color: '#0F172A', fontSize: 14 }}>
                  {s.product_name}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
                  {s.sku && <Tag style={{ margin: 0, fontSize: 11 }}>SKU: {s.sku}</Tag>}
                  <Typography.Text type="secondary" style={{ fontSize: 11 }}>
                    Suggested {ago(s.created_at)}
                  </Typography.Text>
                </div>
              </div>
            ),
          },
          {
            title: 'Current Price',
            dataIndex: 'current_price',
            align: 'right',
            width: 120,
            render: (v) => (
              <div style={{ textAlign: 'right' }}>
                <span className="num" style={{ color: '#64748B', textDecoration: 'line-through', fontSize: 13 }}>
                  Rs {formatMoney(v)}
                </span>
              </div>
            ),
          },
          {
            title: 'Suggested Price',
            align: 'right',
            width: 160,
            render: (_, s) => {
              const diffCents = toCents(s.current_price) - toCents(s.suggested_price)
              const diffRs = formatMoney(diffCents)
              const pct = ((diffCents / toCents(s.current_price)) * 100).toFixed(1)
              return (
                <div style={{ textAlign: 'right' }}>
                  <div className="num" style={{ fontWeight: 700, fontSize: 15, color: '#059669' }}>
                    Rs {formatMoney(s.suggested_price)}
                  </div>
                  <Tag
                    color="success"
                    style={{ margin: '4px 0 0 0', fontSize: 11, borderRadius: 9999 }}
                  >
                    <ArrowDownOutlined style={{ marginRight: 2 }} />
                    Rs {diffRs} ({pct}%)
                  </Tag>
                </div>
              )
            },
          },
          {
            title: 'Competitor / Reason',
            width: 240,
            render: (_, s) => (
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <ShopOutlined style={{ color: '#64748B' }} />
                  <span style={{ fontWeight: 500, color: '#334155' }}>
                    {s.cheapest_competitor}
                  </span>
                  <strong className="num" style={{ color: '#0F172A' }}>
                    Rs {formatMoney(s.cheapest_price)}
                  </strong>
                </div>
                <div style={{ marginTop: 4 }}>
                  {s.reason === 'floor' ? (
                    <Tooltip title={`Cost Rs ${formatMoney(s.cost_price)} + 5% min margin = Rs ${formatMoney(s.floor_price)}. Stopped at safe floor.`}>
                      <Tag color="warning" icon={<InfoCircleOutlined />} style={{ cursor: 'pointer' }}>
                        At Floor (Protected)
                      </Tag>
                    </Tooltip>
                  ) : (
                    <Tag color="cyan">Match Cheapest</Tag>
                  )}
                </div>
              </div>
            ),
          },
          ...(status === 'pending'
            ? []
            : [
                {
                  title: 'Result',
                  width: 180,
                  render: (_: unknown, s: Suggestion) => (
                    <Space direction="vertical" size={2}>
                      <Tag color={STATUS_COLOR[s.status]}>{statusLabel(s.status)}</Tag>
                      {s.apply_error && (
                        <Typography.Text type="danger" style={{ fontSize: 12 }}>
                          {s.apply_error}
                        </Typography.Text>
                      )}
                    </Space>
                  ),
                },
              ]),
          ...(status === 'pending' && decide
            ? [
                {
                  title: 'Action',
                  width: 180,
                  align: 'right' as const,
                  render: (_: unknown, s: Suggestion) => {
                    const isActing = act.isPending && act.variables?.id === s.suggestion_id
                    return (
                      <Space size={8}>
                        <Popconfirm
                          title={`Update price to Rs ${formatMoney(s.suggested_price)}?`}
                          description={`This immediately updates ${s.branch} on Sribees Online.`}
                          okText="Apply Price"
                          okButtonProps={{ style: { background: '#059669' } }}
                          cancelText="Cancel"
                          onConfirm={() => act.mutate({ id: s.suggestion_id, verb: 'accept' })}
                        >
                          <Button
                            type="primary"
                            size="small"
                            loading={isActing && act.variables?.verb === 'accept'}
                            style={{ background: '#059669', borderColor: '#059669' }}
                            icon={<CheckOutlined />}
                          >
                            Accept
                          </Button>
                        </Popconfirm>
                        <Button
                          size="small"
                          danger
                          loading={isActing && act.variables?.verb === 'reject'}
                          icon={<CloseOutlined />}
                          onClick={() => act.mutate({ id: s.suggestion_id, verb: 'reject' })}
                        >
                          Reject
                        </Button>
                      </Space>
                    )
                  },
                },
              ]
            : []),
        ]}
      />
    </>
  )
}
