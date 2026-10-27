import { InfoCircleOutlined } from '@ant-design/icons'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { App, Button, Drawer, Space, Switch, Table, Tag, Tooltip } from 'antd'
import { useState } from 'react'
import { api, errorMessage } from '../api/client'
import { STATUS_COLOR, statusLabel, useCompetitors } from '../api/lookups'
import { ago, formatTime } from '../api/time'
import type { Competitor, Run } from '../api/types'
import { useAuth } from '../auth/AuthContext'
import PageHeader from '../components/PageHeader'

export default function Sources() {
  const { can } = useAuth()
  const { message } = App.useApp()
  const queryClient = useQueryClient()
  const competitors = useCompetitors()
  const [runsOf, setRunsOf] = useState<Competitor | null>(null)

  const toggle = useMutation({
    mutationFn: ({ id, on }: { id: number; on: boolean }) => api.patch(`/competitors/${id}`, { is_enabled: on }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['competitors'] }),
    onError: (e) => message.error(errorMessage(e)),
  })
  const runNow = useMutation({
    mutationFn: () => api.post('/jobs/daily'),
    onSuccess: () => message.success('Started. Sources read politely, so this takes a few minutes.'),
    onError: (e) => message.error(errorMessage(e)),
  })

  return (
    <>
      <PageHeader title="Sources" subtitle="Shops we compare against and how the last reading went"
        extra={can('scrape.run') && <Button loading={runNow.isPending} onClick={() => runNow.mutate()}>Run now</Button>} />
      <Table<Competitor>
        rowKey="competitor_id"
        loading={competitors.isLoading}
        dataSource={competitors.data}
        pagination={false}
        scroll={{ x: 800 }}
        columns={[
          { title: 'Shop', render: (_, c) => (
              <Space size={6}>
                <span>{c.name}</span>
                {c.notes && <Tooltip title={c.notes}><InfoCircleOutlined style={{ color: '#8c8c8c' }} /></Tooltip>}
              </Space>
            ) },
          { title: 'How', dataIndex: 'kind', width: 110, render: (v) => v === 'manual' ? 'By hand' : 'Automatic' },
          { title: 'Status', dataIndex: 'status', width: 110,
            render: (v, c) => c.kind === 'manual' ? '—' : <Tag color={STATUS_COLOR[v]}>{statusLabel(v)}</Tag> },
          { title: 'Last good reading', dataIndex: 'last_ok_at', width: 170,
            render: (v, c) => c.kind === 'manual' ? '—' : <Tooltip title={formatTime(v)}>{ago(v)}</Tooltip> },
          { title: 'On', dataIndex: 'is_enabled', width: 80, render: (v, c) => (
              <Switch size="small" checked={v} disabled={!can('competitors.write') || c.status === 'pending'}
                loading={toggle.isPending && toggle.variables?.id === c.competitor_id}
                onChange={(on) => toggle.mutate({ id: c.competitor_id, on })} />
            ) },
          { width: 90, render: (_, c) => c.kind === 'scraped' && (
              <Button size="small" type="link" onClick={() => setRunsOf(c)}>Runs</Button>
            ) },
        ]}
      />
      {runsOf && <Runs competitor={runsOf} onClose={() => setRunsOf(null)} />}
    </>
  )
}

function Runs({ competitor, onClose }: { competitor: Competitor; onClose: () => void }) {
  const runs = useQuery({
    queryKey: ['runs', competitor.competitor_id],
    queryFn: async () => (await api.get<Run[]>(`/competitors/${competitor.competitor_id}/runs`)).data,
  })
  return (
    <Drawer open width={720} title={`${competitor.name}: recent runs`} onClose={onClose}>
      <Table<Run>
        rowKey="run_id"
        size="small"
        loading={runs.isLoading}
        dataSource={runs.data}
        pagination={false}
        expandable={{ rowExpandable: (r) => !!r.error, expandedRowRender: (r) => <pre className="json">{r.error}</pre> }}
        columns={[
          { title: 'Started', dataIndex: 'started_at', render: (v) => formatTime(v) },
          { title: 'Status', dataIndex: 'status', render: (v) => <Tag color={STATUS_COLOR[v]}>{statusLabel(v)}</Tag> },
          { title: 'Items', dataIndex: 'items_seen', align: 'right' },
          { title: 'Requests', dataIndex: 'requests', align: 'right' },
        ]}
      />
    </Drawer>
  )
}
