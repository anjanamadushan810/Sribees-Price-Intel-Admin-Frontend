import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Button, Table, Tag } from 'antd'
import { formatTime } from '../api/time'
import { api } from '../api/client'
import type { Session } from '../api/types'
import PageHeader from '../components/PageHeader'

export default function Sessions() {
  const queryClient = useQueryClient()
  const sessions = useQuery({ queryKey: ['sessions'], queryFn: async () => (await api.get<Session[]>('/auth/sessions')).data })
  const revoke = useMutation({
    mutationFn: (id: string) => api.delete(`/auth/sessions/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['sessions'] }),
  })
  return (
    <>
      <PageHeader title="My sessions" subtitle="Devices signed in to your account. Sign out any you do not recognise." />
      <Table
        rowKey="session_id"
        loading={sessions.isLoading}
        dataSource={sessions.data}
        pagination={false}
        columns={[
          { title: 'Device', dataIndex: 'user_agent', ellipsis: true,
            render: (v, s) => <>{v ?? 'Unknown'}{s.current && <Tag color="green" style={{ marginLeft: 8 }}>This device</Tag>}</> },
          { title: 'IP', dataIndex: 'ip_address', width: 140 },
          { title: 'Signed in', dataIndex: 'created_at', width: 160, render: (v) => formatTime(v) },
          { title: 'Last active', dataIndex: 'last_used_at', width: 160, render: (v) => formatTime(v) },
          { width: 110, render: (_, s) => !s.current && (
              <Button size="small" danger loading={revoke.isPending && revoke.variables === s.session_id}
                onClick={() => revoke.mutate(s.session_id)}>Sign out</Button>
            ) },
        ]}
      />
    </>
  )
}
