import { PlusOutlined, SafetyOutlined } from '@ant-design/icons'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Alert, App, Button, Checkbox, Form, Input, Modal, Select, Switch, Table, Tag } from 'antd'
import { useState } from 'react'
import { api, errorMessage } from '../api/client'
import { ROLE_LABEL, useBranches } from '../api/lookups'
import { formatTime } from '../api/time'
import type { User } from '../api/types'
import { useAuth } from '../auth/AuthContext'
import PageHeader from '../components/PageHeader'

const ALL_BRANCH_ROLES = ['super_admin', 'marketing_manager']

export default function Users() {
  const { me, can } = useAuth()
  const users = useQuery({ queryKey: ['users'], queryFn: async () => (await api.get<User[]>('/users')).data })
  const [editing, setEditing] = useState<User | 'new' | null>(null)
  const writable = can('users.write')

  return (
    <>
      <PageHeader
        title="Users"
        subtitle="Super admins and branch managers must set up two-step sign-in"
        extra={writable && <Button type="primary" icon={<PlusOutlined />} onClick={() => setEditing('new')}>New user</Button>}
      />
      <Table
        rowKey="user_id"
        size="middle"
        loading={users.isLoading}
        dataSource={users.data}
        pagination={false}
        onRow={(u) => ({ onClick: () => writable && setEditing(u), style: { cursor: writable ? 'pointer' : undefined } })}
        columns={[
          { title: 'Name', dataIndex: 'full_name', render: (v, u) => <>{v}{!u.is_active && <Tag style={{ marginLeft: 8 }}>Disabled</Tag>}</> },
          { title: 'Email', dataIndex: 'email' },
          { title: 'Role', dataIndex: 'role', render: (v) => ROLE_LABEL[v] },
          { title: 'Branches', render: (_, u) =>
              ALL_BRANCH_ROLES.includes(u.role) || u.all_branches ? <Tag>All</Tag> : u.branches.map((b) => <Tag key={b.branch_id}>{b.name}</Tag>) },
          ...(me?.two_factor === false ? [] : [{ title: '2FA', dataIndex: 'totp_enabled', width: 80,
            render: (v: boolean) => v ? <Tag color="green" icon={<SafetyOutlined />}>On</Tag> : <Tag>Off</Tag> }]),
          { title: 'Last sign-in', dataIndex: 'last_login_at', width: 160,
            render: (v) => formatTime(v) },
        ]}
      />
      {editing && <UserModal user={editing === 'new' ? null : editing} onClose={() => setEditing(null)} />}
    </>
  )
}

function UserModal({ user, onClose }: { user: User | null; onClose: () => void }) {
  const { message } = App.useApp()
  const twoFactor = useAuth().me?.two_factor !== false
  const queryClient = useQueryClient()
  const branches = useBranches()
  const [form] = Form.useForm()
  const role = Form.useWatch('role', form) as string | undefined
  const allBranches = Form.useWatch('all_branches', form) as boolean | undefined

  const save = useMutation({
    mutationFn: async (v: Record<string, unknown>) => {
      const isAll = !!v.all_branches
      const body: Record<string, unknown> = {
        full_name: v.full_name,
        role: v.role,
        branch_ids: isAll ? [] : ((v.branch_ids as string[]) ?? []),
        all_branches: isAll,
      }
      if (v.password) body.password = v.password
      if (user) {
        body.is_active = v.is_active
        body.reset_totp = !!v.reset_totp
        return api.patch(`/users/${user.user_id}`, body)
      }
      return api.post('/users', { ...body, email: v.email })
    },
    onSuccess: () => {
      message.success('Saved')
      queryClient.invalidateQueries({ queryKey: ['users'] })
      onClose()
    },
  })

  return (
    <Modal open title={user ? user.full_name : 'New user'} onCancel={onClose} okText="Save"
      okButtonProps={{ loading: save.isPending }} onOk={() => form.submit()} width={560}>
      <Form form={form} layout="vertical" requiredMark={false} onFinish={save.mutate}
        initialValues={user ? { ...user, branch_ids: user.all_branches ? [] : user.branches.map((b) => b.branch_id), all_branches: user.all_branches } : { role: 'branch_manager', branch_ids: [], all_branches: false }}>
        {!user && (
          <Form.Item name="email" label="Email" rules={[{ required: true, type: 'email' }]}>
            <Input autoComplete="off" />
          </Form.Item>
        )}
        <Form.Item name="full_name" label="Full name" rules={[{ required: true, min: 2 }]}>
          <Input />
        </Form.Item>
        <Form.Item name="role" label="Role" rules={[{ required: true }]}>
          <Select options={Object.entries(ROLE_LABEL).map(([value, label]) => ({ value, label }))} />
        </Form.Item>
        {role && !ALL_BRANCH_ROLES.includes(role) && (
          <>
            <Form.Item
              name="branch_ids"
              label="Branches"
              rules={[
                {
                  validator: async (_, value) => {
                    if (role === 'branch_manager' && !allBranches && (!value || value.length === 0)) {
                      return Promise.reject(new Error('Select at least one branch for a Branch Manager, or choose "All branches"'))
                    }
                    return Promise.resolve()
                  },
                },
              ]}
            >
              <Select
                mode="multiple"
                disabled={!!allBranches}
                placeholder={allBranches ? 'User has access to all branches' : 'Branches this person works for'}
                options={(branches.data ?? []).map((b) => ({ value: b.branch_id, label: b.name }))}
              />
            </Form.Item>
            <Form.Item name="all_branches" valuePropName="checked">
              <Checkbox
                onChange={(e) => {
                  if (e.target.checked) {
                    form.setFieldValue('branch_ids', [])
                  }
                  setTimeout(() => form.validateFields(['branch_ids']), 0)
                }}
              >
                All branches
              </Checkbox>
            </Form.Item>
          </>
        )}
        <Form.Item name="password" label={user ? 'New password (leave empty to keep)' : 'Temporary password'}
          rules={[{ required: !user, min: 12, message: 'At least 12 characters' }]}>
          <Input.Password autoComplete="new-password" />
        </Form.Item>
        {user && (
          <>
            <Form.Item name="is_active" label="Active" valuePropName="checked"><Switch /></Form.Item>
            {twoFactor && (
              <Form.Item name="reset_totp" valuePropName="checked">
                <Checkbox disabled={!user.totp_enabled}>Reset two-step sign-in (lost phone)</Checkbox>
              </Form.Item>
            )}
          </>
        )}
        <Alert type="info" showIcon message={`Changing the password, role${twoFactor ? ' or 2FA' : ''} signs this person out everywhere.`} />
        {save.error && <Alert style={{ marginTop: 12 }} type="error" showIcon message={errorMessage(save.error)} />}
      </Form>
    </Modal>
  )
}
