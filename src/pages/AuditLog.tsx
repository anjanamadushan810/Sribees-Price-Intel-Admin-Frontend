import { useInfiniteQuery, useQuery } from '@tanstack/react-query'
import { Button, Select, Space, Table, Tag, Typography } from 'antd'
import { formatTime } from '../api/time'
import { useState } from 'react'
import { api } from '../api/client'
import type { AuditEntry, User } from '../api/types'
import PageHeader from '../components/PageHeader'

const ENTITIES = ['branch_product', 'suggestion', 'match', 'product', 'competitor', 'setting', 'user']

export default function AuditLog() {
  const [entity, setEntity] = useState<string | undefined>()
  const users = useQuery({ queryKey: ['users'], queryFn: async () => (await api.get<User[]>('/users')).data })
  const name = (id: string | null) => (id ? users.data?.find((u) => u.user_id === id)?.full_name ?? id.slice(0, 8) : 'system')

  const log = useInfiniteQuery({
    queryKey: ['audit', entity],
    initialPageParam: undefined as number | undefined,
    queryFn: async ({ pageParam }) =>
      (await api.get<AuditEntry[]>('/audit', { params: { entity, before_id: pageParam, limit: 100 } })).data,
    getNextPageParam: (last) => (last.length === 100 ? last[last.length - 1].audit_id : undefined),
  })
  const rows = log.data?.pages.flat() ?? []

  return (
    <>
      <PageHeader title="Audit log" subtitle="Every sign-in, price change, match and setting. Nothing here can be edited or deleted." />
      <Space style={{ marginBottom: 16 }}>
        <Select allowClear placeholder="All records" style={{ width: 200 }} value={entity} onChange={setEntity}
          options={ENTITIES.map((e) => ({ value: e, label: e }))} />
      </Space>
      <Table
        rowKey="audit_id"
        size="small"
        loading={log.isLoading}
        dataSource={rows}
        pagination={false}
        scroll={{ x: 900 }}
        expandable={{
          rowExpandable: (r) => !!(r.before || r.after),
          expandedRowRender: (r) => (
            <Space align="start" size="large" wrap>
              {r.before && <div><Typography.Text type="secondary">Before</Typography.Text><pre className="json">{JSON.stringify(r.before, null, 2)}</pre></div>}
              {r.after && <div><Typography.Text type="secondary">After</Typography.Text><pre className="json">{JSON.stringify(r.after, null, 2)}</pre></div>}
            </Space>
          ),
        }}
        columns={[
          { title: 'When', dataIndex: 'occurred_at', width: 170, render: (v) => formatTime(v, 'YYYY-MM-DD HH:mm:ss') },
          { title: 'Who', dataIndex: 'user_id', width: 180, render: name },
          { title: 'Action', dataIndex: 'action', width: 200,
            render: (v: string) => <Tag color={v.endsWith('_failed') ? 'red' : undefined}>{v}</Tag> },
          { title: 'Record', render: (_, r) => <span className="muted">{r.entity} {r.entity_id?.slice(0, 8)}</span> },
          { title: 'IP', dataIndex: 'ip_address', width: 140 },
        ]}
      />
      {log.hasNextPage && (
        <Button style={{ marginTop: 12 }} loading={log.isFetchingNextPage} onClick={() => log.fetchNextPage()}>
          Load older
        </Button>
      )}
    </>
  )
}
